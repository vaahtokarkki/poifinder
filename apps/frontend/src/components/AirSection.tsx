import React from "react";
import { Dialog, DialogContent, DialogTitle, Button } from "@mui/material";
import { getLocale, interpolate, resolve, ui } from "../copy";
import { CATEGORIES } from "../constants";
import { useAirBand, useAirReading } from "../hooks/useAirQuality";
import { analytics } from "../analytics";
import { AIR_SOURCE_LINKS, BAND_COLOUR, bandRange } from "../map/airTiles";
import type { AirBand } from "../map/airTiles";

/**
 * The air quality where a point stands, at the foot of its popup.
 *
 * The coloured word is the band the map paints here, read out of the same
 * rendered tile the wash is drawn from. That is the one thing about this
 * section worth protecting, and it is a correction rather than a design: the
 * row used to quote the nearest reference monitor and print *its* band, while
 * the wash under the popup was interpolated from every sensor in the region.
 * Those two disagree exactly where it matters — a city whose citizen sensors
 * are reading high and whose one calibrated monitor sits in a park on the
 * outskirts — and a popup saying "Fair" over an orange map is worse than
 * either answer alone, because the reader cannot tell which of the two to
 * believe.
 *
 * So the word and the dot come from the tile, and the number beside them is
 * the band's own range rather than any station's reading. A single station's
 * number under a regional band was the other half of the same contradiction:
 * "Poor" beside "12.6 µg/m³" reads as an arithmetic error.
 *
 * The caption is where a measurement still belongs. It names the nearest
 * sensor, what it read, how far off it stands and how long ago — the support
 * for the band above it, and the thing that tells a reader how much the colour
 * is worth. A sensor 2 km away in the same suburb and one 60 km away across a
 * mountain range are different kinds of evidence for the same word.
 *
 * Absent entirely unless the tiles paint something here. No tile server
 * configured, tiles not loaded yet, or a place outside everything the builder
 * published all produce the same nothing, because for a reader they mean the
 * same thing: this popup has no air quality to tell you about. That last case
 * is a real place rather than a corner — the field is clipped to the published
 * cities and their ten kilometre margin, so a village half an hour out of town
 * has no wash and now correctly has no row.
 *
 * Shown for every category, unlike the noise row above it, and the asymmetry
 * is deliberate rather than an oversight. Noise is a property of the spot: it
 * decides whether a bench is somewhere to sit and says nothing about a post
 * box, so it is drawn only where it changes a decision. Air is a property of
 * the hour and of the city, the same everywhere in this popup's neighbourhood,
 * and the question it answers — "is it a good day to be outside at all" — is
 * one somebody may be asking whatever they happened to tap.
 */
