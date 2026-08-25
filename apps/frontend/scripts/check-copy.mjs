/**
 * Tell whether a translation has fallen behind the English it was made from.
 *
 * The failure this exists to catch is silent: somebody improves an English
 * sentence, the German deck still holds the translation of the sentence before
 * it, and nothing anywhere says so. Six months later the German half of the app
 * describes a feature that changed, and the only way to find out is to read
 * both decks side by side.
 *
 * So: every English string is hashed, and copy.lock.json remembers which hash
 * each translated key was made from. When the English moves, the hash stops
 *  matching and the key is reported stale. Re-bless with `--update` once the
 * translation has actually been redone.
 *
 *   npm run copy:check            report, exit 1 if anything is stale
 *   npm run copy:check -- --update  accept the current English as the baseline
 *
 * Keys a locale does not define at all are not stale, they are untranslated —
 * counted and listed under --verbose, never an error. A locale is allowed to
 * ship the chrome and leave the page copy in English; that is the whole shape
 * of LocaleDeck.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "..");
const LOCK = path.join(ROOT, "src", "copy", "copy.lock.json");

const update = process.argv.includes("--update");
const verbose = process.argv.includes("--verbose");

const hash = (text) => createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12);

/** Every leaf string in a deck, as `a.b.c` -> string. Arrays index numerically */
function flatten(value, prefix = "", out = {}) {
  if (typeof value === "string") {
    out[prefix] = value;
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => flatten(item, `${prefix}[${i}]`, out));
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

const server = await createServer({
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: "custom",
  logLevel: "error",
});

try {
  const { en } = await server.ssrLoadModule("/src/copy/en.ts");
  const { LOCALES } = await server.ssrLoadModule("/src/copy/locales.ts");

  const english = flatten(en);
  const lock = existsSync(LOCK) ? JSON.parse(await readFile(LOCK, "utf8")) : {};
  const next = {};

  let stale = 0;
  let untranslated = 0;
  let fresh = 0;

  for (const { code } of LOCALES) {
    if (code === "en") continue;
    const mod = await server.ssrLoadModule(`/src/copy/${code}.ts`);
    const deck = flatten(mod[code]);
    const locked = lock[code] ?? {};
    next[code] = {};

    const staleKeys = [];
    const missing = [];

    for (const [key, source] of Object.entries(english)) {
      const translated = deck[key];
      if (translated === undefined) {
        missing.push(key);
        continue;
      }
      const current = hash(source);
      const before = locked[key];
      // A key the lock has never seen is being blessed for the first time,
      // which is what happens the run after a translator adds one
      if (before !== undefined && before !== current && !update) {
        staleKeys.push(key);
        next[code][key] = before;
      } else {
        next[code][key] = current;
      }
    }

    stale += staleKeys.length;
    untranslated += missing.length;
    fresh += Object.keys(next[code]).length - staleKeys.length;

    const width = String(Object.keys(english).length).length;
    console.log(
      `${code}  translated ${String(Object.keys(deck).length).padStart(width)}` +
        `/${Object.keys(english).length}` +
        `  stale ${staleKeys.length}` +
        `  untranslated ${missing.length}`
    );
    for (const key of staleKeys) {
      console.log(`   STALE  ${key}`);
      console.log(`          en is now: ${JSON.stringify(english[key]).slice(0, 96)}`);
    }
    if (verbose) for (const key of missing) console.log(`   todo   ${key}`);
  }

  if (update) {
    await writeFile(LOCK, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`\nlock updated: ${fresh + stale} keys across ${Object.keys(next).length} locales`);
  } else if (stale > 0) {
    console.error(
      `\n${stale} translated ${stale === 1 ? "key is" : "keys are"} behind the English they were made from.` +
        `\nRedo those translations, then run \`npm run copy:check -- --update\`.`
    );
    process.exitCode = 1;
  } else {
    console.log(`\nno stale copy (${untranslated} keys untranslated, which is allowed)`);
  }
} finally {
  await server.close();
}
