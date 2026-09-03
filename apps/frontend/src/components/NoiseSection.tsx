import React from "react";
import { Dialog, DialogContent, DialogTitle, Button } from "@mui/material";
import { ui } from "../copy";
import { CATEGORIES } from "../constants";
import { useNoiseBand } from "../hooks/useNoiseBand";
import { useOsmElement } from "../hooks/useOsmElement";
import { shapeSamplePoints } from "../geo";
import type { OsmRef } from "../api/overpass";
import { analytics } from "../analytics";
import { BAND_COLOUR, NOISE_SOURCE_LINKS } from "../map/noiseTiles";
import type { NoiseBand } from "../map/noiseTiles";

/**
 * The categories a noise level is worth knowing for.
 *
 * The rule is whether a reader is going to *stay* there. Noise decides whether
 * a bench is somewhere to sit, whether a picnic table is somewhere to eat,
 * whether a viewpoint is worth standing at — the whole value of those places
 * is the time you spend in them, and traffic ruins it.
 *
 * It decides nothing about a toilet, a post box, an ATM or a recycling
 * container. Nobody has ever chosen a different post box because the first was
 * loud. Showing it there would be a fact with no decision attached to it,
 * which on a popup that is already several rows long is just noise of another
 * kind.
 */
export const NOISE_WORTH_KNOWING: ReadonlySet<CATEGORIES> = new Set([
  CATEGORIES.Bench,
  CATEGORIES.Picnic,
  CATEGORIES.Playgrounds,
  CATEGORIES.DogPark,
  CATEGORIES.Beach,
  CATEGORIES.OutdoorGym,
  CATEGORIES.Fireplace,
  CATEGORIES.Shelter,
  CATEGORIES.Viewpoint,
]);

/**
 * The modelled traffic noise where a point stands, at the foot of its popup.
 *
 * Last, and in a section of its own, because it is the only thing in a popup
 * that nobody surveyed. Everything above it is a tag somebody wrote standing
 * in front of the place; this is a number a model made up from the roads
 * nearby, and set among the other rows it would borrow their authority. The
 * rule above it is the same one the building section uses, and says the same
 * thing: what follows is true of something other than the point.
 *
 * Absent entirely until the tiles answer. No tile server configured, tiles not
 * loaded yet, or a place outside every area the builder covered all produce
 * the same nothing, because for a reader they mean the same thing: this popup
 * has no noise to tell you about. A placeholder saying so would be a row about
 * our infrastructure in a popup about a bench.
 *
 * And absent for most categories however well the tiles answer — see
 * NOISE_WORTH_KNOWING.
 */
const NoiseSection: React.FC<{
  position: [number, number] | null;
  category: CATEGORIES | null;
  /** The way or relation this point was drawn as, when it was drawn as one */
  shapeRef?: OsmRef | null;
}> = ({ position, category, shapeRef = null }) => {
  const relevant = category !== null && NOISE_WORTH_KNOWING.has(category);

  /**
   * For a shape, the band across the whole of it rather than under its marker.
   *
   * The marker is the middle of the bounding box, which for a crescent bay or
   * an L-shaped park is not inside the park at all — so the band read there
   * can be the band of the road the shape bends around. Fixing that by reading
   * the centroid instead only moves the problem: a playground with a main road
   * down one side is mostly loud with one quiet corner, and a single reading in
   * the middle picks whichever of those two the middle happens to be.
   *
   * So a grid of points across the shape, and the band that covers most of
   * them. See shapeSamplePoints and noiseBandOverArea.
   *
   * This costs no request. The popup already asks for the outline of a drawn
   * point in order to draw it, and useOsmElement dedupes by ref, so the two
   * callers share the one answer. Until it arrives the marker position is
   * used, which is what this did before; the row then settles onto the band of
   * the area a moment later.
   */
  const element = useOsmElement(relevant ? shapeRef : null);
  const samples = shapeSamplePoints(element?.shape ?? null);
  const sampleAt = samples.length > 0 ? samples : position ? [position] : null;

  // Hooks cannot be skipped, so the lookup is told not to bother instead. A
  // popup for a post box therefore costs no query and no listener
  const band = useNoiseBand(relevant ? sampleAt : null);
  const [explaining, setExplaining] = React.useState(false);

  if (!relevant || band === null) return null;

  const words = ui().poi.noise;
  const level: Record<NoiseBand, string> = {
    1: words.quiet,
    2: words.moderate,
    3: words.noisy,
  };

  return (
    <div className="poi-popup-noise">
      {/* One line: "Traffic noise: Moderate". The name of the measure and its
          answer are one statement, and splitting them over two lines made a
          three line section out of a two word fact — which in a popup that
          also carries a building, opening hours and a survey date is three
          lines the reader has to step over to reach the next real row. */}
      <p className="poi-popup-noise-value">
        {/* The dot carries the colour and the word carries the meaning, never
            the colour alone — three bands have to survive being read by
            somebody who cannot tell the amber from the red */}
        <span
          className="poi-popup-noise-dot"
          style={{ background: BAND_COLOUR[band] }}
        />
        <span className="poi-popup-noise-label">{words.label}:</span>
        {level[band]}
      </p>
      <p className="poi-popup-noise-caption">{words.modelled}</p>
      <button
        type="button"
        className="poi-popup-noise-about"
        onClick={() => {
          analytics.noiseExplanationOpened(category);
          setExplaining(true);
        }}
      >
        {words.about}
      </button>

      <NoiseExplanation open={explaining} onClose={() => setExplaining(false)} />
    </div>
  );
};

