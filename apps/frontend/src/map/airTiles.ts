/**
 * The air quality layer, and the reading nearest a point.
 *
 * Two different things from two different files, and keeping them apart is the
 * whole design of this module.
 *
 * The *layer* is vector tiles built by apps/air: every current PM2.5 reading
 * OpenAQ has, interpolated onto a grid, contoured at the European Air Quality
 * Index breakpoints and clipped to within 75 km of a monitor. It is a wash to
 * browse, the way a weather map is, and it is an interpolation — a colour on
 * it is an estimate for a place nobody is standing.
 *
 * The *popup* does not read that layer. It reads stations.json, the same
 * snapshot the field was built from, and reports the nearest actual monitor:
 * its measured number, how far away it is, and how long ago it was taken. A
 * popup that quoted the interpolated band under a bench would be presenting a
 * guess with the confidence of a measurement, and the distance is exactly the
 * thing that tells a reader how much to trust it. "18 µg/m³, measured 12 km
 * away" is a fact about a monitor. A coloured word is a fact about nothing.
 *
 * That split has a second, duller benefit: the popup does not depend on the
 * tiles being loaded, on the layer being installed, or on the map being at a
 * zoom the source has tiles for. It is one fetch and some arithmetic.
 *
 * Everything is behind one variable. With VITE_AIR_TILES_URL unset there is no
 * source, no layer, no fetch, no tile in the layers panel and no row in any
 * popup: a checkout with no tile server is a working checkout, which is why
 * this is configuration rather than a build flag.
 */
import type { FilterSpecification, Map as MaplibreMap } from "maplibre-gl";
import { getGlMap } from "./glMap";

/**
 * Where the tiles are, without a trailing slash: the origin of the Caddy in
 * apps/overpass/docker-compose.prod.yml in production, or the development one
 * in apps/air. Empty and the layer does not exist.
 */
const TILES_URL = import.meta.env.VITE_AIR_TILES_URL?.trim().replace(/\/$/, "");

/** Whether this build has an air quality layer at all */
export const airTilesConfigured = Boolean(TILES_URL);

/**
 * What the builder wrote. These have to match AIR_MIN_ZOOM and AIR_MAX_ZOOM in
 * apps/air: MapLibre asks for tiles inside this range and overzooms above it,
 * so a maximum set higher here than the tiles go is a request for a tile that
 * does not exist, on every pan, at every zoom above the real one.
 *
 * Eight, where the noise layer stops at twelve, and that is not a compromise.
 * The field is interpolated from monitors tens of kilometres apart onto an
 * 11 km grid: it has no detail below a few kilometres, so there is nothing for
 * a z12 tile to carry that a z8 tile overzoomed does not already say. Writing
 * them anyway would be hundreds of thousands of files describing a surface
 * that stopped changing four zoom levels ago.
 */
const MIN_ZOOM = 2;
const MAX_ZOOM = 15;

/*
 * There is no maximum draw zoom, and there was one.
 *
 * The argument for capping it was that a reader at z15 is looking at one
 * street, and a regional interpolation painted over it reads as a statement
 * about that street — which it is not, and cannot be, when the nearest monitor
 * is tens of kilometres away.
 *
 * That argument is still true and it lost anyway, because of what it does to
 * somebody using this. A layer that switches itself off as you zoom in reads
 * as broken rather than as careful: you turned it on, the map moved, the
 * colour went, and nothing said why. Wanting to see the air where you actually
 * are is the whole reason to open the layer.
 *
 * So the wash is drawn at every zoom and the honesty is carried where it
 * belongs — in the popup, which quotes a real monitor and says how many
 * kilometres away it was measured. A flat tint over one street is not a claim
 * about that street; the popup beside it is what says how much the colour is
 * worth.
 */
/**
 * The credit this layer owes, and it is owed rather than offered.
 *
 * ODC-BY and CC BY both require attributing the source, so this names the
 * networks instead of only the convenient aggregator: the EEA's monitors are
 * most of the reference data, Sensor.Community is nearly all of the detail,
 * and the city outline the tiles are clipped to is OpenStreetMap's.
 *
 * Exported because setting it on the source is not enough to make it appear.
 * The Leaflet adapter reads attributions off the style once, when the style
 * loads, and this layer is deliberately added later so its tiles do not
 * compete with the basemap. BasemapLayer puts it into Leaflet's control by
 * hand for that reason — see the note there.
 */
