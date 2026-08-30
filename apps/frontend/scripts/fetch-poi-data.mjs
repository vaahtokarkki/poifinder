/**
 * Refresh the OpenStreetMap extract the prerendered pages are built from.
 *
 * This is a background job, not part of `npm run build`. It writes one JSON
 * file per city into data/poi/, which is committed, so that a build is
 * deterministic and never depends on Overpass being up. Run it on a schedule
 * (weekly is plenty, OSM does not move faster than that for these categories).
 *
 *   node scripts/fetch-poi-data.mjs                       refresh stale cities
 *   node scripts/fetch-poi-data.mjs --cities=helsinki     just one city
 *   node scripts/fetch-poi-data.mjs --force               ignore freshness
 *   node scripts/fetch-poi-data.mjs --max-age-days=14     what counts as stale
 *   node scripts/fetch-poi-data.mjs --max-cities=20       stop after 20 cities
 *   node scripts/fetch-poi-data.mjs --deadline-minutes=240  stop after 4 hours
 *
 * A full refresh of every city is thousands of Overpass queries and takes
 * many hours. That is deliberate: Overpass is donated infrastructure and the
 * throttle here is the price of using it politely. Use --max-cities to take
 * the work in daily slices instead of one job that outlives its runner.
 *
 * Set OVERPASS_API_URL to a self hosted instance (see apps/overpass) and none
 * of that applies: the queries go there alone, at speed, and a whole refresh
 * is minutes rather than days.
 *
 * One caveat if you do. Categories with `enclosedBy` ask a second query for
 * the named place around each unnamed point, and the self hosted database is
 * built from a tag filter that keeps points of interest and the buildings
 * around them — see apps/overpass/osmium-filter.txt and bin/join-buildings.
 * Buildings are therefore there and parks are not, so `enclosedBy: ["area"]`
 * comes back empty against our own server and full against the public mirrors.
 * Until the import keeps named areas too, run the refresh for the outdoor
 * categories without OVERPASS_API_URL set.
 *
 * `placedByStreet` used to be in the same position and is not any more. The
 * import now keeps every named highway — see WAYSIDE_JOIN_STREETS in
 * apps/overpass/bin/filter-osm-extract — so the street lookup answers from the
 * self hosted instance as well as from the mirrors. It is the enclosing *area*
 * that is still missing, and only that.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT, "data", "poi");

/** Points stored per city and category. The page lists at most 25 */
const MAX_STORED_POIS = 30;
/**
 * How many unnamed points are offered to the enclosing place lookup.
 *
 * The nearest ones to the city centre, because that is the order the list is
 * built in and a point that will never be reached is not worth a containment
 * test. Around a third of them come back placed, so eighty candidates is
 * comfortably more than the thirty rows a city can store — and it is what
 * bounds the id list in the query below to something an Overpass GET can hold.
 */
const CONTEXT_CANDIDATES = 80;
/**
 * How far from a point to look for the place that contains it, in metres.
 *
 * Two numbers because Overpass measures `around` from a way's own line
 * segments rather than from the area it encloses. A building is small enough
 * that anything inside it is metres from a wall. A park is not: a fountain in
 * the middle of Helsinki's central park is several hundred metres from the
 * nearest edge of it, and at 30 m it would come back standing in nothing.
 *
 * Both are upper bounds on the search, not on the answer — what is actually
 * inside is decided by the containment test here, so a wider radius costs
 * payload rather than accuracy
 */
const BUILDING_RADIUS = 30;
const AREA_RADIUS = 600;
/**
 * How far from a point to look for the street it stands on, in metres.
 *
 * Unlike the two above this one bounds the answer as well as the search: there
 * is no containment test to fall back on, so whatever named way is nearest
 * within this distance is the one that names the row.
 *
 * 30 m is a kerb plus a wide carriageway. Wider starts naming points by the
 * parallel street behind them, which is worse than saying nothing; narrower
 * loses the post box on the far side of a boulevard, which is a real one. On a
 * corner the nearest way wins, and either answer is true.
 */
