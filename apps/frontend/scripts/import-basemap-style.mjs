/**
 * Take a style Maputnik just exported and put it back where the app reads it.
 *
 * Maputnik is a browser app: it opens a copy of public/map/voyager.json, and
 * "Export" hands the edited style back as a download. Left alone that is a
 * file in ~/Downloads with a name of Maputnik's choosing, and the edit is only
 * really finished once it has replaced the vendored style. This does that.
 *
 *   npm run basemap:import              newest style JSON in ~/Downloads
 *   npm run basemap:import -- <path>    a specific file
 *
 * Two things happen on the way in, both so the git diff shows cartography and
 * nothing else. The style is re-serialised at the same two-space indent the
 * vendored copy uses, because Maputnik's own formatting differs and would
 * otherwise rewrite all 106 KB as one enormous change. And `maputnik:*` keys
 * are dropped from the metadata — editor bookkeeping, not cartography, and
 * they churn on every export.
 *
 * It refuses anything that is not a v8 style with layers, so a stray download
 * cannot quietly become the basemap.
 */
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TARGET = path.join(ROOT, "public", "map", "voyager.json");
const DOWNLOADS = path.join(os.homedir(), "Downloads");

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

/**
 * The newest .json in ~/Downloads that parses as a GL style. Maputnik names
 * the export after the style ("Voyager.json"), but that is not a promise, and
 * a browser asked to save the same name twice appends " (1)" — so the pick is
 * by mtime and content, never by filename.
 */
async function newestExport() {
  if (!existsSync(DOWNLOADS)) {
    fail(`No ${DOWNLOADS} to look in — pass the exported file as an argument`);
  }

  const candidates = [];
  for (const entry of await readdir(DOWNLOADS)) {
    if (!entry.toLowerCase().endsWith(".json")) continue;
    const full = path.join(DOWNLOADS, entry);
    const info = await stat(full).catch(() => null);
    if (!info?.isFile()) continue;
    const style = await readStyle(full).catch(() => null);
    if (style) candidates.push({ full, style, mtime: info.mtimeMs });
  }

  if (!candidates.length) {
    fail(`No exported GL style found in ${DOWNLOADS} — pass the file as an argument`);
  }

  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0];
}

/** Parse and sanity check. Throws for anything that is not a v8 style */
async function readStyle(file) {
  const style = JSON.parse(await readFile(file, "utf8"));
  if (style?.version !== 8) throw new Error("not a version 8 style");
  if (!Array.isArray(style.layers) || !style.layers.length) throw new Error("no layers");
  if (!style.sources || !Object.keys(style.sources).length) throw new Error("no sources");
  return style;
}

/** Editor bookkeeping, dropped so it never reaches a diff */
function stripEditorMetadata(value) {
  if (Array.isArray(value)) return value.map(stripEditorMetadata);
  if (!value || typeof value !== "object") return value;

  const out = {};
  for (const [key, inner] of Object.entries(value)) {
    if (key === "metadata" && inner && typeof inner === "object") {
      const kept = Object.fromEntries(
        Object.entries(inner).filter(([name]) => !name.startsWith("maputnik:")),
      );
      if (Object.keys(kept).length) out[key] = kept;
      continue;
    }
    out[key] = stripEditorMetadata(inner);
  }
  return out;
}

const argument = process.argv.slice(2).find((arg) => !arg.startsWith("-"));

const source = argument
  ? { full: path.resolve(argument), style: await readStyle(path.resolve(argument)).catch((error) => fail(`${argument}: ${error.message}`)) }
  : await newestExport();

const before = existsSync(TARGET) ? await readStyle(TARGET).catch(() => null) : null;
const style = stripEditorMetadata(source.style);

await writeFile(TARGET, `${JSON.stringify(style, null, 2)}\n`, "utf8");

console.log(`✓ ${path.relative(process.cwd(), source.full)}`);
console.log(`  → ${path.relative(process.cwd(), TARGET)}`);
console.log(`  ${style.layers.length} layers, sources: ${Object.keys(style.sources).join(", ")}`);

if (before) {
  const was = new Set(before.layers.map((l) => l.id));
  const now = new Set(style.layers.map((l) => l.id));
  const added = [...now].filter((id) => !was.has(id));
  const removed = [...was].filter((id) => !now.has(id));
  if (added.length) console.log(`  + ${added.join(", ")}`);
  if (removed.length) console.log(`  - ${removed.join(", ")}`);
  if (before.layers.length === style.layers.length && !added.length && !removed.length) {
    console.log("  same layer set — the change is in paint, layout or zoom");
  }
}

console.log("\n  git diff --stat apps/frontend/public/map/voyager.json");