export const AIR_ATTRIBUTION =
  'Air quality: <a href="https://www.eea.europa.eu/">EEA</a> and others via ' +
  '<a href="https://openaq.org/">OpenAQ</a>, ' +
  '<a href="https://sensor.community/">Sensor.Community</a>, ' +
  // "from" rather than a second "© OpenStreetMap contributors": the basemap's
  // own credit already carries that notice, and repeating it verbatim reads as
  // a duplicate rather than as a separate acknowledgement. What this adds is
  // which OSM data is used and what for
  'city boundaries from OpenStreetMap';

/**
 * The same credit as a list, for the popup's explanation dialog.
 *
 * The map control gets one line of HTML because that is all it has room for.
 * The dialog has room for the licence each source is used under, and it is the
 * only place a reader who never switches the layer on is told where the number
 * in their popup came from — see OverlayAttribution, which only credits a
 * layer while it is drawn.
 *
 * Names and licence identifiers are proper nouns, so none of this is
 * translated.
 */
export const AIR_SOURCE_LINKS: ReadonlyArray<{
  label: string;
  href: string;
  licence: string;
}> = [
  { label: "EEA", href: "https://www.eea.europa.eu/", licence: "ODC-BY" },
  { label: "OpenAQ", href: "https://openaq.org/", licence: "ODC-BY, CC BY 4.0" },
  {
    label: "Sensor.Community",
    href: "https://sensor.community/",
    licence: "ODbL",
  },
  {
    label: "OpenStreetMap",
    href: "https://www.openstreetmap.org/copyright",
    licence: "ODbL",
  },
];

export const AIR_SOURCE_ID = "wayside-air";
export const AIR_LAYER_ID = "wayside-air-fill";

/** The six EAQI levels, good through extremely poor */
export type AirBand = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The EAQI's PM2.5 breakpoints in µg/m³: the value at which each band starts.
 *
 * Published thresholds rather than ours, and that is deliberate. These are to
 * this layer what 55 and 65 dB Lden are to the noise one — "poor" here means
 * what it means on a national air quality site, not what it means relative to
 * the rest of this map. Inventing three bands instead, to look suitably modest
 * about an interpolation, would have bought nothing: it would make the map
 * incomparable with every other one a reader has seen, and the modesty belongs
 * in the coverage mask and the caption, where it actually is.
 */
const BAND_FLOOR: Record<AirBand, number> = {
  1: 0,
  2: 10,
  3: 20,
  4: 25,
  5: 50,
  6: 75,
};

/**
 * The EAQI's own colours, which is the rest of borrowing the scale. A reader
 * who has seen a national air quality map has seen these six, and repainting
 * them in some house palette would keep the thresholds while throwing away the
 * recognition that is most of their value.
 */
export const BAND_COLOUR: Record<AirBand, string> = {
  1: "#50f0e6",
  2: "#50ccaa",
  3: "#f0e641",
  4: "#ff5050",
  5: "#960032",
  6: "#7d2181",
};

/**
 * How solid each band is drawn.
 *
 * Rising with the band, for the reason the noise layer's opacities rise: good
 * air covers most of the map on most days and is the absence of a problem, so
 * it is barely there; the top of the scale is the thing worth seeing. Drawn at
 * one opacity the layer is a flat wash the eye has to decode, which is the
 * failure that makes people switch a layer off and leave it off.
 *
 * Heavier than the noise bands rather than lighter, which is the opposite of
 * where this started and is the right way round.
 *
 * The first version reasoned from the layer's extent: it covers whole
 * countries rather than the strips either side of a road, so it was drawn
 * faintly to keep from swamping the basemap. What that missed is the base
 * rate. On a clear day almost all of a country is band 1, so a faint band 1 is
 * the only thing most readers ever see — and a layer you switch on to no
 * visible change reads as broken, not as clean air.
 *
 * So band 1 is drawn at a weight you can actually see. The basemap survives it
 * because the fill sits under the first symbol layer, which keeps every place
 * name and road shield on top of the wash rather than under it.
 */