const STREET_RADIUS = 30;
/**
 * The open air places worth being told you are standing in.
 *
 * Kept to the ones a person would name to a friend — a park, a garden, the
 * grounds of something — rather than every polygon a point can fall inside.
 * `landuse=residential` covers half a city and would place a picnic table in
 * "Töölö", which is a district rather than a place you can walk to
 */
const AREA_VALUES = [
  "park",
  "garden",
  "recreation_ground",
  "village_green",
  "common",
  "nature_reserve",
  "dog_park",
  "cemetery",
  "allotments",
];
/**
 * Overpass query timeout, in seconds.
 *
 * Has to stay at or below OVERPASS_TIME on our own instance, which is the
 * dispatcher's --time and the ceiling on how long any one query may run: a
 * query asking for more time than the server allows is refused rather than
 * clamped. The two are set to the same number in
 * apps/overpass/docker-compose.prod.yml; raise them together.
 *
 * 60 rather than the 180 this used to be because nothing here comes close.
 * Across five days of access logs the slowest query of any kind answered in
 * 4.0 s and the 99th percentile in 1.4 s, so this is fifteen times the worst
 * case, and the public mirrors — which is what this run mostly talks to — are
 * bound by their own limits long before it.
 */
const QUERY_TIMEOUT = 60;
/**
 * Give the server its full timeout plus room to send the body back, then give
 * up. Without this a mirror that accepts the connection and goes quiet stalls
 * the whole run with nothing in the log to say so
 */
const REQUEST_TIMEOUT_MS = (QUERY_TIMEOUT + 60) * 1000;
/** A self hosted interpreter, e.g. http://localhost:12345/api/interpreter */
const SELF_HOSTED_URL = process.env.OVERPASS_API_URL?.trim();
/**
 * Wait between queries. Overpass answers 429 readily, so err on the slow side.
 * Our own instance has no such limit, and its data has no other user to be
 * polite to, so it gets the queries as fast as it can answer them
 */
const DELAY_MS = SELF_HOSTED_URL ? 100 : 2500;
/** One retry against our own server, four across four donated mirrors */
const MAX_ATTEMPTS = SELF_HOSTED_URL ? 2 : 4;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  })
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Great circle distance in metres, to sort a city's points from its centre */
function distanceMeters(fromLat, fromLon, toLat, toLon) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLon = toRad(toLon - fromLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildQuery(filters, lat, lon, radius) {
  const blocks = filters
    .map((filter) => `  nwr${filter}(around:${radius},${lat},${lon});`)
    .join("\n");
  return `[out:json][timeout:${QUERY_TIMEOUT}];\n(\n${blocks}\n);\nout tags center;`;
}

/**
 * Where the next query starts its rotation. Starting every query at the first
 * mirror sends the whole run at one machine and earns a 429 for it
 */
let endpointCursor = 0;

async function runQuery(query, endpoints) {
  let lastError;
  const start = endpointCursor++;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Move on across attempts too, a busy mirror is usually busy for a while
    const endpoint = endpoints[(start + attempt - 1) % endpoints.length];
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: query,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "Content-Type": "text/plain",
          // Overpass asks that automated clients identify themselves
          "User-Agent": "wayside.cc prerender (https://wayside.cc)",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${endpoint}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      // 429 and 504 are the normal Overpass answers to load, back off properly
      const backoff = DELAY_MS * 4 * attempt;
      console.warn(`    attempt ${attempt} failed (${error.message}), waiting ${backoff}ms`);
      if (attempt < MAX_ATTEMPTS) await sleep(backoff);
    }
  }
  throw lastError;
}

/**
 * Turn Overpass elements into candidate rows, nearest the city centre first.
 *
 * Every point, named or not. The unnamed ones used to be dropped here, which
 * is what made a page of toilets a list of the 33 that happen to carry a name
 * and nothing about the other 246; they are kept now so the enclosing place
 * lookup below has something to place. Whether a row survives to be stored is
 * decided in selectPois, once it is known which of them a building or a park
 * can name.
 */
