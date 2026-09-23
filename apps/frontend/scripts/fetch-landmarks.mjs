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
 * Candidates come from OpenStreetMap: anything tagged as an attraction, a
 * museum, a historic building or a cathedral that also carries a Wikidata id.
 * Fame comes from Wikidata: the number of Wikipedia languages with an article
 * on it. That one number puts the Colosseum at 143, St Peter's at 127 and the
 * Trevi Fountain at 66, and a neighbourhood church at 3 — which is the order a
 * visitor would put them in, and needs no list maintained by hand.
 *
 * Always against the public mirrors. The self hosted instance holds only what
 * the app queries and refuses anything else, and this is one query per city.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "data", "landmarks.json");

const USER_AGENT = "wayside.cc prerender (https://wayside.cc)";
const DELAY_MS = 2500;
/**
 * Below this a sight is local rather than famous. Turku Cathedral, the
 * best known sight in a city of 200,000, has 40; a suburban church has 3
 */
const MIN_SITELINKS = 20;
/**
 * Two sights closer than this are one stop for a walker, and would get the
 * same answer twice: the Arch of Constantine stands in the Colosseum's
 * shadow. The better known one keeps the row
 */
const MIN_SEPARATION = 300;
/**
 * How far inside the city radius a sight must be. The points are fetched out
 * to the radius, so a sight at the very edge would be measured against half
 * a circle of them and reported further from a toilet than it is
 */
const EDGE_MARGIN = 1000;
/**
 * The search stops here even in a city whose points reach further. Sights
 * cluster in the centre, and the query is the one this script waits on: at
 * the full eight kilometres the public mirrors spent two minutes a city on it
 */
const MAX_SEARCH_RADIUS = 5000;
const LANGUAGES = ["en", "fi", "de", "fr", "it", "es"];
/** Read from src/seo/landmarks.ts on start, so the page and the file agree */
let MAX_LANDMARKS = 6;

const TOURISM = "attraction|museum|gallery|zoo|aquarium|theme_park|viewpoint";
/**
 * Not memorial. A memorial's wikidata tag names the person it commemorates
 * as often as the memorial itself, and Rome's top candidate after the
 * Colosseum was a bust of a Georgian poet ranked by the poet's fame
 */
const HISTORIC = "monument|castle|ruins|archaeological_site|palace|fort|city_gate|church|cathedral|tower";
const BUILDING = "cathedral|basilica";

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

function buildQuery(lat, lon, radius) {
  const around = `(around:${radius},${lat},${lon})`;
  return `[out:json][timeout:90];
(
  nwr[wikidata][tourism~"^(${TOURISM})$"]${around};
  nwr[wikidata][historic~"^(${HISTORIC})$"]${around};
  nwr[wikidata][building~"^(${BUILDING})$"]${around};
);
out tags center;`;
}

