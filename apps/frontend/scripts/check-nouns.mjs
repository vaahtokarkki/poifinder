/**
 * Tell whether a deck's category nouns are words people actually type.
 *
 * The failure this exists to catch is the one Finnish shipped with. The
 * drinking water pages called themselves "juomavesipisteet", which is a correct
 * Finnish compound, is what a dictionary gives you, and is a word nobody
 * searches for — Google offers no completion for it at all. The pages were
 * fine. They were named in a word with no demand behind it.
 *
 * A translator answers "what is this called". Search needs "what do people
 * type", and those are different questions in every language: Spaniards say
 * "punto limpio" for a recycling point, Italians "isola ecologica". Neither is
 * the literal translation and both are what the query log holds.
 *
 * So: ask Google's autocomplete for each noun in each locale, and read two
 * things off the answer.
 *
 *   Demand   A noun with no completions is a noun nobody types. One that
 *            returns only itself echoed back is the same finding.
 *   Place    A noun people use to find a thing nearby completes into place
 *            names — "punto limpio madrid", "kierrätyspisteet oulu". One that
 *            completes into prices, sizes and brands is a noun for buying the
 *            object, not for finding one: Polish "poidełko" returns waterers
 *            for birds and hamsters, Swedish "vattenpost" returns garden taps.
 *
 * Neither check can pass a noun as *correct* — that still wants a native
 * speaker. What they do is catch a noun that is off the query log entirely,
 * which is the error that silently costs a whole category in a whole language.
 *
 *   npm run copy:nouns                   every locale, every live category
 *   npm run copy:nouns -- --locale fr    one locale
 *   npm run copy:nouns -- --json         machine readable, for a diff
 *
 * This talks to the network, so it is deliberately not part of `npm run build`:
 * a build has to be reproducible offline and must not start failing because
 * Google rate limited a CI runner. Run it when a deck is written or changed.
 */
import path from "node:path";
import { createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "..");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const onlyLocale = args.includes("--locale") ? args[args.indexOf("--locale") + 1] : null;

/** Autocomplete is a public endpoint but an impolite one to hammer */
const DELAY_MS = 400;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ask for the completions of one query in one language.
 *
 * `hl` is the interface language rather than a region, which is what we want:
 * the question is what speakers of this language type, not what one country
 * does. It does mean the answer leans to that language's largest market —
 * Spanish reads as Spain rather than Mexico.
 */
async function complete(query, hl) {
  const url =
    "https://suggestqueries.google.com/complete/search" +
    `?client=firefox&ie=utf-8&oe=utf-8&hl=${encodeURIComponent(hl)}` +
    `&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; wayside-copy-check)" },
  });
  if (!response.ok) throw new Error(`${response.status} for ${hl} "${query}"`);
  const [, suggestions] = JSON.parse(await response.text());
  return Array.isArray(suggestions) ? suggestions : [];
}

const fold = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const server = await createServer({
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: "custom",
  logLevel: "error",
  root: ROOT,
});

try {
  const { CATEGORY_SEO } = await server.ssrLoadModule("/src/seo/categories.ts");
  const { CITIES } = await server.ssrLoadModule("/src/seo/cities.ts");
  const { LOCALES } = await server.ssrLoadModule("/src/copy/locales.ts");
  const { PAUSED_CATEGORIES } = await server.ssrLoadModule("/src/seo/pageMeta.ts");
  const { deckFor } = await server.ssrLoadModule("/src/copy/index.ts");

  /**
   * The place names a suggestion might carry, folded for comparison.
   *
   * Every city in the catalogue in every name it has, plus the countries —
   * Dutch completes "drinkwaterkaart nederland" with no city in it at all, and
   * that is the strongest place signal on the list rather than a miss.
   */
  const places = new Set();
  for (const city of CITIES) {
    places.add(fold(city.name));
    places.add(fold(city.country));
    for (const entry of Object.values(city.names ?? {})) {
      places.add(fold(typeof entry === "string" ? entry : entry.name));
    }
  }

  const live = CATEGORY_SEO.filter((entry) => !PAUSED_CATEGORIES.has(entry.slug));
  const locales = LOCALES.filter(
    ({ code }) => code !== "en" && (!onlyLocale || code === onlyLocale)
  );

  if (locales.length === 0) {
    throw new Error(onlyLocale ? `no deck for locale "${onlyLocale}"` : "no locales to check");
  }

  const results = [];

  for (const { code } of locales) {
    const deck = deckFor(code);
    for (const category of live) {
      const noun = deck.categories?.[category.slug]?.plural;
      // An untranslated category is not a failure. The deck falls back field by
      // field on purpose, and a locale is allowed to ship half its nouns
      if (!noun) {
        results.push({ locale: code, category: category.slug, status: "untranslated" });
        continue;
      }

      let suggestions;
      try {
        suggestions = await complete(noun, code);
      } catch (error) {
        results.push({
          locale: code,
          category: category.slug,
          noun,
          status: "error",
          detail: String(error.message ?? error),
        });
        continue;
      }
      await sleep(DELAY_MS);

      // The query echoed back is not a completion of it
      const real = suggestions.filter((entry) => fold(entry) !== fold(noun));
      const placed = real.filter((entry) => {
        const folded = fold(entry);
        return [...places].some((place) => folded.includes(place));
      });

      const status = real.length === 0 ? "no-demand" : placed.length === 0 ? "no-place" : "ok";
      results.push({
        locale: code,
        category: category.slug,
        noun,
        status,
        suggestions: suggestions.slice(0, 8),
        placed: placed.slice(0, 5),
      });
    }
  }

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    const mark = {
      ok: "ok       ",
      "no-place": "NO PLACE ",
      "no-demand": "NO DEMAND",
      untranslated: "--       ",
      error: "ERROR    ",
    };
    let locale = null;
    for (const row of results) {
      if (row.locale !== locale) {
        locale = row.locale;
        console.log(`\n${locale}`);
      }
      if (row.status === "untranslated") continue;
      const detail =
        row.status === "ok"
          ? row.placed.slice(0, 3).join(" · ")
          : row.status === "error"
            ? row.detail
            : (row.suggestions ?? []).slice(0, 3).join(" · ");
      console.log(`  ${mark[row.status]} ${row.category.padEnd(18)} ${String(row.noun).padEnd(26)} ${detail}`);
    }
  }

  const bad = results.filter((row) => row.status === "no-demand" || row.status === "no-place");
  const untranslated = results.filter((row) => row.status === "untranslated").length;
  if (!asJson) {
    console.log(
      `\n${results.length - untranslated} nouns checked, ${bad.length} to look at, ` +
        `${untranslated} untranslated.`
    );
  }
  // A finding is a prompt to go and read the suggestions, not a broken build.
  // Some nouns genuinely have no better form and ship anyway; the exit code is
  // here so a deck can be gated on it deliberately, one locale at a time
  process.exitCode = bad.length > 0 ? 1 : 0;
} finally {
  await server.close();
}