const AirSection: React.FC<{
  position: [number, number] | null;
  category: CATEGORIES | null;
}> = ({ position, category }) => {
  /**
   * Two questions, answered separately and settling separately.
   *
   * The band decides whether the row exists at all: it is what the map paints
   * here, so no band means no wash, which means there is nothing to caption.
   * The nearest sensor only fills in the caption, arrives over a different
   * route — one JSON fetch rather than a vector tile — and its absence costs a
   * clause rather than the row.
   */
  const band = useAirBand(position);
  const reading = useAirReading(position);
  const [explaining, setExplaining] = React.useState(false);

  if (band === null) return null;

  const words = ui().poi.air;
  const level: Record<AirBand, string> = {
    1: words.good,
    2: words.fair,
    3: words.moderate,
    4: words.poor,
    5: words.veryPoor,
    6: words.extremelyPoor,
  };

  /**
   * The sentence under the word, which is the whole of the provenance.
   *
   * Three shapes, and which one is used is decided by what is actually known
   * rather than by what would read best. With a calibrated instrument nearby
   * it says so, because "monitoring station" is a stronger claim than "sensor"
   * and it is one we can occasionally make. With only a citizen sensor it says
   * sensor, which is the honest word for a corrected SDS011. With neither —
   * the snapshot has not landed, or the nearest is past the 75 km the builder
   * models at — it says only that the figure is an estimate for the area,
   * which is the part that is true regardless.
   */
  const locale = getLocale();
  const caption = (() => {
    if (!reading) return words.estimated;

    /**
     * Rounded to the kilometre, and never to nothing. A sensor 400 m away
     * shows as "1 km" rather than "0 km", which would read as "here" — the one
     * thing this caption must not claim.
     */
    const distance = Math.max(1, Math.round(reading.distanceKm));

    /**
     * How long ago it was measured, in the coarsest unit that still says
     * something.
     *
     * Minutes below an hour and a half, hours above it. The break is at 90
     * rather than 60 so that nothing is ever shown as "1 h ago" when it could
     * honestly be "75 min ago" — rounding to the hour that early throws away
     * most of what the reader wanted from this line.
     *
     * Never zero, for the same reason the distance is never zero: "0 min ago"
     * claims a reading taken as you looked at it.
     */
    const minutes = Math.max(1, reading.ageMinutes);
    const hours = Math.round(minutes / 60);
    const age =
      minutes < 90
        ? resolve(words.ageMinutes, locale, { count: minutes }, minutes)
        : resolve(words.ageHours, locale, { count: hours }, hours);

    /**
     * One decimal, which is as fine as any of these instruments resolve and
     * finer than the snapshot is usually written. Printed rather than rounded
     * to the whole number because the band edges are at 10, 20 and 25: at
     * those, the digit after the point is the difference between the reading
     * agreeing with the colour above it and appearing to contradict it.
     */
    const value = Math.round(reading.station.value * 10) / 10;

    return interpolate(
      reading.station.reference ? words.nearestStation : words.nearestSensor,
      { distance, age, value }
    );
  })();

  return (
    <div className="poi-popup-air">
      {/* One line, as the noise row above it: "Air quality: Good" */}
      <p className="poi-popup-air-value">
        {/* The dot carries the colour and the word carries the meaning, never
            the colour alone — six bands have to survive being read by
            somebody who cannot tell the amber from the red */}
        <span
          className="poi-popup-air-dot"
          style={{ background: BAND_COLOUR[band] }}
        />
        <span className="poi-popup-air-label">{words.label}:</span>
        {level[band]}
        {/* The band's range beside the word rather than a station's reading.
            The word is what a reader acts on; the range is what lets somebody
            who knows the scale place it — and unlike a single measurement it
            cannot contradict the word it sits next to */}
        <span className="poi-popup-air-number">
          {bandRange(band)} {words.unit}
        </span>
      </p>
      <p className="poi-popup-air-caption">{caption}</p>
      <button
        type="button"
        className="poi-popup-air-about"
        onClick={() => {
          analytics.airExplanationOpened(category);
          setExplaining(true);
        }}
      >
        {words.about}
      </button>

      <AirExplanation open={explaining} onClose={() => setExplaining(false)} />
    </div>
  );
};

/**
 * What the six words mean, and what the number is not.
 *
 * A dialog rather than more lines in the popup, for the reasons the noise
 * explanation gives: a Leaflet popup is a small box over a map and anything
 * long in it pushes the point being described off the screen, and this is read
 * once by somebody who wondered rather than every time a marker is opened.
 *
 * `aboutLimit` is the paragraph that has to survive any edit. The band above
 * it is an interpolation between sensors tens of kilometres apart, and a
 * reader will take a coloured word in a popup about a bench as a statement
 * about that bench — which on a still day in a valley, or beside a road, or
 * downwind of somebody's wood stove, it is not.
 */
const AirExplanation: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const words = ui().poi.air;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="air-explanation-title"
      maxWidth="xs"
      fullWidth
      // Over the bottom sheet at 2100 and the map notices at 2200, the same
      // place the noise explanation sits. See NoiseSection for why this is
      // here rather than in the theme
      sx={{ zIndex: 2300 }}
    >
      <DialogTitle id="air-explanation-title" sx={{ fontSize: "1.05rem", fontWeight: 600 }}>
        {words.aboutTitle}
      </DialogTitle>
      <DialogContent className="air-explanation">
        <p>{words.aboutIntro}</p>

        <p className="air-explanation-heading">{words.aboutBandsHeading}</p>
        <ul className="air-explanation-bands">
          {(
            [
              [1, words.aboutGood],
              [2, words.aboutFair],
              [3, words.aboutModerate],
              [4, words.aboutPoor],
              [5, words.aboutVeryPoor],
              [6, words.aboutExtremelyPoor],
            ] as [AirBand, string][]
          ).map(([band, text]) => (
            <li key={band}>
              <span
                className="poi-popup-air-dot"
                style={{ background: BAND_COLOUR[band] }}
              />
              {text}
            </li>
          ))}
        </ul>

        <p>{words.aboutLimit}</p>
        <p className="air-explanation-source">{words.aboutSource}</p>
        {/* The credit, and the licence each source is used under. Here as well
            as on the map because the map only credits a layer while it is
            drawn, and this row exists for readers who never switch it on */}
        <ul className="air-explanation-credits">
          {AIR_SOURCE_LINKS.map(source => (
            <li key={source.label}>
              <a href={source.href} target="_blank" rel="noreferrer noopener">
                {source.label}
              </a>
              <span> — {source.licence}</span>
            </li>
          ))}
        </ul>

        <div className="air-explanation-actions">
          <Button onClick={onClose} size="small">
            {words.aboutClose}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AirSection;