const BAND_OPACITY: Record<AirBand, number> = {
  1: 0.2,
  2: 0.26,
  3: 0.32,
  4: 0.38,
  5: 0.44,
  6: 0.5,
};

const BANDS: AirBand[] = [1, 2, 3, 4, 5, 6];

const visibleOpacity = [
  "match",
  ["get", "band"],
  ...BANDS.flatMap(band => [band, BAND_OPACITY[band]]),
  0,
];

const bandColour = [
  "match",
  ["get", "band"],
  ...BANDS.flatMap(band => [band, BAND_COLOUR[band]]),
  "transparent",
];

/** Which band a measured value falls in */
export function bandForValue(value: number): AirBand {
  let found: AirBand = 1;
  for (const band of BANDS) if (value >= BAND_FLOOR[band]) found = band;
  return found;
}

/**
 * Whether the reader wants the wash drawn.
 *
 * Module state rather than a parameter, because the layer is installed later
 * than the toggle can be pressed — see installAirWhenBasemapReady. Somebody
 * who switches the layer on during the first second of a page load is asking a
 * layer that does not exist yet, and the answer has to survive until it does.
 */
let wantVisible = false;

/**
 * Add the source and the layer to a map that has finished drawing its basemap.
 *
 * Idempotent, because both of the events that trigger it can fire.
 */
