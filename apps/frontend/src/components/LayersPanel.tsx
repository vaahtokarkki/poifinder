import React, { useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { ui } from "../copy";
import { BAND_COLOUR, noiseTilesConfigured } from "../map/noiseTiles";
import { BAND_COLOUR as AIR_BAND_COLOUR, airTilesConfigured } from "../map/airTiles";
import { useNoiseCoverage } from "../hooks/useNoiseCoverage";
import { useAirCoverage } from "../hooks/useAirCoverage";

type LayersPanelProps = {
  onClose: () => void;
  noiseVisible: boolean;
  onNoiseChange: (visible: boolean) => void;
  airVisible: boolean;
  onAirChange: (visible: boolean) => void;
};

/**
 * The roads of the thumbnail map, as path data shared by both tiles.
 *
 * Shared because the noise tile has to be the same corner of the same town as
 * the basemap tile: the two pictures sit side by side in the panel, and the
 * only difference a reader should be able to find between them is the thing
 * the second one adds.
 */
const MOTORWAY = "M-4 22 C 14 25, 26 33, 38 40 C 50 47, 62 49, 76 47";
const PRIMARY = "M22 -4 L 31 76";
const MINOR_A = "M76 30 L 58 38 L 53 76";
const MINOR_B = "M31 64 L 76 68";

/** Voyager's own palette, read off public/map/voyager.json rather than guessed */
const LAND = "#f3eee4";
const WATER = "#b0d0d6";
const PARK = "#d2e5c0";
const BUILDING = "#e0d6c4";

/**
 * The buildings of the thumbnail: x, y, width, height, laid out in the gaps
 * the roads leave rather than under them.
 */
const BUILDINGS: [number, number, number, number][] = [
  [3, 6, 8, 6],
  [14, 12, 6, 5],
  [4, 34, 8, 6],
  [14, 30, 6, 5],
  [36, 10, 5, 6],
  [36, 20, 6, 5],
  [24, 50, 6, 5],
  [37, 55, 7, 5],
  [48, 58, 8, 5],
  [64, 56, 6, 5],
  [64, 66, 7, 5],
  [20, 66, 6, 5],
];

/**
 * A small map of nowhere in particular, drawn rather than photographed.
 *
 * Every layer of it is one the real map has — land, water, a park, blocks of
 * buildings, a motorway with two lesser roads over them — in the colours the
 * style document uses, so the tile looks like the map it switches. A
 * screenshot would say the same thing at the cost of a request made to
 * describe a map that is already on the screen behind the panel.
 *
 * With `noise` it is that same map with the wash over it, stacked the way the
 * layer itself stacks: quiet over the whole tile, moderate along the roads,
 * noisy on them — and over the roads rather than under, because that is where
 * the fill sits in the style (under the first symbol layer, see noiseTiles).
 */
const MiniMap: React.FC<{ noise?: boolean; air?: boolean }> = ({
  noise = false,
  air = false,
}) => (
  <svg
    className="layers-tile-swatch"
    viewBox="0 0 72 72"
    // Decorative: the tile's label already names the layer, and a screen
    // reader reading out a drawing of a map would be reading out the noise
    aria-hidden="true"
    focusable="false"
  >
    <rect width="72" height="72" fill={LAND} />
    {/* A river out of the corner, and a park across the top */}
    <path d="M-4 44 C 8 43, 14 52, 15 76" stroke={WATER} strokeWidth="9" fill="none" />
    <path
      d="M44 -6 C 60 -6, 76 2, 76 14 C 76 24, 62 28, 52 23 C 43 19, 39 5, 44 -6 Z"
      fill={PARK}
    />
    <g fill={BUILDING}>
      {BUILDINGS.map(([x, y, width, height]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} rx="1" />
      ))}
    </g>
    {/* Casings first, then the fills over them: the same two passes the style
        draws roads in, which is what gives a junction its unbroken line */}
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={MINOR_A} stroke="#d2c9b8" strokeWidth="4.5" />
      <path d={MINOR_B} stroke="#d2c9b8" strokeWidth="4.5" />
      <path d={PRIMARY} stroke="#ffeabb" strokeWidth="7" />
      <path d={MOTORWAY} stroke="#fbdb98" strokeWidth="10" />
      <path d={MINOR_A} stroke="#ffffff" strokeWidth="2.8" />
      <path d={MINOR_B} stroke="#ffffff" strokeWidth="2.8" />
      <path d={PRIMARY} stroke="#fefdd7" strokeWidth="4.6" />
      <path d={MOTORWAY} stroke="#ffe9a5" strokeWidth="7" />
    </g>
    {air && (
      /*
       * Bands across the whole tile rather than along the roads, which is the
       * one thing this picture has to get across: air quality is a regional
       * field and noise is a property of a street. Drawn as three soft bands
       * sweeping the tile, they say "this is about everywhere at once" before
       * anybody reads the label under it — and a reader who has both overlays
       * switched off can tell the two tiles apart at a glance.
       *
       * Denser than the map draws it, for the reason the noise tile is: at
       * 72px the real opacities are a tile that looks like the plain one
       * beside it.
       */
      <g>
        <rect width="72" height="72" fill={AIR_BAND_COLOUR[1]} opacity="0.3" />
        <path
          d="M-4 40 C 14 30, 30 44, 44 36 C 56 29, 68 34, 76 30 L 76 76 L -4 76 Z"
          fill={AIR_BAND_COLOUR[2]}
          opacity="0.4"
        />
        <path
          d="M-4 62 C 12 54, 28 64, 44 58 C 58 53, 68 58, 76 55 L 76 76 L -4 76 Z"
          fill={AIR_BAND_COLOUR[3]}
          opacity="0.45"
        />
      </g>
    )}
    {noise && (
      /*
       * Denser than the map draws it. On the map the bands are a wash you look
       * through; in a 72px picture the same opacities would be a tile that
       * looks like the one beside it, and a legend nobody can tell apart from
       * the thing it is not is worse than no legend.
       */
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect width="72" height="72" fill={BAND_COLOUR[1]} opacity="0.18" />
        <g opacity="0.32" stroke={BAND_COLOUR[2]}>
          <path d={MOTORWAY} strokeWidth="26" />
          <path d={PRIMARY} strokeWidth="17" />
        </g>
        <g opacity="0.5" stroke={BAND_COLOUR[3]}>
          <path d={MOTORWAY} strokeWidth="11" />
          <path d={PRIMARY} strokeWidth="6" />
        </g>
      </g>
    )}
  </svg>
);

