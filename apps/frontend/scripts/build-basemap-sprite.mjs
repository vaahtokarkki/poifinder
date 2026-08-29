/**
 * Builds the basemap's POI sprite sheet, mostly from the Material icons the
 * app already depends on.
 *
 * CARTO's own sprite has exactly one image in it (`circle-11`), so a Voyager
 * style can draw no icons at all — the stock style is labels only. The tiles,
 * on the other hand, carry a `poi` layer with a `class` on every feature, so
 * everything needed to draw a toilet or a playground is already arriving; what
 * was missing was the pictures.
 *
 * Rather than pull in a third-party icon set, most of this takes the paths out
 * of `@mui/icons-material`, which is already a dependency and is already the
 * source of the app's own marker icons — so a toilet on the basemap and a
 * toilet on a marker are the same drawing. The MUI modules are ordinary JS
 * with the path data inline, so the `d` attributes come out with a regex; no
 * React, no bundler. Where Material has nothing that reads right, a symbol is
 * vendored into `basemap-symbols/` instead and drawn from there.
 *
 * Output, all into `public/map/`, all committed:
 *
 *   sprite.png / sprite.json        the 1x sheet and its index
 *   sprite@2x.png / sprite@2x.json  the retina pair MapLibre asks for when
 *                                   devicePixelRatio > 1
 *
 * The style references it as a second, named sprite source, so icon names in
 * the layers are prefixed: `poi:toilets`, not `toilets`.
 *
 * Run it with `npm run basemap:sprite` after changing ICONS. Nothing else runs
 * it — the PNGs are checked in, and a build just copies `public/` across.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const OUT_DIR = path.join(ROOT, "public", "map");

/**
 * Where the MUI icon modules live. The ESM copies are the ones with the path
 * data on a single readable line.
 */
const ICON_DIR = path.join(
  path.dirname(require.resolve("@mui/icons-material/package.json")),
  "esm",
);

/**
 * Symbols that are not Material's, vendored one SVG per file — see the README
 * in there for what a file has to look like.
 */
const SYMBOL_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "basemap-symbols",
);

/**
 * The colour a class of thing is drawn in, roughly the OSM default carto
 * families: amenities and tourism brown, transport blue, greenery green,
 * shops magenta, health red. Muted a few steps from OSM's, because Voyager's
 * ground is warmer and lighter than osm-carto's and full-strength hues shout
 * on it.
 */
const INK = {
  amenity: "#7d5f2e",
  transport: "#3a6ea8",
  leisure: "#3f7d51",
  shop: "#9b4d8f",
  health: "#b5504f",
  water: "#3d8296",
};

/**
 * sprite name -> where the drawing comes from, and its ink. A value ending in
 * `.svg` is a file in basemap-symbols; anything else is a MUI icon module.
 *
 * The names are ours, not OpenMapTiles': one sprite serves several `class`
 * values (a dentist and a hospital are both `hospital` here), and the style's
 * filters do that mapping.
 *
 * Shapes are picked to stay apart at 15px more than to be literal — the
 * playground is the exception, and is OSM's own see-saw rather than anything
 * Material has.
 *
 * Keep this list short — every icon added is another thing competing with the
 * app's own markers for the same few pixels.
 */
const ICONS = {
  toilets: ["Wc", INK.amenity],
  drinking_water: ["WaterDrop", INK.water],
  playground: ["playground.svg", INK.leisure],
  park: ["Park", INK.leisure],
  picnic: ["Deck", INK.leisure],
  bus: ["DirectionsBus", INK.transport],
  rail: ["Tram", INK.transport],
  fuel: ["LocalGasStation", INK.transport],
  bicycle: ["DirectionsBike", INK.transport],
  cafe: ["LocalCafe", INK.amenity],
  restaurant: ["Restaurant", INK.amenity],
  fast_food: ["Fastfood", INK.amenity],
  bar: ["LocalBar", INK.amenity],
  ice_cream: ["Icecream", INK.amenity],
  bakery: ["BakeryDining", INK.shop],
  grocery: ["LocalGroceryStore", INK.shop],
  shop: ["Storefront", INK.shop],
  pharmacy: ["LocalPharmacy", INK.health],
  hospital: ["LocalHospital", INK.health],
  school: ["School", INK.amenity],
  library: ["LocalLibrary", INK.amenity],
  post: ["MarkunreadMailbox", INK.amenity],
  museum: ["Museum", INK.amenity],
  lodging: ["Hotel", INK.amenity],
  information: ["Info", INK.amenity],
  worship: ["Church", INK.amenity],
};