function toCandidates(elements, city) {
  return elements
    .map((element) => {
      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;
      if (typeof lat !== "number" || typeof lon !== "number") return null;
      const tags = element.tags ?? {};
      const name = typeof tags.name === "string" ? tags.name.trim() : "";

      const street = tags["addr:street"];
      const houseNumber = tags["addr:housenumber"];
      const address = street ? [street, houseNumber].filter(Boolean).join(" ") : undefined;

      return {
        id: `${element.type}/${element.id}`,
        ...(name ? { name } : {}),
        lat: Number(lat.toFixed(6)),
        lon: Number(lon.toFixed(6)),
        ...(address ? { address } : {}),
        ...(tags.opening_hours ? { openingHours: tags.opening_hours } : {}),
        ...(tags.wheelchair ? { wheelchair: tags.wheelchair } : {}),
        ...(tags.fee ? { fee: tags.fee } : {}),
        // Only a node can stand inside something. A playground drawn as a way
        // is already an outline of its own, and asking which building contains
        // it is asking the wrong question
        _node: element.type === "node" ? element.id : null,
        _distance: distanceMeters(city.lat, city.lon, lat, lon),
      };
    })
    .filter(Boolean)
    // Central points first: they are what a search for the city is asking about
    .sort((a, b) => a._distance - b._distance);
}

/**
 * The rows worth storing, one per distinct identity.
 *
 * A row earns its place by being tellable from the others: a name of its own,
 * or the name of the place it stands in. Twenty five rows reading "Public
 * toilet" help nobody, and neither do nine reading "Picnic spot in Helsingin
 * keskuspuisto" — so the park names one row and the map has the rest. What is
 * left is also exactly what MIN_NAMED_POIS_FOR_PAGE is counting when it
 * decides whether the page is substantive enough to index.
 *
 * Identity is the proper noun, whichever field it came from. A place names one
 * row whether the point carries its name or merely stands in it.
 */
function selectPois(candidates) {
  const seen = new Set();
  const pois = [];
  for (const candidate of candidates) {
    // One namespace for both, so a toilet mapped as "Stockmann" and a toilet
    // standing inside the Stockmann building are one row rather than two ways
    // of saying the same shop. Whichever is nearer the centre wins, which is
    // the order the candidates already arrive in
    const identity = candidate.name ?? candidate.context ?? candidate.street;
    const key = identity ? identity.toLowerCase() : null;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const { _distance, _node, ...poi } = candidate;
    pois.push(poi);
    if (pois.length >= MAX_STORED_POIS) break;
  }
  return pois;
}

/* ------------------------------------------------------------------------ *
 * The place a point stands in
 *
 * A toilet in a shopping centre is a node with `amenity=toilets` on it and
 * nothing else. Everything that would let somebody find it — that it is in
 * Tennispalatsi — is on the building around it, which is a separate object.
 * The same is true outdoors, where the object is a park rather than a
 * building.
 *
 * So the point is tested against the outlines of the named places near it, and
 * the smallest one that contains it names the row. Nothing is written back to
 * OpenStreetMap and nothing is written onto the point: the name stays the
 * building's, in a field of its own, and the page says "in" rather than
 * pretending the toilet is called Tennispalatsi. See PoiEntry in
 * src/seo/pageData.ts.
 *
 * The same rule, the same smallest-wins tie break and the same ray casting
 * live in two other places: apps/overpass/bin/join-buildings, which decides
 * which buildings the self hosted database keeps, and fetchEnclosingBuilding
 * in src/api/overpass.ts, which asks the question live when a popup opens.
 * Three copies is two too many, but they run in three languages against three
 * shapes of input, and the rule they share is twenty lines
 * ------------------------------------------------------------------------ */

/** The query that asks what the given nodes are standing inside */
function buildContainerQuery(nodeIds, kinds) {
  const clauses = [];
  if (kinds.includes("building")) {
    clauses.push(`  wr[building][name](around.points:${BUILDING_RADIUS});`);
  }
  if (kinds.includes("area")) {
    clauses.push(
      `  wr[name][~"^(leisure|landuse)$"~"^(${AREA_VALUES.join("|")})$"]` +
        `(around.points:${AREA_RADIUS});`
    );
  }
  // By id rather than by repeating the category filter: the points are already
  // in hand, and naming them is both smaller to send and immune to the two
  // queries disagreeing about what the category matched
  return (
    `[out:json][timeout:${QUERY_TIMEOUT}];\n` +
    `node(id:${nodeIds.join(",")})->.points;\n` +
    `(\n${clauses.join("\n")}\n);\nout geom;`
  );
}

