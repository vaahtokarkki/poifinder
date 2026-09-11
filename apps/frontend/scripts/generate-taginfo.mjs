/**
 * Write the taginfo project file: every OpenStreetMap tag Wayside reads.
 *
 * taginfo.openstreetmap.org lists, on each tag's page, the projects that use
 * it. That list is what mappers look at before changing or deprecating a tag,
 * and the OSM wiki's own "Maps using this tag" sections point to it. taginfo
 * fetches this file daily from the URL registered in taginfo-projects'
 * project_list.txt, so keeping it true is all the upkeep the listing needs.
 *
 * CATEGORY_CONFIG is the source of truth, the same filters the app sends to
 * Overpass. Each condition becomes an entry: the plain key=value tags a point
 * is shown for, regex alternations expanded into their values, and negations
 * as key-only entries, since those keys are read too.
 *
 *   node scripts/generate-taginfo.mjs            write public/taginfo.json
 *   node scripts/generate-taginfo.mjs --check    fail if it is stale
 *
 * data_updated only moves when the tags or project details do, so running
 * this on every push writes an identical file and commits nothing.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT = path.join(ROOT, "public", "taginfo.json");
const SITE = "https://wayside.cc";

const PROJECT = {
  name: "Wayside",
  description:
    "Free map of drinking water, toilets, benches and other small amenities " +
    "for people on foot, with city pages built from OpenStreetMap.",
  project_url: `${SITE}/`,
  doc_url: "https://wiki.openstreetmap.org/wiki/Wayside",
  icon_url: `${SITE}/icons/favicon-16x16.png`,
  // The project, not a person: the file is public and so is taginfo's page
  contact_name: "Wayside",
  contact_email: "hello@wayside.cc",
};

/**
 * Tags read from a point once it is on the map, rather than to find it: the
 * popup's rows, the city page summaries and the way unnamed rows are named.
 * Kept by hand because they are spread across the popup and page code rather
 * than declared in one place.
 */
const DETAIL_TAGS = [
  ["name", "Row and popup title"],
  ["opening_hours", "Shown in the popup"],
  ["wheelchair", "Step-free access, in the popup and city page summaries"],
  ["fee", "Free or paid, in the popup and city page summaries"],
  ["changing_table", "Shown in the popup for toilets"],
  ["payment", "Accepted payment, shown in the popup"],
  ["website", "Linked from the popup"],
  ["check_date", "When the point was last checked, shown in the popup"],
  ["wikidata", "Linked from the popup"],
  ["wikipedia", "Linked from the popup"],
  ["addr:street", "Names a row after its street when the point has no name"],
  ["addr:housenumber", "Part of a row's address"],
];

const OBJECT_TYPES = ["node", "way", "relation"];

/** Same parser as generate-osmium-filter.mjs: '[a=b][c~"d"]' into conditions */
function parseConditions(filter) {
  return [...filter.matchAll(/\[([^\]]+)\]/g)].map(([, body]) => {
    const match = body.match(/^([^!=~]+)(!=|!~|=|~)(.*)$/);
    if (!match) throw new Error(`Cannot parse condition "[${body}]"`);
    const [, key, operator, value] = match;
    const unquote = (text) => text.trim().replace(/^"|"$/g, "");
    return { key: unquote(key), operator, value: unquote(value) };
  });
}

/** "^(a|b|c)$" into [a, b, c]; anything fancier than an anchored list is not one */
function alternatives(pattern) {
  const match = pattern.match(/^\^\(([\w|:-]+)\)\$$/) ?? pattern.match(/^\^([\w:-]+)\$$/);
  if (!match) throw new Error(`Regex "${pattern}" is not an anchored list of values`);
  return match[1].split("|");
}

function list(names) {
  const sorted = [...names].sort();
  return sorted.length > 1 ? `${sorted.slice(0, -1).join(", ")} and ${sorted.at(-1)}` : sorted[0];
}

/**
 * One sentence per set of categories: the same categories reached through
 * several companion tags read "…when also tagged a, b or c", and a tag that
 * shows a category on its own needs no condition at all
 */
