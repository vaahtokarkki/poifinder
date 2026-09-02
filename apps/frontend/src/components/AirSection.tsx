import React from "react";
import { Dialog, DialogContent, DialogTitle, Button } from "@mui/material";
import { ui } from "../copy";
import { CATEGORIES } from "../constants";
import { useAirReading } from "../hooks/useAirQuality";
import { analytics } from "../analytics";
import { BAND_COLOUR } from "../map/airTiles";
import type { AirBand } from "../map/airTiles";

/**
 * The categories an air quality reading is worth knowing for.
 *
 * The rule is the one the noise section uses — whether a reader is going to
 * *stay* there — narrowed by a second one: whether they will be breathing
 * hard while they do. Air quality decides whether an outdoor gym is somewhere
 * to train this afternoon and whether a playground is somewhere to leave a
 * child for two hours, because exertion is what turns a number in µg/m³ into a
 * dose. It decides much less about a bench.
 *
 * It decides nothing at all about a toilet, a post box or an ATM. Nobody has
 * ever chosen a different post box over particulates, and a fact with no
 * decision attached to it is a row that makes every other row harder to find.
 */
export const AIR_WORTH_KNOWING: ReadonlySet<CATEGORIES> = new Set([
  CATEGORIES.Playgrounds,
  CATEGORIES.OutdoorGym,
  CATEGORIES.DogPark,
  CATEGORIES.Beach,
  CATEGORIES.Picnic,
  CATEGORIES.Viewpoint,
  CATEGORIES.TentSite,
]);

/**
 * The nearest air quality measurement, at the foot of a popup.
 *
 * A measurement, and this is the one thing about this section worth
 * protecting. The map above it draws an interpolated field — a colour for
 * every place within 75 km of a monitor, including thousands of places with no
 * monitor in them — and it would have been easy to have the popup read that
 * field and print the band under the marker. It would also have been a guess
 * wearing the clothes of an observation.
 *
 * So the row quotes a station instead: what it measured, how far away it is,
 * and how long ago. The distance is not a footnote. A reading from 3 km away
 * in the same city and a reading from 60 km away across a mountain range are
 * different kinds of fact, and the only way a reader can tell them apart is if
 * the popup says which one this is.
 *
 * Absent entirely until there is an answer. No tile server configured, the
 * snapshot not fetched yet, or no monitor within 75 km all produce the same
 * nothing, because for a reader they mean the same thing: this popup has no
 * air quality to tell you about.
 */
const AirSection: React.FC<{
  position: [number, number] | null;
  category: CATEGORIES | null;
}> = ({ position, category }) => {
  const relevant = category !== null && AIR_WORTH_KNOWING.has(category);

  // Hooks cannot be skipped, so the lookup is told not to bother instead. A
  // popup for a post box therefore costs no fetch and no scan
  const reading = useAirReading(relevant ? position : null);
  const [explaining, setExplaining] = React.useState(false);

  if (!relevant || reading === null) return null;

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
   * Rounded to the kilometre, and never to nothing. A station 400 m away shows
   * as "1 km" rather than "0 km", which would read as "here" — the one thing
   * this row must not claim.
   */
  const distance = Math.max(1, Math.round(reading.distanceKm));

  return (
    <div className="poi-popup-air">
      {/* One line, as the noise row above it: "Air quality: Good" */}
      <p className="poi-popup-air-value">
        {/* The dot carries the colour and the word carries the meaning, never
            the colour alone — six bands have to survive being read by
            somebody who cannot tell the amber from the red */}
        <span
          className="poi-popup-air-dot"
          style={{ background: BAND_COLOUR[reading.band] }}
        />
        <span className="poi-popup-air-label">{words.label}:</span>
        {level[reading.band]}
        {/* The number beside the word rather than instead of it. The word is
            what a reader acts on; the number is what lets somebody who knows
            the scale check it */}
        <span className="poi-popup-air-number">
          {reading.station.value} {words.unit}
        </span>
      </p>
      <p className="poi-popup-air-caption">
        {words.measuredAt.replace("{distance}", String(distance))}
      </p>
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
 * `aboutLimit` is the paragraph that has to survive any edit. A reader who has
 * seen the coloured wash on the map will assume the popup's number describes
 * the place they are looking at, and it describes a monitor some distance
 * away — which on a still day in a valley can be a genuinely different
 * atmosphere.
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