/**
 * What the three words actually mean, and what they do not.
 *
 * A dialog rather than more lines in the popup, for two reasons. A Leaflet
 * popup is a small box over a map and anything long in it pushes the point
 * being described off the screen; and this is read once, by somebody who
 * wondered, rather than every time a marker is opened.
 *
 * MUI renders it through a portal, which is what makes it work at all here:
 * rendered inside the popup it would be clipped by it, and the backdrop is
 * also what stops a click meant for the dialog reaching the map and closing
 * the popup underneath.
 *
 * The limitation paragraph is the point of the whole thing. Three coloured
 * words on a map look like a measurement, and somebody deciding where to sit
 * deserves to know that the estimate reads low where several busy roads meet —
 * which is exactly where they would be relying on it.
 */
const NoiseExplanation: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const words = ui().poi.noise;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="noise-explanation-title"
      maxWidth="xs"
      fullWidth
      /*
       * Over the bottom sheet, which sits at 2100, and over the map notices at
       * 2200. MUI's own default is 1300, which put this dialog underneath the
       * sheet — and the sheet is exactly what is open when somebody is reading
       * a popup on a phone. Raised here rather than in the theme because this
       * is the only dialog in the app; a second one would be the moment to
       * move both into a theme zIndex override
       */
      sx={{ zIndex: 2300 }}
    >
      <DialogTitle id="noise-explanation-title" sx={{ fontSize: "1.05rem", fontWeight: 600 }}>
        {words.aboutTitle}
      </DialogTitle>
      <DialogContent className="noise-explanation">
        <p>{words.aboutIntro}</p>

        <p className="noise-explanation-heading">{words.aboutBandsHeading}</p>
        <ul className="noise-explanation-bands">
          {(
            [
              [1, words.aboutQuiet],
              [2, words.aboutModerate],
              [3, words.aboutNoisy],
            ] as [NoiseBand, string][]
          ).map(([band, text]) => (
            <li key={band}>
              <span
                className="poi-popup-noise-dot"
                style={{ background: BAND_COLOUR[band] }}
              />
              {text}
            </li>
          ))}
        </ul>

        <p>{words.aboutLimit}</p>
        <p className="noise-explanation-source">{words.aboutSource}</p>
        {/* As in the air section: the map credits this layer only while the
            wash is drawn, and the band is read from the tiles either way */}
        <ul className="noise-explanation-credits">
          {NOISE_SOURCE_LINKS.map(source => (
            <li key={source.label}>
              <a href={source.href} target="_blank" rel="noreferrer noopener">
                {source.label}
              </a>
              <span> — {source.licence}</span>
            </li>
          ))}
        </ul>

        <div className="noise-explanation-actions">
          <Button onClick={onClose} size="small">
            {words.aboutClose}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoiseSection;