/**
 * A tile in the panel: a small picture of what the layer looks like, its name
 * under it, and a blue ring when it is on. The picture is the point — "traffic
 * noise" means nothing until you have seen the three bands, and a row of
 * checkboxes would have said the words without ever showing them.
 */
type LayerTileProps = {
  label: string;
  selected: boolean;
  children: React.ReactNode;
  /** A word about why this layer may not show anything, under its name */
  note?: string;
  onClick?: () => void;
};

const LayerTile: React.FC<LayerTileProps> = ({
  label,
  selected,
  children,
  note,
  onClick,
}) => {
  const content = (
    <>
      {children}
      <span className="layers-tile-label">{label}</span>
      {/* Inside the tile rather than under the row: it is about this layer, so
          it is bounded by this layer's column and wraps inside it */}
      {note ? <span className="layers-tile-note">{note}</span> : null}
    </>
  );

  // Without an onClick the tile is a statement rather than a choice — the one
  // basemap there is, named. Rendering it as a button that does nothing when
  // pressed would promise an alternative that does not exist yet
  return onClick ? (
    <button
      type="button"
      className={`layers-tile${selected ? " selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {content}
    </button>
  ) : (
    <div className={`layers-tile${selected ? " selected" : ""}`} aria-current={selected}>
      {content}
    </div>
  );
};

/**
 * What is drawn on the map, and what is drawn over it.
 *
 * Two sections, in the order the map itself is stacked: the basemap first,
 * then the overlays on top of it. Today that is one of each, and the shape is
 * deliberately the one that takes a second basemap or a second overlay without
 * being redesigned around it.
 *
 * The first section's heading is the panel's heading, which is the layout
 * every phone map uses for this and the reason the dialog's own name is only
 * on the button and in the accessible label: a second heading over a single
 * row of tiles is a line of chrome that says nothing.
 *
 * Only what is *painted* is decided here. The noise layer sits in the style
 * whatever this says, and a popup can read a band from it while the wash is
 * off — see setNoiseVisible in map/noiseTiles.ts.
 */
const LayersPanel: React.FC<LayersPanelProps> = ({
  onClose,
  noiseVisible,
  onNoiseChange,
  airVisible,
  onAirChange,
}) => {
  const copy = ui().controls.layers;
  /**
   * Whether the tiles reach where the map is looking. "unknown" while the
   * layer is loading or the view is zoomed out past the tiles, and nothing is
   * said then: a notice that appears and then takes itself back is worse than
   * a reader switching a layer on and finding it empty.
   */
  const coverage = useNoiseCoverage();
  /**
   * The same question for the other overlay, and it is a different question
   * under the same words. Noise coverage is "did the builder model this city";
   * air coverage is "is there a monitoring station within 75 km", which is a
   * far larger area and far more often no. Both answer "unknown" while they
   * are still loading, and neither says anything then
   */
  const airCoverage = useAirCoverage();

  // Escape closes it, as it closes every other overlay on this map
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <>
      {/* A tap anywhere off the panel puts it away */}
      <div className="layers-scrim" onClick={onClose} />
      <div className="layers-panel" role="dialog" aria-label={copy.title}>
        <div className="layers-panel-head">
          <h2 className="layers-panel-title">{copy.mapType}</h2>
          <button
            type="button"
            className="layers-panel-close"
            onClick={onClose}
            title={copy.close}
            aria-label={copy.close}
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>
        <div className="layers-tiles">
          <LayerTile label={copy.basemapDefault} selected>
            <MiniMap />
          </LayerTile>
        </div>

        <div className="layers-divider" />

        <h3 className="layers-section-heading">{copy.mapDetails}</h3>
        <div className="layers-tiles">
          {/* Each overlay appears only where its tiles are configured. The
              panel itself is rendered when either is, so a build with one tile
              server and not the other gets a panel with one overlay in it
              rather than a tile that switches nothing */}
          {noiseTilesConfigured && (
          <LayerTile
            label={copy.trafficNoise}
            selected={noiseVisible}
            note={coverage === "uncovered" ? copy.noCoverage : undefined}
            onClick={() => onNoiseChange(!noiseVisible)}
          >
            <MiniMap noise />
          </LayerTile>
          )}
          {airTilesConfigured && (
          <LayerTile
            label={copy.airQuality}
            selected={airVisible}
            note={airCoverage === "uncovered" ? copy.noCoverage : undefined}
            onClick={() => onAirChange(!airVisible)}
          >
            <MiniMap air />
          </LayerTile>
          )}
        </div>
      </div>
    </>
  );
};

export default LayersPanel;
