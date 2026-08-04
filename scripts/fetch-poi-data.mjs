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
 *
 * A full refresh of every city is thousands of Overpass queries and takes
 * many hours. That is deliberate: Overpass is donated infrastructure and the
 * throttle here is the price of using it politely. Use --max-cities to take
 * the work in daily slices instead of one job that outlives its runner.
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
/** Wait between queries. Overpass answers 429 readily, so err on the slow side */
const DELAY_MS = 2500;
const MAX_ATTEMPTS = 4;

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

    const endpoints = [...OVERPASS_API_CONFIG.URLS];
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

      const ageDays = existing.generatedAt
        ? (Date.now() - Date.parse(existing.generatedAt)) / 86400000
        : Infinity;
      if (!force && ageDays < maxAgeDays) {
        console.log(`- ${city.slug}: fresh (${ageDays.toFixed(1)}d old), skipping`);
        continue;
      }
      if (refreshed >= maxCities) {
        console.log(`Reached --max-cities=${maxCities}, leaving the rest for the next run.`);
        break;
      }
      refreshed++;

      console.log(`- ${city.slug}`);
      const radius = cityRadius(city);
      const result = { ...existing.categories };
      let failures = 0;

      /**
       * Written after every category rather than once at the end. A city is
       * twenty slow queries; a run that gets killed two thirds of the way
       * through should keep what it has rather than start over next time.
       *
       * generatedAt is when to consider the city stale again, so a run that
       * lost a query stays stale and the next one picks that category back up.
       */
      const save = async (done) =>
        writeFile(
          file,
          JSON.stringify(
            {
              city: city.slug,
              generatedAt:
                done && failures === 0
                  ? new Date().toISOString()
                  : (existing.generatedAt ?? new Date(0).toISOString()),
              categories: result,
            },
            null,
            2
          ) + "\n"
        );

      for (const categorySeo of categories) {
        const filters = CATEGORY_CONFIG[categorySeo.category]?.filters ?? [];
        if (filters.length === 0) continue;

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
          failures++;
          // Leave the previous numbers in place rather than publishing a zero
          console.error(`    ${categorySeo.slug}: FAILED, keeping previous (${error.message})`);
        }
        await save(false);
        await sleep(DELAY_MS);
      }

      await save(true);
    }

    console.log("Done.");
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