const isClosed = (ring) =>
  ring.length > 3 &&
  ring[0][0] === ring[ring.length - 1][0] &&
  ring[0][1] === ring[ring.length - 1][1];

/**
 * Join a relation's ways end to end into the rings they make.
 *
 * A multipolygon hands over the ways its contributors happened to split the
 * outline into, in no order and in either direction. Take one, keep appending
 * whatever still touches an end, stop when it closes or nothing fits.
 */
function stitchWays(ways) {
  const remaining = ways.filter((way) => way.length > 1);
  const rings = [];
  while (remaining.length > 0) {
    let chain = remaining.pop();
    let joined = true;
    while (joined && !isClosed(chain)) {
      joined = false;
      for (let i = 0; i < remaining.length; i++) {
        const way = remaining[i];
        const [head, tail] = [chain[0], chain[chain.length - 1]];
        const same = (a, b) => a[0] === b[0] && a[1] === b[1];
        // The shared node belongs to both ways, so one copy of it is dropped
        if (same(tail, way[0])) chain = chain.concat(way.slice(1));
        else if (same(tail, way[way.length - 1]))
          chain = chain.concat([...way].reverse().slice(1));
        else if (same(head, way[way.length - 1])) chain = way.slice(0, -1).concat(chain);
        else if (same(head, way[0])) chain = [...way].reverse().slice(0, -1).concat(chain);
        else continue;
        remaining.splice(i, 1);
        joined = true;
        break;
      }
    }
    if (isClosed(chain)) rings.push(chain);
  }
  return rings;
}

/** The closed outer rings of one way or relation, as [lon, lat] pairs */
function ringsOf(element) {
  if (element.type === "way" && element.geometry) {
    const ring = element.geometry.filter((p) => p).map((p) => [p.lon, p.lat]);
    return isClosed(ring) ? [ring] : [];
  }
  if (element.type === "relation" && element.members) {
    // Outer rings only. A hole is a courtyard, and a point in one is standing
    // outside the building — but it is also standing in whatever contains the
    // building, which is the answer we would have given anyway
    return stitchWays(
      element.members
        .filter(
          (member) =>
            member.type === "way" &&
            member.geometry &&
            (member.role || "outer") === "outer"
        )
        .map((member) => member.geometry.filter((p) => p).map((p) => [p.lon, p.lat]))
    );
  }
  return [];
}

/** Whether a point is inside a ring, by the usual ray crossing count */
function ringContains(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lonI, latI] = ring[i];
    const [lonJ, latJ] = ring[j];
    if (latI > lat !== latJ > lat && lon < ((lonJ - lonI) * (lat - latI)) / (latJ - latI) + lonI) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * The shoelace area of a ring, in square degrees.
 *
 * Not an area anybody would quote, and it does not have to be: it only ever
 * compares two places that contain the same point, where the smaller is the
 * more specific answer — the shop unit rather than the shopping centre, the
 * building rather than the park it stands in. No conversion would change which
 * of them is smaller.
 */
function ringArea(ring) {
  let doubled = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    doubled += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(doubled) / 2;
}

/**
 * Write onto each point the name of the smallest named place containing it.
 *
 * Mutates the candidates, which is what the caller wants: they are already
 * sorted, and the alternative is threading a second list through selectPois to
 * say the same thing.
 */
function placeCandidates(candidates, elements) {
  const places = [];
  for (const element of elements) {
    const name = typeof element.tags?.name === "string" ? element.tags.name.trim() : "";
    // `building=no` is a mapper saying "the thing you would take for a
    // building here is not one". The import applies the same rule — see
    // NOT_A_BUILDING in apps/overpass/bin/join-buildings
    if (!name || element.tags?.building === "no") continue;
    const rings = ringsOf(element);
    if (rings.length === 0) continue;
    places.push({ name, rings, area: rings.reduce((total, ring) => total + ringArea(ring), 0) });
  }

  let placed = 0;
  for (const candidate of candidates) {
    let best = null;
    for (const place of places) {
      if (best && place.area >= best.area) continue;
      if (!place.rings.some((ring) => ringContains(ring, candidate.lon, candidate.lat))) continue;
      best = place;
    }
    if (best) {
      candidate.context = best.name;
      placed++;
    }
  }
  return placed;
}