function installAirLayer(map: MaplibreMap): void {
  if (!TILES_URL || map.getSource(AIR_SOURCE_ID)) return;

  map.addSource(AIR_SOURCE_ID, {
    type: "vector",
    tiles: [`${TILES_URL}/{z}/{x}/{y}.pbf`],
    minzoom: MIN_ZOOM,
    maxzoom: MAX_ZOOM,
    attribution: AIR_ATTRIBUTION,
  });

  /**
   * Under the first symbol layer, so place names stay on top of the wash. A
   * translucent fill over the labels is how a basemap stops being readable —
   * and this one covers whole countries, so it would take every label with it.
   */
  const firstSymbol = map
    .getStyle()
    .layers.find(candidate => candidate.type === "symbol");

  map.addLayer(
    {
      id: AIR_LAYER_ID,
      type: "fill",
      source: AIR_SOURCE_ID,
      "source-layer": "air",
      paint: {
        "fill-color": bandColour as unknown as string,
        "fill-opacity": 0,
        // Antialiased, unlike the noise layer. That one is drawn faintly enough
        // that a hard edge never shows; these bands are drawn to be seen, and
        // an aliased boundary between two of them is a visible staircase — the
        // more so because the client overzooms these tiles from z8
        "fill-antialias": true,
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
 * The same deferral the noise layer uses and for the same reason: the basemap
 * is the map, an overlay most readers never switch on has no business
 * competing for the connection with it, and deferring costs the overlay a
 * second and the basemap nothing.
 *
 * Two triggers, whichever comes first, because neither alone is reliable.
 * `load` fires once when the first complete render is done, but has already
 * fired if this is called late; `idle` fires whenever there is nothing left to
 * fetch or draw, including after a failed basemap. `loaded()` covers the case
 * where both have already happened. The add is idempotent, so racing is fine.
 *
 * Unlike the noise layer this one may wait for the toggle without breaking
 * anything — nothing queries it — but it does not, because a reader who
 * switches it on should not then wait for a tile round trip to see it.
 */
export function installAirWhenBasemapReady(map: MaplibreMap): () => void {
  if (!TILES_URL) return () => {};

  let done = false;
  const install = () => {
    if (done) return;
    done = true;
    map.off("load", install);
    map.off("idle", install);
    try {
      installAirLayer(map);
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
  if (!map.getLayer(AIR_LAYER_ID)) return;
  map.setPaintProperty(
    AIR_LAYER_ID,
    "fill-opacity",
    wantVisible ? (visibleOpacity as unknown as FilterSpecification) : 0
  );
}

/**
 * Show or hide the wash.
 *
 * Opacity rather than `visibility`, which for this layer is a preference
 * rather than the load-bearing decision it is for noise: nothing queries these
 * tiles, so `visibility: none` would be safe here. It is opacity anyway so
 * that the two overlays behave identically, and so that switching the layer on
 * does not re-request every tile that was already fetched.
 *
 * Safe to call before the layer exists: the wish is remembered and applied
 * when it does.
 */
export function setAirVisible(map: MaplibreMap | null, visible: boolean): void {
  wantVisible = visible;
  if (map) applyVisibility(map);
}

/* ---------------------- the stations, for the popup ---------------------- */

/** One monitor's most recent reading, as the snapshot carries it */
export type AirStation = {
  lon: number;
  lat: number;
  /** PM2.5 in µg/m³ */
  value: number;
  /** How long before the snapshot was taken this was measured */
  ageMinutes: number;
  /**
   * Whether this is a reference monitor rather than a citizen sensor.
   *
   * The snapshot carries both. Reference monitors are the EEA's and their
   * peers: calibrated instruments, run to a standard, and about 90 of them in
   * the region this publishes. Citizen sensors are Sensor.Community's SDS011
   * units, roughly six times as many and roughly six times closer together,
   * corrected in the builder by one factor fitted against co-located reference
   * monitors.
   *
   * That correction is good enough to make the two networks agree about the
   * level of a region, which is what the interpolated field needs. It is not
   * good enough to make one uncalibrated sensor a measurement, which is what
   * the popup would be claiming — so only reference monitors are ever quoted.
   * See nearestReading.
   */
  reference: boolean;
};

/**
 * How far a monitor can be and still be worth quoting, in kilometres.
 *
 * The same radius apps/air masks the field at, and it has to be: past it the
 * builder decided a station could not speak for a place and drew nothing, so
 * quoting one here would put a number in the popup for exactly the places the
 * map deliberately left blank.
 */
const NEAREST_LIMIT_KM = 75;

const KM_PER_DEGREE_LAT = 110.574;
const KM_PER_DEGREE_LON = 111.32;

let snapshot: AirStation[] | null = null;
/**
 * When the builder took the snapshot, as epoch milliseconds.
 *
 * Kept because every station's `ageMinutes` is measured from this instant and
 * not from now, and the gap between the two is not small. The file is rebuilt
 * hourly and served with `max-age=300, stale-while-revalidate=3600`, so a
 * reader can perfectly well be holding a snapshot that was built an hour ago —
 * and a popup that reported the stored age would say "20 minutes ago" about a
 * reading taken eighty minutes ago. Off by an hour, in the direction that
 * flatters us, on the one row that exists to say how current the number is.
 */
let snapshotFetchedAt: number | null = null;
let pending: Promise<AirStation[] | null> | null = null;
let failed = false;

/**
 * The station snapshot, fetched once and kept.
 *
 * Lazy, and nothing on the page waits for it. It is a couple of hundred
 * kilobytes of JSON — small for a file and not small for a map on a phone — so
 * it is requested when something actually needs it: a popup that wants a row,
 * or the layers panel asking whether there is coverage here. A reader who
 * never opens either never downloads it.
 *
 * A failure is remembered, not retried. There is no version of this file worth
 * a second request: it feeds one line of one popup, and a tile server that is
 * down stays down for longer than a session.
 */
export function loadStations(): Promise<AirStation[] | null> {
  if (!TILES_URL || failed) return Promise.resolve(null);
  if (snapshot) return Promise.resolve(snapshot);
  if (pending) return pending;

  pending = fetch(`${TILES_URL}/stations.json`)
    .then(response => (response.ok ? response.json() : null))
    .then((payload: unknown) => {
      const rows = (payload as { stations?: unknown })?.stations;
      if (!Array.isArray(rows)) throw new Error("no stations");
      // Absent or unparseable leaves this null, and the age below then falls
      // back to the stored one rather than to a wrong one
      const fetched = Date.parse(
        String((payload as { fetched?: unknown })?.fetched ?? "")
      );
      snapshotFetchedAt = Number.isFinite(fetched) ? fetched : null;
      // The snapshot stores rows as arrays rather than objects, which roughly
      // halves the download. `columns` in the file says what the order is;
      // this is that order
      snapshot = rows
        .filter(row => Array.isArray(row) && row.length >= 4)
        .map(([lon, lat, value, ageMinutes, source]) => ({
          lon: Number(lon),
          lat: Number(lat),
          value: Number(value),
          ageMinutes: Number(ageMinutes),
          // Absent in a snapshot written before the citizen network was added,
          // and every station in one of those is a reference monitor
          reference: source === undefined || Number(source) === 0,
        }))
        .filter(station => Number.isFinite(station.value));
      return snapshot;
    })
    .catch(() => {
      failed = true;
      return null;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

/** What the popup says: a measurement, and how far away it was taken */
export type AirReading = {
  station: AirStation;
  band: AirBand;
  distanceKm: number;
  /**
   * How long ago the reading was taken, counted to now rather than to when the
   * snapshot was built. See snapshotFetchedAt for why those are different.
   */
  ageMinutes: number;
};

/**
 * The nearest reference monitor to a position, or null if none is close
 * enough.
 *
 * Reference monitors only, and citizen sensors are skipped however much closer
 * one of them is. The popup says "measured 3 km away", and that sentence is
 * only true of a calibrated instrument — a corrected SDS011 reading is a good
 * enough contribution to a regional field and is not a measurement of
 * anything on its own. The map keeps the detail they give it; the popup keeps
 * the provenance.
 *
 * A linear scan, which for a few thousand stations is well under a
 * millisecond and is called once per popup. An index would be faster and would
 * be the only thing in this file nobody could read at a glance.
 *
 * Equirectangular distance rather than a great circle: the answer is capped at
 * 75 km, where the two differ by well under a metre, and the popup rounds to
 * the kilometre anyway.
 */
export function nearestReading(position: [number, number]): AirReading | null {
  if (!snapshot || snapshot.length === 0) return null;

  const [lat, lon] = position;
  const scale = Math.max(Math.cos((lat * Math.PI) / 180), 0.05);

  let best: AirStation | null = null;
  let bestKm = Infinity;

  for (const station of snapshot) {
    if (!station.reference) continue;
    const dy = (station.lat - lat) * KM_PER_DEGREE_LAT;
    const dx = (station.lon - lon) * KM_PER_DEGREE_LON * scale;
    const squared = dy * dy + dx * dx;
    if (squared < bestKm) {
      bestKm = squared;
      best = station;
    }
  }

  if (!best) return null;
  const distanceKm = Math.sqrt(bestKm);
  if (distanceKm > NEAREST_LIMIT_KM) return null;

  // How long this snapshot has been sitting in a cache, added to the age it
  // was carrying when it was written. Clamped at zero because a client clock
  // behind the server's would otherwise make a reading younger than it is
  const drift =
    snapshotFetchedAt === null
      ? 0
      : Math.max(0, (Date.now() - snapshotFetchedAt) / 60000);

  return {
    station: best,
    band: bandForValue(best.value),
    distanceKm,
    ageMinutes: Math.round(best.ageMinutes + drift),
  };
}

/**
 * Whether there is a monitor near the middle of the view.
 *
 * Three states rather than a boolean, exactly as the noise layer's coverage
 * is, and for the same reason: "nothing here" has two causes and only one is
 * worth telling anybody about. `unknown` means the snapshot has not arrived
 * yet or there is no map to ask about; `uncovered` means it has arrived and
 * the nearest monitor to the middle of the screen is further away than the
 * builder was willing to draw.
 *
 * Read from the stations rather than from the tiles, which makes it honest at
 * any zoom and independent of what is on the screen. Asking the rendered layer
 * would answer "no coverage" for a reader who simply has the layer switched
 * off, or whose tiles have not arrived yet — neither of which says anything
 * about whether a monitor is nearby.
 */
export type AirCoverage = "covered" | "uncovered" | "unknown";

export function airCoverageAtCenter(): AirCoverage {
  // Deliberately asks nearestReading, so "covered" means "a popup here would
  // have something to say" rather than "the wash is drawn here". Those differ
  // now that the wash is built from citizen sensors the popup will not quote
  const map = getGlMap();
  if (!map || !TILES_URL || !snapshot) return "unknown";

  let centre;
  try {
    centre = map.getCenter();
  } catch {
    // Between style loads, which is a moment rather than a state
    return "unknown";
  }

  return nearestReading([centre.lat, centre.lng]) ? "covered" : "uncovered";
}
