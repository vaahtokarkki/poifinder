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
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT, "data", "poi");

/** Points stored per city and category. The page lists at most 25 */
const MAX_STORED_POIS = 30;
/** Overpass query timeout, in seconds */
const QUERY_TIMEOUT = 180;
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

/** Turn Overpass elements into the compact shape a page needs */
function toPois(elements, city) {
  const seenNames = new Set();
  return elements
    .map((element) => {
      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;
      if (typeof lat !== "number" || typeof lon !== "number") return null;
      const tags = element.tags ?? {};
      const name = typeof tags.name === "string" ? tags.name.trim() : "";
      if (!name) return null;

      const street = tags["addr:street"];
      const houseNumber = tags["addr:housenumber"];
      const address = street ? [street, houseNumber].filter(Boolean).join(" ") : undefined;

      return {
        id: `${element.type}/${element.id}`,
        name,
        lat: Number(lat.toFixed(6)),
        lon: Number(lon.toFixed(6)),
        ...(address ? { address } : {}),
        ...(tags.opening_hours ? { openingHours: tags.opening_hours } : {}),
        ...(tags.wheelchair ? { wheelchair: tags.wheelchair } : {}),
        ...(tags.fee ? { fee: tags.fee } : {}),
        _distance: distanceMeters(city.lat, city.lon, lat, lon),
      };
    })
    .filter(Boolean)
    // Central points first: they are what a search for the city is asking about
    .sort((a, b) => a._distance - b._distance)
    // A list of twenty five identical "Public toilet" rows helps nobody
    .filter((poi) => {
      const key = poi.name.toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    })
    .slice(0, MAX_STORED_POIS)
    .map(({ _distance, ...poi }) => poi);
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
          result[categorySeo.slug] = {
            count: elements.length,
            pois: toPois(elements, city),
            // Per category, not per city: when one query fails and the rest
            // succeed, only the ones that succeeded may claim to be current
            updatedAt: new Date().toISOString(),
          };
          console.log(`    ${categorySeo.slug}: ${elements.length}`);
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