/* ------------------------------------------------------------------------ *
 * The street a point stands on
 *
 * What is left after the containment test has had its turn. A post box is
 * inside nothing, so `placeCandidates` above can say nothing about it, and a
 * page of them is twenty five rows reading "Post box" — which is the thin
 * content MIN_NAMED_POIS_FOR_PAGE exists to keep out of the index, and it
 * kept post boxes out of 113 of the 148 cities that have plenty of them.
 *
 * A street is the object that places street furniture, and it is beside the
 * point rather than around it, so the geometry is distance to a line rather
 * than a ray cast through a ring. Otherwise the rule is the one used
 * everywhere else here: the nearest named way wins, the name stays the
 * street's in a field of its own, and the page says "on".
 * ------------------------------------------------------------------------ */

/** The query that asks which named streets run past the given nodes */
function buildStreetQuery(nodeIds) {
  return (
    `[out:json][timeout:${QUERY_TIMEOUT}];\n` +
    `node(id:${nodeIds.join(",")})->.points;\n` +
    // Motorways carry no post boxes and no bus shelters, and their slip roads
    // are the one class of named way that can run within 30 m of a point that
    // belongs to the ordinary street beside it
    `way[highway][name][highway!~"^(motorway|trunk|motorway_link|trunk_link)$"]` +
    `(around.points:${STREET_RADIUS});\n` +
    `out geom;`
  );
}

/**
 * Metres from a point to a line segment.
 *
 * Equirectangular, with longitude scaled by the cosine of the latitude. Over
 * the tens of metres this is ever asked about the error is far below the
 * precision of the answer, and the alternative — a great circle distance to a
 * segment — is a great deal of arithmetic to pick the same street.
 */
function segmentDistanceMeters(lat, lon, aLat, aLon, bLat, bLon) {
  const perDegLat = 111320;
  const perDegLon = 111320 * Math.cos((lat * Math.PI) / 180);
  const px = (lon - aLon) * perDegLon;
  const py = (lat - aLat) * perDegLat;
  const vx = (bLon - aLon) * perDegLon;
  const vy = (bLat - aLat) * perDegLat;
  const lengthSquared = vx * vx + vy * vy;
  // A degenerate segment is a point, and the projection below would divide by
  // zero rather than fall back to it
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (px * vx + py * vy) / lengthSquared));
  return Math.hypot(px - t * vx, py - t * vy);
}

/**
 * Write onto each still unplaced point the name of the nearest named street.
 *
 * Mutates the candidates, as placeCandidates does and for the same reason. A
 * point the containment test already named is left alone: a bus shelter inside
 * a park is better described by the park than by the road outside it, which is
 * why this runs second rather than instead.
 */
function streetCandidates(candidates, elements) {
  const streets = [];
  for (const element of elements) {
    const name = typeof element.tags?.name === "string" ? element.tags.name.trim() : "";
    if (!name || !element.geometry) continue;
    const points = element.geometry.filter((point) => point);
    if (points.length < 2) continue;
    streets.push({ name, points });
  }

  let placed = 0;
  for (const candidate of candidates) {
    if (candidate.context) continue;
    let best = null;
    for (const street of streets) {
      for (let i = 1; i < street.points.length; i++) {
        const distance = segmentDistanceMeters(
          candidate.lat,
          candidate.lon,
          street.points[i - 1].lat,
          street.points[i - 1].lon,
          street.points[i].lat,
          street.points[i].lon
        );
        if (distance > STREET_RADIUS) continue;
        if (!best || distance < best.distance) best = { name: street.name, distance };
      }
    }
    if (best) {
      candidate.street = best.name;
      placed++;
    }
  }
  return placed;
}

/**
 * How stale a city is, in days: the age of its *least* recently refreshed
 * category, and Infinity when any is missing altogether.
 *
 * A single city level timestamp cannot express this. A run where one query
 * failed would still stamp the city as refreshed, the next run would see a
 * fresh city and skip it, and the category that failed would never be picked
 * up again. Asking the categories themselves makes a partial run naturally
 * retry only what it lost.
 */
