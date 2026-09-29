/**
 * Write the osmium tag filter the self hosted Overpass instance is built from.
 *
 * The instance only ever answers the app's own queries, so it only needs the
 * objects those queries can match. Importing a full extract instead would cost
 * an order of magnitude more disk and import time for data nothing asks for.
 *
 * CATEGORY_CONFIG is the single source of truth: this reads the same filters
 * the app sends to Overpass and turns them into expressions for
 * `osmium tags-filter`, which is what apps/overpass runs over the raw extract
 * before importing it.
 *
 *   node scripts/generate-osmium-filter.mjs            write the file
 *   node scripts/generate-osmium-filter.mjs --check    fail if it is stale
 *
 * Run it after adding or changing a category, then rebuild the database
 * (`update-poi-db` in the container), otherwise the new category is simply
 * missing from every answer.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT = path.resolve(ROOT, "..", "overpass", "osmium-filter.txt");
/**
 * The same filter, narrowed to the points worth keeping a building for. See
 * `buildingLookup` in CATEGORY_CONFIG and bin/join-buildings, which picks its
 * points with this file instead of the one above
 */
const JOIN_OUTPUT = path.resolve(ROOT, "..", "overpass", "building-join-filter.txt");

/**
 * Tags that match far too much to be worth filtering on. When a category's
 * filter combines one of these with something else, the something else is what
 * we keep: [building=retail][toilets=yes] is a handful of shops, but keeping
 * every retail building would pull in a large part of the extract.
 */
const BROAD_TAGS = new Set(["building=retail", "leisure=pitch", "man_made=tower"]);

/**
 * Tags imported ahead of the category that will use them.
 *
 * A new category ships in two steps, because the database is rebuilt weekly
 * and a full reimport takes hours: first the data, then the UI. Listed here, a
 * tag is kept in the extract while no category asks for it yet, so the
 * reimport can run and finish before any visitor can pick a category that
 * would answer empty everywhere. Once the category exists in CATEGORY_CONFIG
 * its own filters carry the tag and the entry here should be removed.
 */
const IMPORT_AHEAD = [
  // Trash bins: street bins, and the larger containers. The category can
  // narrow the second with [access!=private]; the import keeps both
  { tag: "amenity=waste_basket", for: "TrashBins (upcoming)", buildingLookup: false },
  { tag: "amenity=waste_disposal", for: "TrashBins (upcoming)", buildingLookup: false },
];

/**
 * Split "[amenity=fuel]" or '[a=b][c~"d"]' into its conditions. Values may
 * contain anything but a closing bracket, which is enough for the filters we
 * write by hand in CATEGORY_CONFIG.
 */
function parseConditions(filter) {
  return [...filter.matchAll(/\[([^\]]+)\]/g)].map(([, body]) => {
    const match = body.match(/^([^!=~]+)(!=|!~|=|~)(.*)$/);
    if (!match) throw new Error(`Cannot parse condition "[${body}]"`);
    const [, key, operator, value] = match;
    // Either side may be quoted: Overpass QL needs it for a key with a colon
    const unquote = (text) => text.trim().replace(/^"|"$/g, "");
    return { key: unquote(key), operator, value: unquote(value) };
  });
}

/**
 * The one tag every object matching this filter must carry.
 *
 * osmium can only filter on plain key=value, so negations ([access!=private])
 * and regexes ([shelter_type~"..."]) are dropped: they only ever narrow a
 * filter down, and keeping a few objects too many costs nothing here. Overpass
 * still applies the full filter at query time, so the answers are unchanged.
 */
function selectTag(filter) {
  const positive = parseConditions(filter)
    .filter(({ operator, value }) => operator === "=" && value !== "*")
    .map(({ key, value }) => `${key}=${value}`);

  if (positive.length === 0) {
    throw new Error(
      `Filter "${filter}" has no plain key=value condition to import on. ` +
        `Add one, or the category cannot be served from a filtered extract.`
    );
  }
  return positive.find((tag) => !BROAD_TAGS.has(tag)) ?? positive[0];
}

