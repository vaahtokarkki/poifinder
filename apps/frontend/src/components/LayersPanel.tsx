import React, { useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { ui } from "../copy";
import { BAND_COLOUR } from "../map/noiseTiles";

type LayersPanelProps = {
  onClose: () => void;
  noiseVisible: boolean;
  onNoiseChange: (visible: boolean) => void;
};

/**
 * A tile in the panel: a small picture of what the layer looks like, its name
 * under it, and a blue ring when it is on. The picture is the point — "traffic
 * noise" means nothing until you have seen the three bands, and a row of
 * checkboxes would have said the words without ever showing them.
 */
type LayerTileProps = {
  label: string;
  selected: boolean;
  swatch: React.CSSProperties;
  onClick?: () => void;
};

const LayerTile: React.FC<LayerTileProps> = ({ label, selected, swatch, onClick }) => {
  const content = (
    <>
      <span className="layers-tile-swatch" style={swatch} />
      <span className="layers-tile-label">{label}</span>
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
 * The basemap, drawn small: the pale ground CARTO's Voyager uses, a park and a
 * road over it. Not a screenshot — a thumbnail that has to be fetched is a
 * request made to describe a map that is already on the screen behind it.
 */
const BASEMAP_SWATCH: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(0,0,0,0) 46%, #b0b3b8 46%, #b0b3b8 54%, rgba(0,0,0,0) 54%)," +
    "radial-gradient(circle at 78% 24%, #c3e0bd 0 34%, rgba(0,0,0,0) 34%)," +
    "#f2efe9",
};

/**
 * And the noise wash: the three bands as they fall around a road, loud in the
 * middle. The colours are the layer's own rather than a copy of them, so a
 * change to the map cannot leave the legend describing the map before it.
 */
const NOISE_SWATCH: React.CSSProperties = {
  background:
    `radial-gradient(circle at 50% 50%, ${BAND_COLOUR[3]} 0 24%, ` +
    `${BAND_COLOUR[2]} 24% 52%, ${BAND_COLOUR[1]} 52% 100%)`,
};

/**
 * What is drawn on the map, and what is drawn over it.
 *
 * Two sections, in the order the map itself is stacked: the basemap first,
 * then the overlays on top of it. Today that is one of each, and the shape is
 * deliberately the one that takes a second basemap or a second overlay without
 * being redesigned around it.
 *
 * Only what is *painted* is decided here. The noise layer sits in the style
 * whatever this says, and a popup can read a band from it while the wash is
 * off — see setNoiseVisible in map/noiseTiles.ts.
 */
const LayersPanel: React.FC<LayersPanelProps> = ({
  onClose,
  noiseVisible,
  onNoiseChange,
}) => {
  const copy = ui().controls.layers;

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
      {/* A tap anywhere else puts it away. Barely tinted: the panel is small
          and the map behind it is what the choice is about */}
      <div className="layers-scrim" onClick={onClose} />
      <div className="layers-panel" role="dialog" aria-label={copy.title}>
        <div className="layers-panel-head">
          <h2 className="layers-panel-title">{copy.title}</h2>
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

        <section className="layers-section">
          <h3 className="layers-section-heading">{copy.mapType}</h3>
          <div className="layers-tiles">
            <LayerTile label={copy.basemapDefault} selected swatch={BASEMAP_SWATCH} />
          </div>
        </section>

        <section className="layers-section">
          <h3 className="layers-section-heading">{copy.mapDetails}</h3>
          <div className="layers-tiles">
            <LayerTile
              label={copy.trafficNoise}
              selected={noiseVisible}
              swatch={NOISE_SWATCH}
              onClick={() => onNoiseChange(!noiseVisible)}
            />
          </div>
        </section>
      </div>
    </>
  );
};

export default LayersPanel;
