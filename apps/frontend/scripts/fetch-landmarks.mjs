/**
 * Fetch the sights each city is visited for into data/landmarks.json.
 *
 * Run by hand, rarely. The sights do not move; what does — the toilets and
 * fountains around them — is measured by fetch-poi-data.mjs on every refresh,
 * against this file. See src/seo/landmarks.ts for why any of this exists.
 *
 *   node scripts/fetch-landmarks.mjs                    every city
 *   node scripts/fetch-landmarks.mjs --cities=rome      just one, merged into the file
 *   node scripts/fetch-landmarks.mjs --missing          only the cities the file lacks
 *
 * One Wikidata query per city: everything with a coordinate near the centre
 * that is a kind of sight — an attraction, a museum, a monument, a church, a
 * square — ranked by how many Wikipedia languages have an article on it. That
 * one number puts the Colosseum at 148, St Peter's at 129 and the Trevi
 * Fountain at 68, and a neighbourhood church at 3, which is the order a
 * visitor would put them in and needs no list maintained by hand.
 *
 * Wikidata rather than OpenStreetMap, although the first version asked
 * Overpass. The self hosted instance holds only what the app queries and
 * refuses anything else, and the public mirrors answered this query at one
 * city every ten minutes on a busy day. The ranking came out the same.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "data", "landmarks.json");

const USER_AGENT = "wayside.cc prerender (https://wayside.cc)";
const SPARQL = "https://query.wikidata.org/sparql";
/**
 * Below this a sight is local rather than famous. Turku Cathedral, the best
 * known sight in a city of 200,000, has 40; a suburban church has 3
 */
const MIN_SITELINKS = 20;
/**
 * Two sights closer than this are one stop for a walker, and would get the
 * same answer twice: the Arch of Constantine stands in the Colosseum's
 * shadow. The better known one keeps the row
 */
const MIN_SEPARATION = 300;
/**
 * How far from the centre to look, in kilometres, and never past the city's
 * own radius less a margin. The points are fetched out to that radius, so a
 * sight at its very edge would be measured against half a circle of them and
 * reported further from a toilet than it is
 */
const MAX_SEARCH_KM = 5;
const EDGE_MARGIN_KM = 1;
/**
 * Past these a sight has no middle to measure from. The Berlin Wall and the
 * Defence Line of Amsterdam are both sights with one coordinate somewhere
 * along a hundred kilometres of line, and "the nearest toilet to the Berlin
 * Wall" measured from that point answers nothing. In metres and square
 * metres, which is what Wikidata normalises every unit to
 */
const MAX_EXTENT_M = 2000;
const MAX_AREA_M2 = 2000000;
/** Cities in flight at once. The query service allows five per client */
const CONCURRENCY = 3;
const LANGUAGES = ["en", "fi", "de", "fr", "it", "es"];

/**
 * What counts as a sight, by Wikidata class and everything below it. Not
 * memorials or statues: those are as often tagged with the person they
 * commemorate, and a bust ranks by its subject's fame, not its own
 */
const SIGHT_CLASSES = [
  "Q570116", // tourist attraction
  "Q33506", // museum
  "Q4989906", // monument
  "Q16970", // church building
  "Q2977", // cathedral
  "Q16560", // palace
  "Q23413", // castle
  "Q57821", // fortification
  "Q839954", // archaeological site
  "Q12518", // tower
  "Q483453", // fountain
  "Q174782", // square
  "Q12280", // bridge
  "Q43501", // zoo
];

/**
 * What is never a sight to measure a toilet from, whatever class it also
 * carries. A former city with a coordinate at its centre — Constantinople,
 * Lugdunum, New Amsterdam — ranks on its history and names no place anybody
 * stands at. A concentration camp is a place of remembrance, and "toilets
 * near" it on a list page is not a line this site should write. The rest are
 * things that happen to be classed as towers or attractions: a university,
 * an office block, a football club
 */
const EXCLUDED_CLASSES = [
  "Q486972", // human settlement
  "Q11514315", // historical period
  "Q152081", // concentration camp
  "Q3918", // university
  "Q1021645", // office building
  "Q1244442", // school building
  "Q476028", // association football club
];
/** Single items the classes above do not reach */
const EXCLUDED_ITEMS = [
  "Q862779", // I-35W Mississippi River bridge, famous for its collapse
  "Q2090752", // NTT Docomo Yoyogi Building, a telecoms office classed as a tower
  "Q607743", // Aon Center, Los Angeles, an office skyscraper
];

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  })
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function distanceMeters(fromLat, fromLon, toLat, toLon) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLon = toRad(toLon - fromLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildQuery(lat, lon, radiusKm) {
  return `SELECT DISTINCT ?item ?sl ?coord WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "${radiusKm}" .
  }
  ?item wikibase:sitelinks ?sl . FILTER(?sl >= ${MIN_SITELINKS})
  ?item wdt:P31/wdt:P279* ?class .
  VALUES ?class { ${SIGHT_CLASSES.map((q) => `wd:${q}`).join(" ")} }
  FILTER NOT EXISTS {
    ?item wdt:P31/wdt:P279* ?excluded .
    VALUES ?excluded { ${EXCLUDED_CLASSES.map((q) => `wd:${q}`).join(" ")} }
  }
  FILTER(?item NOT IN (${EXCLUDED_ITEMS.map((q) => `wd:${q}`).join(", ")}))
  FILTER NOT EXISTS {
    ?item p:P2043/psn:P2043/wikibase:quantityAmount ?length . FILTER(?length > ${MAX_EXTENT_M})
  }
  FILTER NOT EXISTS {
    ?item p:P2046/psn:P2046/wikibase:quantityAmount ?area . FILTER(?area > ${MAX_AREA_M2})
  }
} ORDER BY DESC(?sl) LIMIT 40`;
}

async function sparql(query) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${SPARQL}?${new URLSearchParams({ query })}`, {
        headers: { Accept: "application/sparql-results+json", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(90000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} from the query service`);
      return (await response.json()).results.bindings;
    } catch (error) {
      lastError = error;
      console.warn(`    ${error.message}, retrying`);
      await sleep(10000 * attempt);
    }
  }
  throw lastError;
}