let endpointCursor = 0;
async function overpass(query, endpoints) {
  let lastError;
  // Every mirror twice over: a 429 or a 504 is load, and load passes
  for (let attempt = 0; attempt < endpoints.length * 2; attempt++) {
    const endpoint = endpoints[(endpointCursor + attempt) % endpoints.length];
    if (attempt === endpoints.length) await sleep(30000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(100000),
        headers: { "User-Agent": USER_AGENT },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} from ${endpoint}`);
      endpointCursor++;
      return await response.json();
    } catch (error) {
      lastError = error;
      console.warn(`    ${error.message}, trying the next mirror`);
      await sleep(DELAY_MS * 2);
    }
  }
  throw lastError;
}

/** Sitelink counts and labels for a list of Wikidata ids, fifty to a request */
async function wikidata(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const url =
      "https://www.wikidata.org/w/api.php?" +
      new URLSearchParams({
        action: "wbgetentities",
        ids: ids.slice(i, i + 50).join("|"),
        props: "sitelinks|labels",
        languages: LANGUAGES.join("|"),
        format: "json",
      });
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) throw new Error(`HTTP ${response.status} from Wikidata`);
    const { entities } = await response.json();
    for (const [id, entity] of Object.entries(entities ?? {})) {
      if (entity.missing !== undefined) continue;
      // Wikipedias only: Commons, Wikivoyage and the rest are not a measure
      // of how many people have heard of a thing
      const sitelinks = Object.keys(entity.sitelinks ?? {}).filter(
        (site) => /wiki$/.test(site) && !["commonswiki", "specieswiki", "metawiki"].includes(site)
      ).length;
      const labels = Object.fromEntries(
        Object.entries(entity.labels ?? {}).map(([lang, label]) => [lang, label.value])
      );
      out.set(id, { sitelinks, labels });
    }
    await sleep(500);
  }
  return out;
}

async function landmarksFor(city, radius, endpoints) {
  const data = await overpass(buildQuery(city.lat, city.lon, radius), endpoints);
  const byId = new Map();
  for (const element of data.elements ?? []) {
    const tags = element.tags ?? {};
    const id = tags.wikidata?.trim();
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (!/^Q\d+$/.test(id ?? "") || typeof lat !== "number" || !tags.name) continue;
    // The city's own wikidata on some monument or boundary stone: "toilets
    // near Espoo" on the Espoo page is not a sight
    if (tags.name === city.name) continue;
    if (distanceMeters(city.lat, city.lon, lat, lon) > radius - EDGE_MARGIN) continue;
    // A sight drawn as a way and as a relation both: keep the first
    if (!byId.has(id)) byId.set(id, { id, lat, lon, tags });
  }
  const facts = await wikidata([...byId.keys()]);

  const ranked = [...byId.values()]
    .map((candidate) => ({ ...candidate, ...(facts.get(candidate.id) ?? {}) }))
    .filter((candidate) => (candidate.sitelinks ?? 0) >= MIN_SITELINKS)
    .sort((a, b) => b.sitelinks - a.sitelinks);

  const kept = [];
  for (const candidate of ranked) {
    if (kept.length >= MAX_LANDMARKS) break;
    const tooClose = kept.some(
      (other) => distanceMeters(other.lat, other.lon, candidate.lat, candidate.lon) < MIN_SEPARATION
    );
    if (tooClose) continue;
    const names = { default: candidate.labels?.en ?? candidate.tags["name:en"] ?? candidate.tags.name };
    for (const lang of LANGUAGES) {
      const name = candidate.labels?.[lang] ?? candidate.tags[`name:${lang}`];
      // A label that is only the Q number is Wikidata saying it has none
      if (name && !/^Q\d+$/.test(name)) names[lang] = name;
    }
    kept.push({
      id: candidate.id,
      lat: Number(candidate.lat.toFixed(6)),
      lon: Number(candidate.lon.toFixed(6)),
      sitelinks: candidate.sitelinks,
      names,
    });
  }
  return kept;
}


async function main() {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const { CITIES, cityRadius } = await server.ssrLoadModule("/src/seo/cities.ts");
    const { OVERPASS_API_CONFIG } = await server.ssrLoadModule("/src/constants.ts");
    ({ MAX_LANDMARKS } = await server.ssrLoadModule("/src/seo/landmarks.ts"));
    const endpoints = [...OVERPASS_API_CONFIG.URLS];

    const cityFilter = args.get("cities")?.split(",").map((s) => s.trim());
    const existing = existsSync(OUT) ? JSON.parse(await readFile(OUT, "utf8")) : { cities: {} };
    const result = { ...existing.cities };

    // --missing resumes a run that stopped: only the cities the file lacks.
    // Best known cities first either way, so a run that is cut short has
    // spent itself where the visitors are
    const missing = args.get("missing") === "true";
    const cities = (cityFilter ? CITIES.filter((c) => cityFilter.includes(c.slug)) : CITIES)
      .filter((c) => !missing || !(c.slug in result))
      .sort((a, b) => a.tier - b.tier);
    if (cities.length === 0) throw new Error("No cities matched");

    /** After every city, so a run that is stopped keeps what it fetched */
    const save = async () => {
      const sorted = Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
      await writeFile(
        OUT,
        JSON.stringify({ generatedAt: new Date().toISOString(), cities: sorted }, null, 1) + "\n"
      );
    };

    for (const city of cities) {
      try {
        const radius = Math.min(cityRadius(city), MAX_SEARCH_RADIUS + EDGE_MARGIN);
        const landmarks = await landmarksFor(city, radius, endpoints);
        result[city.slug] = landmarks;
        console.log(`- ${city.slug}: ${landmarks.map((l) => l.names.default).join(", ") || "none"}`);
      } catch (error) {
        // Keep what the city had rather than writing it empty
        console.error(`- ${city.slug}: FAILED, keeping previous (${error.message})`);
      }
      await save();
      await sleep(DELAY_MS);
    }
    console.log(`Wrote ${OUT}`);
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
