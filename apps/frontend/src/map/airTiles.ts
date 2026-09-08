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
 * The *popup* reads the band out of those same tiles, and then reads
 * stations.json — the snapshot the field was built from — to say what the
 * nearest sensor to the point measured, how far away it is and how long ago.
 *
 * The band comes from the tiles because the popup and the wash under it have
 * to agree. They did not. The popup used to quote the nearest *reference*
 * monitor and call its band the answer, while the wash was interpolated from
 * every sensor including the citizen network — six times as many and six
 * times closer together — so a reader standing on an orange city could open a
 * popup that said "Fair", in the same six words the legend uses for the
 * colour they were looking at. One of the two was wrong and there was no way
 * to tell which from the popup. Reading the band off the rendered tile makes
 * the popup a caption for the map rather than a second opinion about it.
 *
 * The station is still there because a band on its own is an estimate with
 * nothing behind it. The distance is the part that says how much to trust it:
 * a sensor 2 km away in the same suburb and one 60 km away across a mountain
 * range are different kinds of support for the same coloured word.
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
const MAX_ZOOM = 8;

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
 * most of the reference data in Europe, the EPA's most of it in the US,
 * Sensor.Community is nearly all of the detail, and the city outline the
 * tiles are clipped to is OpenStreetMap's.
 *
 * Exported because setting it on the source is not enough to make it appear.
 * The Leaflet adapter reads attributions off the style once, when the style
 * loads, and this layer is deliberately added later so its tiles do not
 * compete with the basemap. BasemapLayer puts it into Leaflet's control by
 * hand for that reason — see the note there.
 */
export const AIR_ATTRIBUTION =
  'Air quality: <a href="https://www.eea.europa.eu/">EEA</a>, ' +
  '<a href="https://www.epa.gov/">EPA</a> and others via ' +
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
  {
    label: "OpenAQ",
    href: "https://openaq.org/",
    licence: "ODC-BY, CC BY 4.0, CC0 1.0, US Public Domain, UK OGL",
  },
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
 * A band's range in µg/m³, as the popup prints it beside the word.
 *
 * The number the popup used to show was the nearest monitor's reading, and
 * that is exactly the number that made the popup argue with the map: the wash
 * is an interpolation over every sensor in the region, one station's value is
 * not, and the two disagree whenever the nearest reference monitor is not
 * representative of its surroundings. What the band actually claims is a
 * range, so the range is what is printed.
 *
 * Digits and dashes only, so no locale has a copy of this to keep in step.
 */