/** Names per language for a list of Wikidata ids, fifty to a request */
async function labels(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const url =
      "https://www.wikidata.org/w/api.php?" +
      new URLSearchParams({
        action: "wbgetentities",
        ids: ids.slice(i, i + 50).join("|"),
        props: "labels",
        languages: LANGUAGES.join("|"),
        format: "json",
      });
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) throw new Error(`HTTP ${response.status} from Wikidata`);
    const { entities } = await response.json();
    for (const [id, entity] of Object.entries(entities ?? {})) {
      out.set(
        id,
        Object.fromEntries(Object.entries(entity.labels ?? {}).map(([lang, l]) => [lang, l.value]))
      );
    }
  }
  return out;
}

async function landmarksFor(city, radiusKm, maxLandmarks) {
  const rows = await sparql(buildQuery(city.lat, city.lon, radiusKm));
  const candidates = rows.flatMap((row) => {
    const id = row.item.value.split("/").pop();
    const match = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(row.coord.value);
    if (!match) return [];
    return [{ id, lon: Number(match[1]), lat: Number(match[2]), sitelinks: Number(row.sl.value) }];
  });

  // An item with two coordinates comes back twice; the first is kept
  const kept = [];
  for (const candidate of candidates) {
    if (kept.length >= maxLandmarks) break;
    if (kept.some((other) => other.id === candidate.id)) continue;
    const tooClose = kept.some(
      (other) => distanceMeters(other.lat, other.lon, candidate.lat, candidate.lon) < MIN_SEPARATION
    );
    if (!tooClose) kept.push(candidate);
  }

  const names = await labels(kept.map((l) => l.id));
  return kept.flatMap((landmark) => {
    const byLang = names.get(landmark.id) ?? {};
    const fallback = byLang.en ?? Object.values(byLang)[0];
    // The city's own item, which some centres are tagged as a monument of:
    // "toilets near Espoo" on the Espoo page is not a sight
    if (!fallback || fallback === city.name) return [];
    return [
      {
        id: landmark.id,
        lat: Number(landmark.lat.toFixed(6)),
        lon: Number(landmark.lon.toFixed(6)),
        sitelinks: landmark.sitelinks,
        names: { default: fallback, ...byLang },
      },
    ];
  });
}

async function main() {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const { CITIES, cityRadius } = await server.ssrLoadModule("/src/seo/cities.ts");
    const { MAX_LANDMARKS } = await server.ssrLoadModule("/src/seo/landmarks.ts");

    const existing = existsSync(OUT) ? JSON.parse(await readFile(OUT, "utf8")) : { cities: {} };
    const result = { ...existing.cities };

    // --missing resumes a run that stopped: only the cities the file lacks.
    // Best known cities first either way, so a run that is cut short has
    // spent itself where the visitors are
    const cityFilter = args.get("cities")?.split(",").map((s) => s.trim());
    const missing = args.get("missing") === "true";
    const queue = (cityFilter ? CITIES.filter((c) => cityFilter.includes(c.slug)) : CITIES)
      .filter((c) => !missing || !(c.slug in result))
      .sort((a, b) => a.tier - b.tier);
    if (queue.length === 0) throw new Error("No cities matched");

    /** After every city, so a run that is stopped keeps what it fetched */
    let writing = Promise.resolve();
    const save = () => {
      writing = writing.then(() => {
        const sorted = Object.fromEntries(
          Object.entries(result).sort(([a], [b]) => a.localeCompare(b))
        );
        return writeFile(
          OUT,
          JSON.stringify({ generatedAt: new Date().toISOString(), cities: sorted }, null, 1) + "\n"
        );
      });
      return writing;
    };

    const worker = async () => {
      for (let city = queue.shift(); city; city = queue.shift()) {
        try {
          const radiusKm = Math.min(MAX_SEARCH_KM, cityRadius(city) / 1000 - EDGE_MARGIN_KM);
          const landmarks = await landmarksFor(city, radiusKm, MAX_LANDMARKS);
          result[city.slug] = landmarks;
          console.log(`- ${city.slug}: ${landmarks.map((l) => l.names.default).join(", ") || "none"}`);
        } catch (error) {
          // Keep what the city had rather than writing it empty
          console.error(`- ${city.slug}: FAILED, keeping previous (${error.message})`);
        }
        await save();
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log(`Wrote ${OUT}`);
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
