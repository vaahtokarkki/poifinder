/**
 * Which country the map was looking at when a query went out.
 *
 * One label for a report, worked out in the browser from a world outline rather
 * than asked of anybody. The alternative is a reverse geocoding service, which
 * would mean sending the reader's coordinates to a third party on every pan —
 * exactly the thing the rest of this folder is arranged to avoid, see the note
 * on trackedUrl.
 *
 * Everything here is best effort and nothing waits for it. The outline is a
 * three quarter megabyte file and the map is what people came for, so it is
 * fetched only once the page has finished doing its real work, and a query that
 * happens before it lands is counted without a country instead of held up. That
 * is the whole contract: {@link countryAt} answers or it does not, immediately,
 * and no caller may await anything in here.
 */
import { booleanPointInPolygon } from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";

/**
 * Natural Earth's 1:50m country outlines, as TopoJSON, served from our own
 * origin: a CDN would hand every visitor's IP to a third party for a file that
 * changes once a decade.
 *
 * The version is in the name rather than in a query string, because it is what
 * makes the file cacheable forever. Nothing about it moves when the app is
 * redeployed — a new build is new JavaScript, not new borders — so the copy in
 * the cache below stays good across every update until this name changes, which
 * is the only thing that should ever invalidate it.
 */
const OUTLINES_URL = "/geo/countries-50m.v1.json";

/** Bumped only with the URL above. An old cache is dropped, not revalidated */
const CACHE_NAME = "wayside-geo-v1";

/**
 * A country and the box it fits in.
 *
 * The box is the point of the shape: at 1:50m a country is thousands of
 * coordinates, and testing a point against all of them 240 times per query
 * would be work done on the main thread for a line in a report. Almost every
 * candidate is ruled out by four comparisons.
 */
type Country = {
  name: string;
  outline: Feature<Polygon | MultiPolygon>;
  /** [west, south, east, north] */
  box: [number, number, number, number];
};

let countries: Country[] | null = null;
let loading = false;

const boxOf = (outline: Feature<Polygon | MultiPolygon>): Country["box"] => {
  let west = 180;
  let south = 90;
  let east = -180;
  let north = -90;
  const rings =
    outline.geometry.type === "Polygon"
      ? outline.geometry.coordinates
      : outline.geometry.coordinates.flat();
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      if (lon < west) west = lon;
      if (lon > east) east = lon;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }
  }
  return [west, south, east, north];
};

/**
 * The file, from the browser's cache store if it has been here before.
 *
 * The HTTP cache is not enough on its own: these files are served by
 * Cloudflare's static assets, which sets `max-age=0, must-revalidate` on
 * anything whose name it did not hash itself, so every visit would spend a
 * round trip asking about a file that cannot have changed. The cache store is
 * ours to keep, and what it holds survives a deploy.
 *
 * Everything here is guarded rather than assumed. `caches` needs a secure
 * context, which a phone opening the dev server over a LAN address is not, and
 * a browser with storage turned off throws on open. Either way the answer is
 * the same: fetch it and do not remember it.
 */
const fetchOutlines = async (): Promise<unknown> => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(OUTLINES_URL);
    if (hit) return await hit.json();

    const response = await fetch(OUTLINES_URL);
    if (!response.ok) throw new Error(`${response.status}`);
    // Before reading it, because the body can only be consumed once and the
    // copy is what goes in the cache
    await cache.put(OUTLINES_URL, response.clone());
    return await response.json();
  } catch {
    const response = await fetch(OUTLINES_URL);
    if (!response.ok) throw new Error(`${response.status}`);
    return await response.json();
  }
};

/**
 * Load the outlines, once, and quietly.
 *
 * The decoder is imported here rather than at the top of the file so that it
 * lands in the same lazy chunk as this work instead of in the bundle every page
 * parses before it can draw anything.
 */