export function bandRange(band: AirBand): string {
  const floor = BAND_FLOOR[band];
  const ceiling = band === 6 ? null : BAND_FLOOR[(band + 1) as AirBand];
  if (band === 1) return `< ${ceiling}`;
  if (ceiling === null) return `> ${floor}`;
  return `${floor}–${ceiling}`;
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
   * Both are quoted now, and the popup says which it is quoting. Skipping the
   * citizen sensors, which is what this did, meant a caption naming a monitor
   * 60 km away under a band that was decided by an SDS011 a kilometre from the
   * marker: the support named was not the support used. What kept that honest
   * was never the network, it was the wording — and "a citizen sensor 1 km
   * away read 26" is both truthful about the instrument and about what the
   * colour on the map came from. See nearestReading and AirSection.
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

/** What the popup's caption says: a measurement, and how far away it was taken */
export type AirReading = {
  station: AirStation;
  /**
   * The band this one station's reading falls in.
   *
   * Not what the popup prints — that is the band the tiles paint, which is the
   * whole region's rather than this station's. Kept because it is a property
   * of the reading and costs nothing, and because a caller that wants to know
   * whether the nearest sensor agrees with the field has no other way to ask.
   */
  band: AirBand;
  distanceKm: number;
  /**
   * How long ago the reading was taken, counted to now rather than to when the
   * snapshot was built. See snapshotFetchedAt for why those are different.
   */
  ageMinutes: number;
};

/**
 * The nearest sensor to a position, or null if none is close enough.
 *
 * Every sensor, reference and citizen alike, because this is the support for a
 * band the field worked out from every sensor. Quoting only the calibrated
 * ones described a different calculation from the one the reader is looking
 * at, usually from much further away. The instrument is not hidden — the
 * reading carries `reference` and the popup words the two differently — which
 * is where that distinction belongs.
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
 * The band the wash paints at a position, or null when there is no answer.
 *
 * The same query the noise layer answers with, against a layer kept at zero
 * opacity rather than `visibility: none` for exactly this reason — see
 * setAirVisible. So the band is available whether or not the reader has the
 * wash switched on, and it is by construction the band they would see if they
 * did.
 *
 * Null covers "not configured", "not installed yet", "tile still in flight"
 * and "outside everything the builder published", because the popup treats all
 * four the same way: no row. The last of those is the one that matters. The
 * field is masked at 75 km from a sensor and then clipped to the published
 * cities buffered by ten kilometres, so there is a wide ring — a whole
 * country's worth of it — where a sensor is within range and nothing is drawn.
 * A popup that answered there would be describing a colour that is not on the
 * map.
 */
export function airBandAt(position: [number, number]): AirBand | null {
  const map = getGlMap();
  if (!map || !TILES_URL) return null;
  if (!map.getLayer(AIR_LAYER_ID)) return null;

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
  if (
    point.x < 0 ||
    point.y < 0 ||
    point.x > canvas.clientWidth ||
    point.y > canvas.clientHeight
  ) {
    return null;
  }

  let features;
  try {
    features = map.queryRenderedFeatures(point, { layers: [AIR_LAYER_ID] });
  } catch {
    // Thrown when the style is between loads, which is a moment rather than a
    // state: the caller retries on the next idle
    return null;
  }

  // The bands are nested regions subtracted from one another, so exactly one
  // covers a point — but the highest wins if a seam ever puts two under it,
  // for the reason the noise layer rounds ties upwards
  let found: AirBand | null = null;
  for (const feature of features) {
    const band = Number(feature.properties?.band);
    if (band >= 1 && band <= 6 && (found === null || band > found)) {
      found = band as AirBand;
    }
  }
  return found;
}

/**
 * Whether the wash is drawn where the map is looking.
 *
 * Three states rather than a boolean, exactly as the noise layer's coverage
 * is, and for the same reason: "nothing here" has two causes and only one is
 * worth telling anybody about. `unknown` means there is nothing to ask yet —
 * no map, no layer, no tiles in — and `uncovered` means the tiles are in and
 * this place is outside them.
 *
 * Read from the rendered tiles, which is a change from reading it from the
 * station snapshot, and the reason is that the two answers are not the same
 * answer. A station within 75 km meant "covered", but what is published is the
 * field clipped to the cities the builder was given, buffered by ten
 * kilometres — so a reader forty kilometres out of town was told the layer
 * covered them, switched it on, and got a blank map. The panel's notice is
 * about whether there is anything to see, so it has to be asked of the thing
 * that draws.
 *
 * This is safe against a reader having the layer switched off, which is the
 * usual objection to querying a rendered layer: the wash is hidden with
 * opacity rather than `visibility`, so its tiles load and its features answer
 * either way.
 */
export type AirCoverage = "covered" | "uncovered" | "unknown";

export function airCoverageAtCenter(): AirCoverage {
  const map = getGlMap();
  if (!map || !TILES_URL) return "unknown";
  if (!map.getLayer(AIR_LAYER_ID)) return "unknown";

  // Under the source's minimum zoom MapLibre asks for no tiles at all, so an
  // empty query says nothing about what is in them
  if (map.getZoom() < MIN_ZOOM) return "unknown";

  let loaded;
  try {
    loaded = map.isSourceLoaded(AIR_SOURCE_ID);
  } catch {
    // Between style loads, which is a moment rather than a state
    return "unknown";
  }
  // A tile still in flight would answer "nothing here" and then change its
  // mind, which is the one thing a notice about coverage must not do
  if (!loaded) return "unknown";

  const canvas = map.getCanvas();
  const centre: [number, number] = [
    canvas.clientWidth / 2,
    canvas.clientHeight / 2,
  ];

  try {
    return map.queryRenderedFeatures(centre, { layers: [AIR_LAYER_ID] }).length > 0
      ? "covered"
      : "uncovered";
  } catch {
    return "unknown";
  }
}