async function main() {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    logLevel: "error",
    // Nothing is served here, only one module is evaluated: scanning the app
    // for dependencies to prebundle is pure noise, and racing the close
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  let content;
  let joinContent;
  try {
    const { CATEGORIES, CATEGORY_CONFIG } = await server.ssrLoadModule("/src/constants.ts");

    /** tag -> the categories that need it, so the file explains itself */
    const tags = new Map();
    /** The tags at least one category wants the building around */
    const joinTags = new Set();
    const add = (tag, name, wantsBuilding) => {
      if (!tags.has(tag)) tags.set(tag, new Set());
      tags.get(tag).add(name);
      // Per tag rather than per category: one category that wants buildings
      // is enough to keep them for every point carrying the tag
      if (wantsBuilding) joinTags.add(tag);
    };
    for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
      for (const filter of config.filters) {
        add(selectTag(filter), CATEGORIES[key], config.buildingLookup !== false);
      }
    }
    for (const { tag, for: name, buildingLookup } of IMPORT_AHEAD) {
      add(tag, name, buildingLookup !== false);
    }

    const lines = [...tags]
      .sort(([a], [b]) => a.localeCompare(b))
      // nwr/ so a matching way or relation is kept too, not just nodes. Their
      // member nodes come along by default, which is what Overpass needs to
      // answer `out center` for them
      .map(([tag, categories]) => `nwr/${tag}  # ${[...categories].sort().join(", ")}`);

    content =
      "# Generated by apps/frontend/scripts/generate-osmium-filter.mjs from\n" +
      "# CATEGORY_CONFIG. Do not edit by hand: run `npm run overpass:filters`.\n" +
      "#\n" +
      "# Objects carrying any of these tags are kept when the raw OSM extract is\n" +
      "# imported. Everything else is dropped before Overpass ever sees it.\n" +
      "#\n" +
      `# ${tags.size} tags, covering ${Object.keys(CATEGORY_CONFIG).length} categories.\n` +
      lines.join("\n") +
      "\n";
    const joinLines = [...tags]
      .filter(([tag]) => joinTags.has(tag))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, categories]) => `nwr/${tag}  # ${[...categories].sort().join(", ")}`);
    joinContent =
      "# Generated by apps/frontend/scripts/generate-osmium-filter.mjs from\n" +
      "# CATEGORY_CONFIG. Do not edit by hand: run `npm run overpass:filters`.\n" +
      "#\n" +
      "# The points bin/join-buildings keeps the enclosing building for: every tag\n" +
      "# in osmium-filter.txt except those whose categories all set\n" +
      "# `buildingLookup: false` - street furniture, and places that are their own\n" +
      "# building. Their points are still imported; only the building is not.\n" +
      "#\n" +
      `# ${joinLines.length} of ${tags.size} tags.\n` +
      joinLines.join("\n") +
      "\n";
  } finally {
    await server.close();
  }

  const files = [
    [OUTPUT, content],
    [JOIN_OUTPUT, joinContent],
  ];
  if (process.argv.includes("--check")) {
    let stale = false;
    for (const [file, text] of files) {
      const previous = existsSync(file) ? await readFile(file, "utf8") : null;
      if (previous !== text) {
        stale = true;
        console.error(
          `${path.relative(process.cwd(), file)} is out of date with CATEGORY_CONFIG. ` +
            "Run `npm run overpass:filters`."
        );
      }
    }
    if (stale) process.exit(1);
    console.log("Filter files are up to date.");
    return;
  }
  for (const [file, text] of files) {
    const previous = existsSync(file) ? await readFile(file, "utf8") : null;
    await writeFile(file, text);
    console.log(`${previous === text ? "Unchanged" : "Wrote"} ${path.relative(process.cwd(), file)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