function staleness(existing, categories) {
  let oldest = 0;
  for (const categorySeo of categories) {
    const entry = existing.categories?.[categorySeo.slug];
    const stamp = entry?.updatedAt ?? (entry ? existing.generatedAt : null);
    if (!stamp) return Infinity;
    oldest = Math.max(oldest, (Date.now() - Date.parse(stamp)) / 86400000);
  }
  return oldest;
}

async function main() {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    logLevel: "error",
  });

  try {
    const { CITIES, cityRadius } = await server.ssrLoadModule("/src/seo/cities.ts");
    const { CATEGORY_SEO } = await server.ssrLoadModule("/src/seo/categories.ts");
    const { CATEGORY_CONFIG, OVERPASS_API_CONFIG } = await server.ssrLoadModule(
      "/src/constants.ts"
    );

    const endpoints = SELF_HOSTED_URL ? [SELF_HOSTED_URL] : [...OVERPASS_API_CONFIG.URLS];
    if (SELF_HOSTED_URL) console.log(`Using self hosted Overpass at ${SELF_HOSTED_URL}`);
    const force = args.get("force") === "true";
    const maxAgeDays = Number(args.get("max-age-days") ?? 7);
    const cityFilter = args.get("cities")?.split(",").map((s) => s.trim());
    const categoryFilter = args.get("categories")?.split(",").map((s) => s.trim());

    const cities = cityFilter ? CITIES.filter((c) => cityFilter.includes(c.slug)) : CITIES;
    const categories = categoryFilter
      ? CATEGORY_SEO.filter((c) => categoryFilter.includes(c.slug))
      : CATEGORY_SEO;

    if (cities.length === 0) throw new Error("No cities matched --cities");
    await mkdir(DATA_DIR, { recursive: true });

    const maxCities = Number(args.get("max-cities") ?? Infinity);
    let refreshed = 0;

    /**
     * When to stop asking for more and let the caller have its exit code.
     *
     * The runner kills the job at `timeout-minutes` and marks it cancelled,
     * which skips every remaining step — including the one that commits. Eight
     * scheduled runs in a row spent five hours each querying Overpass and threw
     * all of it away on the way out, because a cancelled job never reached
     * `git commit`. The queries were not the problem; stopping was.
     *
     * So the run stops itself, a good margin inside the runner's patience, and
     * exits normally with whatever it managed to fetch. Everything is already
     * on disk — see `save` below, which writes after every single category.
     */
    const deadlineMinutes = Number(args.get("deadline-minutes") ?? Infinity);
    const deadline = Number.isFinite(deadlineMinutes)
      ? Date.now() + deadlineMinutes * 60000
      : Infinity;
    const outOfTime = () => Date.now() >= deadline;
    let stoppedEarly = false;

    console.log(
      `Refreshing ${cities.length} cities x ${categories.length} categories ` +
        `(${cities.length * categories.length} queries, ~${Math.round(
          (cities.length * categories.length * DELAY_MS) / 60000
        )} min at best)`
    );

    for (const city of cities) {
      const file = path.join(DATA_DIR, `${city.slug}.json`);
      /** Keep whatever we already have: a failed query must never delete data */
      let existing = { generatedAt: null, categories: {} };
      if (existsSync(file)) {
        existing = JSON.parse(await readFile(file, "utf8"));
      }

      const ageDays = staleness(existing, categories);
      if (!force && ageDays < maxAgeDays) {
        console.log(`- ${city.slug}: fresh (${ageDays.toFixed(1)}d old), skipping`);
        continue;
      }
      if (refreshed >= maxCities) {
        console.log(`Reached --max-cities=${maxCities}, leaving the rest for the next run.`);
        break;
      }
      if (outOfTime()) {
        console.log(
          `Out of time after ${refreshed} cities, leaving the rest for the next run.`
        );
        stoppedEarly = true;
        break;
      }
      refreshed++;

      console.log(`- ${city.slug}`);
      const radius = cityRadius(city);
      const result = { ...existing.categories };

      /**
       * Written after every category rather than once at the end. A city is
       * twenty slow queries; a run that gets killed two thirds of the way
       * through should keep what it has rather than start over next time.
       *
       * generatedAt records when a run last touched the city. It is not what
       * decides staleness, see staleness() for why.
       */
      const save = async () =>
        writeFile(
          file,
          JSON.stringify(
            { city: city.slug, generatedAt: new Date().toISOString(), categories: result },
            null,
            2
          ) + "\n"
        );

      for (const categorySeo of categories) {
        const filters = CATEGORY_CONFIG[categorySeo.category]?.filters ?? [];
        if (filters.length === 0) continue;

        // The city being stale does not make every category stale. When one
        // query failed last time, retrying it should cost one query, not
        // twenty, so ask each category for its own age
        if (!force && staleness(existing, [categorySeo]) < maxAgeDays) {
          console.log(`    ${categorySeo.slug}: still fresh, skipping`);
          continue;
        }

        // Mid city too, not only between cities. One city is twenty odd queries
        // and against the public mirrors that can be hours, which is long
        // enough to overrun the deadline several times over
        if (outOfTime()) {
          console.log(`    out of time, leaving the rest of ${city.slug} for the next run`);
          stoppedEarly = true;
          break;
        }

        try {
          const data = await runQuery(buildQuery(filters, city.lat, city.lon, radius), endpoints);
          const elements = data.elements ?? [];
          const candidates = toCandidates(elements, city);

          // The second query, for the categories whose points mostly carry no
          // name of their own. It is skipped when there is nothing to place —
          // a city whose toilets are all named needs no buildings — so the
          // cost is one extra query on the pages it actually changes
          let placed = 0;
          const unplaced = categorySeo.enclosedBy?.length
            ? candidates.filter((c) => !c.name && c._node).slice(0, CONTEXT_CANDIDATES)
            : [];
          if (unplaced.length > 0) {
            try {
              const containers = await runQuery(
                buildContainerQuery(
                  unplaced.map((c) => c._node),
                  categorySeo.enclosedBy
                ),
                endpoints
              );
              placed = placeCandidates(unplaced, containers.elements ?? []);
            } catch (error) {
              // A page of named points only is the behaviour this category had
              // before the lookup existed, so a failure here costs rows rather
              // than the category
              console.warn(`    ${categorySeo.slug}: no enclosing places (${error.message})`);
            }
            await sleep(DELAY_MS);
          }

          // And the third query, for the street furniture the containment test
          // cannot help. Same shape as the one above: skipped when there is
          // nothing left to place, and a failure costs rows rather than the
          // category. Only the points still unnamed after the enclosing place
          // lookup are offered, so a shelter already placed in a park is not
          // paid for twice
          const unstreeted = categorySeo.placedByStreet
            ? candidates
                .filter((c) => !c.name && !c.context && c._node)
                .slice(0, CONTEXT_CANDIDATES)
            : [];
          if (unstreeted.length > 0) {
            try {
              const streets = await runQuery(
                buildStreetQuery(unstreeted.map((c) => c._node)),
                endpoints
              );
              placed += streetCandidates(unstreeted, streets.elements ?? []);
            } catch (error) {
              console.warn(`    ${categorySeo.slug}: no streets (${error.message})`);
            }
            await sleep(DELAY_MS);
          }

          const pois = selectPois(candidates);
          result[categorySeo.slug] = {
            count: elements.length,
            pois,
            // Per category, not per city: when one query fails and the rest
            // succeed, only the ones that succeeded may claim to be current
            updatedAt: new Date().toISOString(),
          };
          console.log(
            `    ${categorySeo.slug}: ${elements.length}` +
              ` (${pois.length} listed${placed > 0 ? `, ${placed} placed by surroundings` : ""})`
          );
        } catch (error) {
          // Leave the previous numbers in place rather than publishing a zero
          console.error(`    ${categorySeo.slug}: FAILED, keeping previous (${error.message})`);
        }
        await save();
        await sleep(DELAY_MS);
      }

      await save();
    }

    console.log(
      stoppedEarly
        ? `Stopped on the ${deadlineMinutes} minute deadline. Everything fetched is on ` +
            `disk and committed; the next run picks up where this one stopped.`
        : "Done."
    );
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
