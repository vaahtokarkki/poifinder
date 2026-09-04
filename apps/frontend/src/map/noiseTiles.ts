/**
 * The modelled traffic noise layer, and the value under a point.
 *
 * The tiles are built by apps/noise from OpenStreetMap alone: road and railway
 * geometry, a level per class refined by maxspeed and lanes, and a distance
 * decay around each. Three bands come out of it — quiet, moderate, noisy — and
 * three is deliberate. Nothing in OpenStreetMap says how many cars use a road,
 * so a number in decibels would be a precision the input cannot support. See
 * apps/noise/README.md.
 *
 * Everything here is behind one variable. With VITE_NOISE_TILES_URL unset there
 * is no source, no layer, no request, and no row in any popup: a checkout with
 * no tile server is a working checkout, which is the whole reason this is
 * configuration rather than a build flag.
 *
 * Nothing here is ever waited on, and nothing here goes first. The basemap
 * loads and draws; only then is the noise source added, so its tiles never
 * compete for the connection with the map the reader is actually waiting to
 * see. After that they arrive when they arrive, or not at all — and the only
 * thing that changes when they do is that one more row can appear in an open
 * popup. A tile server that is down, slow, or has never been built costs the
 * map nothing and shows the reader nothing.
 */
import type { FilterSpecification, Map as MaplibreMap } from "maplibre-gl";
import { getGlMap } from "./glMap";

/**
 * Where the tiles are, without a trailing slash: the origin of the Caddy in
 * apps/overpass/docker-compose.prod.yml in production, or the development one
 * in apps/noise. Empty and the layer does not exist.
 */
const TILES_URL = import.meta.env.VITE_NOISE_TILES_URL?.trim().replace(/\/$/, "");

/** Whether this build has a noise layer at all */
export const noiseTilesConfigured = Boolean(TILES_URL);

/**
 * What the builder wrote. These have to match NOISE_MIN_ZOOM and
 * NOISE_MAX_ZOOM in apps/noise: MapLibre asks for tiles inside this range and
 * overzooms above it, so a maximum set higher here than the tiles go is a
 * request for a tile that does not exist, on every pan, at every zoom above
 * the real one.
 *
 * Overzooming is what makes that cheap rather than a compromise. These are
 * three smooth polygons; a z12 tile holds about 1.5 m of resolution, which is
 * far finer than a band edge that was modelled rather than measured.
 */
const MIN_ZOOM = 2;
const MAX_ZOOM = 15;

/**
 * The credit this layer owes. The tiles are an ODbL derivative of
 * OpenStreetMap, so saying where they came from is a licence term.
 *
 * Setting it on the source does not make it appear, which is why this is
 * exported. The Leaflet adapter collects attributions when the style loads and
 * this source is added afterwards, so nothing was ever reading it — see the
 * note in BasemapLayer, which now adds it to Leaflet's control by hand.
 */
export const NOISE_ATTRIBUTION = "Noise modelled from OpenStreetMap";

/** The same credit as a list, for the popup's explanation dialog */
export const NOISE_SOURCE_LINKS: ReadonlyArray<{
  label: string;
  href: string;
  licence: string;
}> = [
  {
    label: "OpenStreetMap",
    href: "https://www.openstreetmap.org/copyright",
    licence: "ODbL",
  },
];

export const NOISE_SOURCE_ID = "wayside-noise";
export const NOISE_LAYER_ID = "wayside-noise-fill";

/** Quiet, moderate, noisy — the three the tiles carry, and nothing between */
export type NoiseBand = 1 | 2 | 3;

/**
 * One colour per band, and they are the colours of a warning rather than of a
 * category: this is the only layer on the map that is not about what the
 * reader searched for, so it deliberately shares no palette with the markers.
 */
export const BAND_COLOUR: Record<NoiseBand, string> = {
  1: "#2e7d32",
  2: "#f9a825",
  3: "#c62828",
};

/**
 * How solid each band is drawn.
 *
 * Not one opacity for all three. Quiet covers most of a city and is the
 * absence of a problem, so it is barely there; noisy is the thing worth
 * seeing. Drawn at one opacity the layer reads as a flat wash and the eye has
 * to work out which green is which, which is the failure that makes people
 * turn a layer off and leave it off.
 */
const BAND_OPACITY: Record<NoiseBand, number> = {
  1: 0.1,
  2: 0.22,
  3: 0.34,
};

const visibleOpacity = [
  "match",
  ["get", "band"],
  1,
  BAND_OPACITY[1],
  2,
  BAND_OPACITY[2],
  3,
  BAND_OPACITY[3],
  0,
];

const bandColour = [
  "match",
  ["get", "band"],
  1,
  BAND_COLOUR[1],
  2,
  BAND_COLOUR[2],
  3,
  BAND_COLOUR[3],
  "transparent",
];