const load = async (): Promise<void> => {
  if (countries || loading) return;
  loading = true;
  try {
    const [topology, { feature }] = await Promise.all([
      fetchOutlines(),
      import("topojson-client"),
    ]);

    // The shape of the file, asserted rather than validated: it is our own
    // asset, and a wrong one is a deploy mistake to see in the console
    const topo = topology as Topology<{
      countries: GeometryCollection<{ name?: string }>;
    }>;
    const collection = feature(topo, topo.objects.countries);
    const outlines = collection.features as Feature<
      Polygon | MultiPolygon,
      { name?: string }
    >[];

    countries = outlines
      .filter(outline => outline.properties?.name)
      .map(outline => ({
        name: outline.properties.name as string,
        outline,
        box: boxOf(outline),
      }));
  } catch (error) {
    // Nothing here is worth a notice on the map. The country is a dimension on
    // an event, and events without one are still events
    console.debug("[analytics] Country outlines unavailable", error);
  } finally {
    loading = false;
  }
};

/**
 * Start loading, after the page has finished with everything that matters.
 *
 * Two waits, and both are deliberate: `load` so the file is not competing with
 * the map tiles and the first Overpass query for the connection, and the idle
 * callback so the decoding — which is a megabyte of JSON and a few hundred
 * polygons — happens in a gap rather than in the middle of a pan. The timeout
 * is the promise that a busy page still gets there eventually.
 */
export const warmCountries = (): void => {
  if (typeof window === "undefined") return;

  const start = () => {
    const idle = window.requestIdleCallback;
    if (idle) idle(() => void load(), { timeout: 10_000 });
    else window.setTimeout(() => void load(), 2_000);
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
};

/** The country whose outline contains this exact point, if any */
const containing = (lat: number, lon: number): string | null => {
  if (!countries) return null;
  for (const country of countries) {
    const [west, south, east, north] = country.box;
    if (lon < west || lon > east || lat < south || lat > north) continue;
    if (booleanPointInPolygon([lon, lat], country.outline)) return country.name;
  }
  return null;
};

/**
 * Where to look when the point itself lands in the sea: about 5 km out, then
 * about 15 km, in each direction.
 *
 * A 1:50m coastline is a coastline drawn at 1:50 million, and half the cities
 * worth mapping are on it. Stockholm, Copenhagen, Venice, Lisbon and Manhattan
 * are all in the water on this map — tested, not guessed — and a report that
 * dropped every coastal query would be a report about inland Europe.
 */
const PROBES: readonly [number, number][] = [
  [0.05, 0],
  [-0.05, 0],
  [0, 0.05],
  [0, -0.05],
  [0.15, 0],
  [-0.15, 0],
  [0, 0.15],
  [0, -0.15],
];

/**
 * The country a point is in, or null.
 *
 * Null is a real answer and the caller's cue to send no event: the outlines
 * have not loaded yet, the point is genuinely at sea, or the neighbourhood is
 * ambiguous. Nothing here guesses.
 *
 * When the point itself misses, the probes around it are asked, and they have
 * to agree unanimously — one country found, in any number of directions. Two
 * different answers means a strait or a border, where the map is a few
 * kilometres of coastline away from the truth and Copenhagen would as easily
 * come out Swedish. Nothing is a better answer than a coin toss.
 *
 * Worth knowing about the smallest states: this map does not draw Monaco,
 * Liechtenstein or San Marino at all, so a query there answers with whatever
 * surrounds them. That is the price of the resolution, and it is not a case
 * the probes can tell apart from being just offshore.
 */
export const countryAt = (lat: number, lon: number): string | null => {
  if (!countries) return null;

  const exact = containing(lat, lon);
  if (exact) return exact;

  let found: string | null = null;
  for (const [dlat, dlon] of PROBES) {
    const nearby = containing(lat + dlat, lon + dlon);
    if (!nearby) continue;
    if (found && found !== nearby) return null;
    found = nearby;
  }
  return found;
};
