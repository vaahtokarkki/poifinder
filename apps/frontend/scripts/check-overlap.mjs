/**
 * How much of a page is also on another page in the same category.
 *
 * The measurement behind GOOGLE_CATEGORIES in src/seo/pageMeta.ts. On the day
 * Google stopped showing the site, two drinking water pages — Prague and
 * Budapest — shared 71% of their five-word phrases: the same intro and six FAQ
 * answers with the city swapped in. A template that reads the same on twelve
 * hundred pages is what a scaled-content system looks for, so this counts it,
 * over the pages Google is actually being asked to index.
 *
 * Five-word shingles over the prerendered text, the part a crawler reads
 * before any JavaScript runs. Pages are paired with their neighbour in
 * alphabetical order, which pairs unrelated cities — the fair test, since two
 * suburbs of one city could share streets honestly. Up to forty pairs per
 * category is plenty to see the median move.
 *
 *   npm run seo:overlap              report
 *   npm run seo:overlap -- --strict  exit 1 when a category's median is over
 *
 * Reads dist/, so run it after the build. OVERLAP_MAX overrides the 25%
 * threshold.
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "..", "dist");
const THRESHOLD = Number(process.env.OVERLAP_MAX ?? 0.25);
const strict = process.argv.includes("--strict");
const MAX_PAIRS = 40;

if (!existsSync(path.join(DIST, "sitemap.xml"))) {
  throw new Error("dist/sitemap.xml missing, run the build first");
}

const sitemap = await readFile(path.join(DIST, "sitemap.xml"), "utf8");
const paths = [...sitemap.matchAll(/<loc>https:\/\/wayside\.cc(\/[^<]*)<\/loc>/g)].map(
  (match) => match[1]
);

// Category pages only: /city/category/
const byCategory = new Map();
for (const url of paths) {
  const segments = url.split("/").filter(Boolean);
  if (segments.length !== 2) continue;
  const list = byCategory.get(segments[1]) ?? [];
  list.push(url);
  byCategory.set(segments[1], list);
}

function words(html) {
  const match = html.match(/<div id="seo-prerender">([\s\S]*?)<script type="application\/json"/);
  const text = (match ? match[1] : "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .toLowerCase();
  return text.match(/[\p{L}\p{N}']+/gu) ?? [];
}

function shingles(list, size = 5) {
  const set = new Set();
  for (let i = 0; i + size <= list.length; i++) set.add(list.slice(i, i + size).join(" "));
  return set;
}

const cache = new Map();
async function read(url) {
  if (!cache.has(url)) {
    const html = await readFile(path.join(DIST, url, "index.html"), "utf8");
    cache.set(url, shingles(words(html)));
  }
  return cache.get(url);
}

let failed = false;
for (const [category, list] of [...byCategory].sort()) {
  list.sort();
  const scores = [];
  for (let i = 0; i + 1 < list.length && scores.length < MAX_PAIRS; i++) {
    const a = await read(list[i]);
    const b = await read(list[i + 1]);
    let shared = 0;
    for (const phrase of a) if (b.has(phrase)) shared++;
    scores.push(shared / Math.max(a.size, 1));
  }
  if (scores.length === 0) continue;
  scores.sort((x, y) => x - y);
  const median = scores[Math.floor(scores.length / 2)];
  const worst = scores.at(-1);
  const over = median > THRESHOLD;
  failed ||= over;
  console.log(
    `${over ? "OVER" : "ok  "}  ${category.padEnd(16)} ${String(list.length).padStart(4)} pages` +
      `  median ${(median * 100).toFixed(0).padStart(3)}%  worst ${(worst * 100).toFixed(0).padStart(3)}%`
  );
}

if (failed) {
  console.log(
    `\nA category's median is over ${(THRESHOLD * 100).toFixed(0)}%: its pages read as ` +
      `one template more than as pages about their cities.`
  );
}
process.exitCode = failed && strict ? 1 : 0;