/**
 * Whether the reader wants the wash drawn.
 *
 * Module state rather than a parameter, because the layer is installed later
 * than the toggle can be pressed — see installNoiseWhenBasemapReady. Somebody
 * who switches the layer on during the first second of a page load is asking a
 * layer that does not exist yet, and the answer has to survive until it does.
 */
let wantVisible = false;

/**
 * Add the source and the layer to a map that has finished drawing its basemap.
 *
 * Idempotent, because both of the events that trigger it can fire.
 */
function installNoiseLayer(map: MaplibreMap): void {
  if (!TILES_URL || map.getSource(NOISE_SOURCE_ID)) return;

  map.addSource(NOISE_SOURCE_ID, {
    type: "vector",
    tiles: [`${TILES_URL}/{z}/{x}/{y}.pbf`],
    minzoom: MIN_ZOOM,
    maxzoom: MAX_ZOOM,
    attribution: NOISE_ATTRIBUTION,
  });

  /**
   * Under the first symbol layer, so place names and road shields stay on top
   * of the wash. A translucent fill over the labels is how a basemap stops
   * being readable.
   */
  const firstSymbol = map
    .getStyle()
    .layers.find(candidate => candidate.type === "symbol");

  map.addLayer(
    {
      id: NOISE_LAYER_ID,
      type: "fill",
      source: NOISE_SOURCE_ID,
      "source-layer": "noise",
      paint: {
        "fill-color": bandColour as unknown as string,
        "fill-opacity": 0,
        "fill-antialias": false,
      },
    },
    firstSymbol?.id
  );

  // Whatever was asked for while there was nothing to ask
  applyVisibility(map);
}

/**
 * Install the layer, but only once the basemap has finished loading.
 *
 * The basemap is the map. Noise is an overlay most readers never switch on,
 * and having it in the style document from the first frame — which is where it
 * used to be — meant its tiles were requested in the same breath as CARTO's,
 * competing for bandwidth with the thing the reader is actually waiting to
 * see. Deferring costs the noise layer a second and costs the basemap nothing,
 * which is the right way round.
 *
 * Two triggers, whichever comes first, because neither alone is reliable.
 * `load` fires once when the first complete render is done, but has already
 * fired if this is called late; `idle` fires whenever there is nothing left to
 * fetch or draw, including after a failed basemap. `loaded()` covers the case
 * where both have already happened. The add is idempotent, so racing is fine.
 *
 * What this deliberately does not do is wait for the toggle. The popup reads
 * the band whether the wash is drawn or not, so the tiles have to arrive for a
 * reader who never opens the layer at all — just not before the map does.
 */
export function installNoiseWhenBasemapReady(map: MaplibreMap): () => void {
  if (!TILES_URL) return () => {};

  let done = false;
  const install = () => {
    if (done) return;
    done = true;
    map.off("load", install);
    map.off("idle", install);
    try {
      installNoiseLayer(map);
    } catch {
      // A style reload can pull the map out from under this between the event
      // and the call. There is nothing to recover — the next map publishes
      // itself and this runs again — and nothing worth breaking the basemap for
    }
  };

  if (map.loaded()) install();
  else {
    map.on("load", install);
    map.on("idle", install);
  }

  return () => {
    done = true;
    map.off("load", install);
    map.off("idle", install);
  };
}

function applyVisibility(map: MaplibreMap): void {
  if (!map.getLayer(NOISE_LAYER_ID)) return;
  map.setPaintProperty(
    NOISE_LAYER_ID,
    "fill-opacity",
    wantVisible ? (visibleOpacity as unknown as FilterSpecification) : 0
  );
}

/**
 * Show or hide the bands.
 *
 * Opacity rather than `visibility`, and this is the load-bearing detail of the
 * whole feature. `queryRenderedFeatures` returns nothing for a layer set to
 * `visibility: none`, and once no layer references a source MapLibre stops
 * loading its tiles altogether — so the obvious implementation silently breaks
 * the popup exactly when the reader has the layer switched off. A layer at
 * zero opacity is still rendered, still loads its tiles, and still answers a
 * query, which is what lets the popup know the band whether the wash is on the
 * screen or not.
 *
 * Safe to call before the layer exists: the wish is remembered and applied
 * when it does.
 */
export function setNoiseVisible(map: MaplibreMap | null, visible: boolean): void {
  wantVisible = visible;
  if (map) applyVisibility(map);
}

/**
 * Whether the modelled tiles cover where the map is looking.
 *
 * Three states rather than a boolean, because "no polygon under the middle of
 * the screen" has two very different causes and only one of them is worth
 * telling anybody about. The builder writes quiet as a polygon of its own, so
 * a covered city answers with a feature wherever you point at it; an answer of
 * nothing means either that this place is outside every city that was built,
 * or that there was nothing to ask yet — the layer is not installed, the view
 * is below the zoom the source has tiles for, or those tiles are still on
 * their way. Only the first is `uncovered`.
 *
 * The middle of the canvas rather than a coordinate, because the question the
 * panel asks is about the view, not about a point somebody clicked.
 */