/** Drawn size of one icon at 1x, in CSS pixels. */
const SIZE = 15;
/** Transparent gutter between cells, so no icon bleeds into its neighbour. */
const PAD = 2;
/** Icons per row on the sheet. */
const COLS = 8;
/**
 * Width of the white outline drawn under the icon, as a fraction of the
 * viewBox — the sources are not all on the same grid, and a halo has to look
 * the same width whether it came off a 24-unit Material icon or a 14-unit OSM
 * one. Without it a brown pictogram over a dark green park is a smudge.
 */
const HALO = 1.7 / 24;

/**
 * The path data and the grid it is drawn on, from either source.
 *
 * A MUI module is JS, and its paths come out of `d: "..."`; most icons are a
 * single path and a few are a `jsxs` with several, always on a 24-unit grid. A
 * vendored file is SVG, so the paths come out of `d="..."` and the grid off
 * its own `viewBox`. Order is source order either way, which is the order they
 * have to be painted in.
 */
async function iconSource(source) {
  const isFile = source.endsWith(".svg");
  const file = isFile
    ? path.join(SYMBOL_DIR, source)
    : path.join(ICON_DIR, `${source}.js`);
  let src;
  try {
    src = await fs.readFile(file, "utf8");
  } catch {
    throw new Error(`no such symbol: ${source} (looked in ${file})`);
  }
  const pattern = isFile ? /\bd="([^"]+)"/g : /\bd:\s*"([^"]+)"/g;
  const paths = [...src.matchAll(pattern)].map(m => m[1]);
  if (!paths.length) throw new Error(`no path data in ${source}`);
  const viewBox = isFile
    ? (src.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24")
    : "0 0 24 24";
  const span = Number(viewBox.split(/\s+/)[2]);
  if (!span) throw new Error(`unreadable viewBox in ${source}: ${viewBox}`);
  return { paths, viewBox, span };
}

/**
 * One icon as an SVG string: the shape in white with a fat round stroke first,
 * the shape in its ink on top. Two passes over the same paths rather than a
 * filter, because librsvg's blur is slow and a hard halo reads better small.
 */
function iconSvg({ paths, viewBox, span }, ink, px) {
  const shape = fill =>
    paths
      .map(d => `<path d="${d}" fill="${fill}" fill-rule="evenodd"/>`)
      .join("");
  const halo = paths
    .map(
      d =>
        `<path d="${d}" fill="none" stroke="#ffffff" ` +
        `stroke-width="${(HALO * span).toFixed(3)}" ` +
        `stroke-linejoin="round" stroke-linecap="round"/>`,
    )
    .join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ` +
      `width="${px}" height="${px}">${halo}${shape("#ffffff")}${shape(ink)}</svg>`,
  );
}

/** Renders every icon at one pixel ratio and writes that sheet and its index. */
async function buildSheet(ratio) {
  const names = Object.keys(ICONS);
  const cell = SIZE * ratio;
  const step = cell + PAD * ratio;
  const cols = Math.min(COLS, names.length);
  const rows = Math.ceil(names.length / COLS);
  const width = cols * step - PAD * ratio;
  const height = rows * step - PAD * ratio;

  const index = {};
  const composites = [];
  for (const [i, name] of names.entries()) {
    const [source, ink] = ICONS[name];
    const left = (i % COLS) * step;
    const top = Math.floor(i / COLS) * step;
    const png = await sharp(iconSvg(await iconSource(source), ink, cell))
      .png()
      .toBuffer();
    composites.push({ input: png, left, top });
    index[name] = {
      x: left,
      y: top,
      width: cell,
      height: cell,
      pixelRatio: ratio,
      sdf: false,
    };
  }

  const sheet = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();

  const stem = ratio === 1 ? "sprite" : `sprite@${ratio}x`;
  await fs.writeFile(path.join(OUT_DIR, `${stem}.png`), sheet);
  await fs.writeFile(
    path.join(OUT_DIR, `${stem}.json`),
    JSON.stringify(index, null, 2) + "\n",
  );
  return { stem, width, height, bytes: sheet.length, count: names.length };
}

for (const ratio of [1, 2]) {
  const r = await buildSheet(ratio);
  console.log(
    `${r.stem}.png  ${r.width}x${r.height}  ${r.count} icons  ` +
      `${(r.bytes / 1024).toFixed(1)} kB`,
  );
}