function describe(phrases) {
  const shown = new Map();
  const parts = [];
  for (const [phrase, names] of phrases) {
    const kind = phrase.slice(0, phrase.indexOf(":"));
    const rest = phrase.slice(phrase.indexOf(":") + 1);
    if (kind === "skip") {
      parts.push(`${list(names)} ${names.size > 1 ? "skip" : "skips"} points tagged ${rest}`);
      continue;
    }
    const who = list(names);
    if (!shown.has(who)) shown.set(who, []);
    shown.get(who).push(rest.replace(/^ when also tagged /, ""));
  }
  for (const [who, conditions] of shown) {
    const alone = conditions.includes("");
    const joined =
      conditions.length > 1
        ? `${conditions.slice(0, -1).join(", ")} or ${conditions.at(-1)}`
        : conditions[0];
    parts.unshift(`Shown on the map as ${who}${alone ? "" : ` when also tagged ${joined}`}`);
  }
  return parts.join("; ");
}

async function build() {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  try {
    const { CATEGORIES, CATEGORY_CONFIG } = await server.ssrLoadModule("/src/constants.ts");
    const { CATEGORY_SEO_BY_CATEGORY } = await server.ssrLoadModule("/src/seo/categories.ts");
    const { en } = await server.ssrLoadModule("/src/copy/en.ts");

    const nameOf = (category) => {
      const slug = CATEGORY_SEO_BY_CATEGORY[category]?.slug;
      return (slug && en.ui.categoryNames[slug]) || CATEGORIES[category];
    };

    /**
     * "key=value" or "key" -> phrase -> category names. A tag only counts
     * together with the rest of its filter — building=retail is a toilet only
     * with toilets=yes — so each phrase carries the conditions it pairs with,
     * and categories that share a phrase are named in one sentence
     */
    const entries = new Map();
    const add = (key, value, phrase, name) => {
      const id = value === undefined ? key : `${key}=${value}`;
      if (!entries.has(id)) entries.set(id, { key, value, phrases: new Map() });
      const phrases = entries.get(id).phrases;
      if (!phrases.has(phrase)) phrases.set(phrase, new Set());
      phrases.get(phrase).add(name);
    };
    const render = ({ key, operator, value }) =>
      `${key}${operator}${operator === "~" ? alternatives(value).join("|") : value}`;

    for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
      const name = nameOf(Number(category));
      for (const filter of config.filters) {
        const conditions = parseConditions(filter);
        for (const condition of conditions) {
          const { key, operator, value } = condition;
          if (operator === "!=" || operator === "!~") {
            add(key, undefined, `skip:${render({ key, operator: "=", value })}`, name);
            continue;
          }
          const others = conditions.filter((other) => other !== condition).map(render);
          const phrase = `shown:${others.length ? ` when also tagged ${others.join(" and ")}` : ""}`;
          const values = operator === "~" ? alternatives(value) : [value];
          for (const v of values) add(key, v, phrase, name);
        }
      }
    }

    const tags = [...entries.values()]
      .sort((a, b) => a.key.localeCompare(b.key) || (a.value ?? "").localeCompare(b.value ?? ""))
      .map(({ key, value, phrases }) => ({
        key,
        ...(value !== undefined && { value }),
        object_types: OBJECT_TYPES,
        description: describe(phrases),
      }));

    const filterKeys = new Set(tags.map(({ key, value }) => (value === undefined ? key : null)));
    for (const [key, description] of DETAIL_TAGS) {
      if (filterKeys.has(key)) continue;
      tags.push({ key, object_types: OBJECT_TYPES, description });
    }

    return { project: PROJECT, tags };
  } finally {
    await server.close();
  }
}

async function main() {
  const { project, tags } = await build();
  const previous = existsSync(OUTPUT) ? JSON.parse(await readFile(OUTPUT, "utf8")) : null;

  const same =
    previous &&
    JSON.stringify({ project: previous.project, tags: previous.tags }) ===
      JSON.stringify({ project, tags });

  if (process.argv.includes("--check")) {
    if (!same) {
      console.error(`public/taginfo.json is out of date. Run \`npm run taginfo\`.`);
      process.exit(1);
    }
    console.log("taginfo.json is up to date.");
    return;
  }

  if (same) {
    console.log(`Unchanged public/taginfo.json, ${tags.length} tags`);
    return;
  }

  const content = {
    data_format: 1,
    data_url: `${SITE}/taginfo.json`,
    // taginfo's own format: compact ISO 8601, UTC
    data_updated: new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z"),
    project,
    tags,
  };
  await writeFile(OUTPUT, JSON.stringify(content, null, 2) + "\n");
  console.log(`Wrote public/taginfo.json, ${tags.length} tags`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