export type NoiseCoverage = "covered" | "uncovered" | "unknown";

export function noiseCoverageAtCenter(): NoiseCoverage {
  const map = getGlMap();
  if (!map || !TILES_URL) return "unknown";
  if (!map.getLayer(NOISE_LAYER_ID)) return "unknown";

  // Under the source's minimum zoom MapLibre asks for no tiles at all, so an
  // empty query at z8 says nothing about what is in the tiles at z10
  if (map.getZoom() < MIN_ZOOM) return "unknown";

  let loaded;
  try {
    loaded = map.isSourceLoaded(NOISE_SOURCE_ID);
  } catch {
    // Between style loads, same as below
    return "unknown";
  }
  // A tile still in flight would answer "nothing here" and then change its
  // mind, which is the one thing a notice about coverage must not do
  if (!loaded) return "unknown";

  const canvas = map.getCanvas();
  const centre: [number, number] = [canvas.clientWidth / 2, canvas.clientHeight / 2];

  try {
    return map.queryRenderedFeatures(centre, { layers: [NOISE_LAYER_ID] }).length > 0
      ? "covered"
      : "uncovered";
  } catch {
    return "unknown";
  }
}

/**
 * The band under a position, or null when there is no answer yet.
 *
 * Null covers three different things on purpose, because the popup treats them
 * identically: the tiles are not configured, they have not loaded, or this
 * place is outside every city the builder covered. In all three the honest
 * output is no row at all — a noise reading the model never made is worse than
 * silence.
 *
 * The band for a covered place is never null once the tile is in: the builder
 * writes quiet as its own polygon rather than as the gaps between the others,
 * so "inside a city and quiet" and "outside every city" are distinguishable
 * here rather than both being an empty query.
 */
export function noiseBandAt(position: [number, number]): NoiseBand | null {
  const map = getGlMap();
  if (!map || !TILES_URL) return null;
  if (!map.getLayer(NOISE_LAYER_ID)) return null;

  let point;
  try {
    // Longitude first: this is MapLibre, not Leaflet
    point = map.project([position[1], position[0]]);
  } catch {
    return null;
  }

  // A point outside the canvas has no rendered feature under it, whatever the
  // tiles say. Popups only ever open over a marker that is on the screen, so
  // this is a guard rather than a case
  const canvas = map.getCanvas();
  if (point.x < 0 || point.y < 0 || point.x > canvas.clientWidth || point.y > canvas.clientHeight) {
    return null;
  }

  let features;
  try {
    features = map.queryRenderedFeatures(point, { layers: [NOISE_LAYER_ID] });
  } catch {
    // Thrown when the style is between loads, which is a moment rather than a
    // state: the caller retries on the next idle
    return null;
  }

  for (const feature of features) {
    const band = Number(feature.properties?.band);
    if (band === 1 || band === 2 || band === 3) return band;
  }
  return null;
}

/**
 * The band that describes a whole shape, rather than the band at one point in
 * it.
 *
 * A park is not one reading. A playground with a main road down one side is
 * mostly loud with a quiet corner, and which of those two things the popup
 * says depends entirely on where it looks — the centroid can land on the one
 * quiet patch and sell the place as somewhere to sit. So every sample the
 * caller supplies is read, and the band that covers most of them wins.
 *
 * Counting samples is weighting by area, because shapeSamplePoints spaces them
 * evenly: each one stands for an equal patch of the place. A tie goes to the
 * louder band, which is the only safe way to round this — half a park being
 * noisy is not a park to describe as quiet.
 *
 * Samples that fall outside the canvas are skipped rather than counted as
 * quiet: they are off the screen, not out of the model. A shape too large to
 * fit in the view is therefore described by the part of it in the view, which
 * is also the part the reader is looking at.
 *
 * Null until the source has finished loading, unlike the single point version.
 * A partly loaded set of tiles gives a majority that changes as the rest
 * arrive, and a row that says "quiet" and then "noisy" is worse than a row
 * that appears a moment later.
 */
export function noiseBandOverArea(points: [number, number][]): NoiseBand | null {
  const map = getGlMap();
  if (!map || !TILES_URL || points.length === 0) return null;
  if (!map.getLayer(NOISE_LAYER_ID)) return null;

  try {
    if (!map.isSourceLoaded(NOISE_SOURCE_ID)) return null;
  } catch {
    return null;
  }

  const counts: Record<NoiseBand, number> = { 1: 0, 2: 0, 3: 0 };
  let read = 0;

  for (const point of points) {
    const band = noiseBandAt(point);
    if (band === null) continue;
    counts[band] += 1;
    read += 1;
  }

  if (read === 0) return null;

  // Descending, so an equal count settles on the louder band
  const bands: NoiseBand[] = [3, 2, 1];
  return bands.reduce((best, band) => (counts[band] > counts[best] ? band : best), 3);
}
