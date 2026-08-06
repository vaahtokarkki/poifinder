/**
 * Turn the single page bundle into one real HTML file per route.
 *
 * Runs after `vite build`, reads dist/index.html as the shell and writes a
 * static page for every city and category that has enough points to be worth
 * indexing. The page content is the same React component the app renders in
 * its sheet, rendered here to static markup: the crawler and the visitor get
 * the same words, which is the only version of this that is honest.
 *
 * Input is data/poi/*.json, refreshed separately by fetch-poi-data.mjs. There
 * is no network access here, so a build is deterministic and cannot be broken
 * by Overpass being down.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";
// Imported natively rather than through Vite's SSR runner, which resolves
// react-dom/server to its CommonJS build and then cannot evaluate it. React
// elements are keyed by global symbols, so components loaded through Vite
// render fine against this copy as long as they use no hooks or context.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const DATA_DIR = path.join(ROOT, "data", "poi");

/** Closing tags inside a script block would end it early */
const escapeJson = (value) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

const escapeAttr = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Markers around everything this script injects, so it can undo itself */
const HEAD_OPEN = "<!--seo:head-->";
const HEAD_CLOSE = "<!--/seo:head-->";
const BODY_OPEN = "<!--seo:body-->";
const BODY_CLOSE = "<!--/seo:body-->";
/** What the head is replaced by, and what it collapses back to */
const SHELL_TITLE = "<title>Wayside</title>";

function stripInjection(html) {
  return html
    .replace(new RegExp(`${HEAD_OPEN}[\\s\\S]*?${HEAD_CLOSE}`), SHELL_TITLE)
    .replace(new RegExp(`${BODY_OPEN}[\\s\\S]*?${BODY_CLOSE}`), "");
}

async function main() {
  if (!existsSync(path.join(DIST, "index.html"))) {
    throw new Error("dist/index.html missing, run `vite build` before prerendering");
  }

  const server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    logLevel: "error",
  });

  try {
    const { CITIES } = await server.ssrLoadModule("/src/seo/cities.ts");
    const { CATEGORY_SEO } = await server.ssrLoadModule("/src/seo/categories.ts");
    const meta = await server.ssrLoadModule("/src/seo/pageMeta.ts");
    const { PAGE_DATA_ELEMENT_ID } = await server.ssrLoadModule("/src/seo/pageData.ts");
    const PrerenderedPage = (
      await server.ssrLoadModule("/src/components/PrerenderedPage.tsx")
    ).default;

    // dist/index.html is both the shell and one of the outputs, so a second
    // prerender without a rebuild would read its own work back in. Strip any
    // previous injection first, which keeps `npm run prerender` re-runnable
    const shell = stripInjection(await readFile(path.join(DIST, "index.html"), "utf8"));

    // ---- Load the OpenStreetMap extract ----
    const poiData = new Map();
    if (existsSync(DATA_DIR)) {
      for (const file of await readdir(DATA_DIR)) {
        if (!file.endsWith(".json")) continue;
        const parsed = JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8"));
        poiData.set(parsed.city, parsed);
      }
    }
    if (poiData.size === 0) {
      console.warn(
        "! data/poi is empty, only the map root will be prerendered.\n" +
          "  Run `npm run seo:data` to fetch the OpenStreetMap extract first."
      );
    }

    /**
     * Work out which routes qualify before rendering any of them: the internal
     * links must only ever point at pages that exist, or the link graph is a
     * field of 404s.
     */
    const routes = [];
    for (const city of CITIES) {
      const cityData = poiData.get(city.slug);
      if (!cityData) continue;
      for (const categorySeo of CATEGORY_SEO) {
        const entry = cityData.categories?.[categorySeo.slug];
        if (!entry || entry.count < meta.MIN_POIS_FOR_PAGE) continue;
        routes.push({
          city,
          categorySeo,
          count: entry.count,
          pois: entry.pois ?? [],
          // This category's own refresh date, so a page whose query failed
          // last time does not inherit a freshness it does not have
          updatedAt: (entry.updatedAt ?? cityData.generatedAt ?? new Date().toISOString()).slice(
            0,
            10
          ),
        });
      }
    }

    const publishedRoutes = new Set(
      routes.map((route) => `${route.city.slug}/${route.categorySeo.slug}`)
    );
    const publishedCities = new Set(routes.map((route) => route.city.slug));
    const hasPage = (citySlug, categorySlug) =>
      publishedRoutes.has(`${citySlug}/${categorySlug}`);

    const written = [];

    /** Assemble a page from the shell: head tags in, content after #root */
    async function writePage({ urlPath, title, description, canonical, jsonLd, pageData }) {
      const head = [
        `<title>${escapeAttr(title)}</title>`,
        `<meta name="description" content="${escapeAttr(description)}">`,
        `<link rel="canonical" href="${escapeAttr(canonical)}">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="${meta.SITE_NAME}">`,
        `<meta property="og:title" content="${escapeAttr(title)}">`,
        `<meta property="og:description" content="${escapeAttr(description)}">`,
        `<meta property="og:url" content="${escapeAttr(canonical)}">`,
        `<meta property="og:image" content="${meta.SITE_URL}/icon.png">`,
        `<meta property="og:image:width" content="512">`,
        `<meta property="og:image:height" content="512">`,
        // The only image we have is the square app icon, so claim the small
        // card. A 1200x630 card image would be worth making
        `<meta name="twitter:card" content="summary">`,
        `<meta name="twitter:title" content="${escapeAttr(title)}">`,
        `<meta name="twitter:description" content="${escapeAttr(description)}">`,
        `<meta name="twitter:image" content="${meta.SITE_URL}/icon.png">`,
        ...jsonLd.map(
          (entry) => `<script type="application/ld+json">${escapeJson(entry)}</script>`
        ),
      ].join("\n    ");

      // The shell always carries the placeholder title from index.html
      let html = shell.replace(
        /<title>[\s\S]*?<\/title>/,
        `${HEAD_OPEN}\n    ${head}\n    ${HEAD_CLOSE}`
      );

      const body = renderToStaticMarkup(createElement(PrerenderedPage, { data: pageData }));

      // The prerendered content sits after #root and is removed once React has
      // mounted and is rendering the same component inside the real sheet
      html = html.replace(
        '<div id="root"></div>',
        `<div id="root"></div>\n` +
          `    ${BODY_OPEN}\n` +
          `    <div id="seo-prerender"><div class="seo-prerender-inner">${body}</div></div>\n` +
          `    <script type="application/json" id="${PAGE_DATA_ELEMENT_ID}">${escapeJson(
            pageData
          )}</script>\n` +
          `    ${BODY_CLOSE}`
      );

      const dir = path.join(DIST, urlPath);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "index.html"), html);
      written.push(urlPath || "/");
    }

    // ---- Category pages ----
    for (const route of routes) {
      const routeArg = { city: route.city, categorySeo: route.categorySeo };
      const neighbours = meta.neighbourLinksFor(route.city, route.categorySeo.slug, hasPage);
      const pageData = {
        kind: "category",
        citySlug: route.city.slug,
        categorySlug: route.categorySeo.slug,
        count: route.count,
        pois: route.pois,
        ...neighbours,
        updatedAt: route.updatedAt,
      };

      await writePage({
        urlPath: `${route.city.slug}/${route.categorySeo.slug}`,
        title: meta.titleFor(routeArg, route.count),
        description: meta.descriptionFor(routeArg, route.count),
        canonical: meta.categoryUrl(route.city.slug, route.categorySeo.slug),
        jsonLd: meta.buildJsonLd(routeArg, pageData),
        pageData,
      });
    }

    // ---- City hub pages ----
    const citiesWithPages = new Map();
    for (const route of routes) {
      if (!citiesWithPages.has(route.city.slug)) {
        citiesWithPages.set(route.city.slug, {
          city: route.city,
          entries: [],
          updatedAt: route.updatedAt,
        });
      }
      const hub = citiesWithPages.get(route.city.slug);
      hub.entries.push({ categorySeo: route.categorySeo, count: route.count });
      // The hub is as current as its most recently refreshed category
      if (route.updatedAt > hub.updatedAt) hub.updatedAt = route.updatedAt;
    }

    for (const { city, entries, updatedAt } of citiesWithPages.values()) {
      const categories = entries.map((entry) => entry.categorySeo);
      const totalPoints = entries.reduce((sum, entry) => sum + entry.count, 0);
      await writePage({
        urlPath: city.slug,
        title: meta.cityTitleFor(city, categories),
        description: meta.cityDescriptionFor(city, categories, totalPoints),
        canonical: meta.cityUrl(city.slug),
        jsonLd: meta.buildCityJsonLd(city, categories, totalPoints),
        pageData: {
          kind: "city",
          citySlug: city.slug,
          entries: entries.map((entry) => ({
            categorySlug: entry.categorySeo.slug,
            count: entry.count,
          })),
          nearbyCities: meta.neighbourCitiesFor(city, (slug) => publishedCities.has(slug)),
          updatedAt,
        },
      });
    }

    // ---- Map root ----
    // Its content is the city index, which is how a crawler reaches every hub
    // page from the one URL that gets linked externally
    await writePage({
      urlPath: "",
      title: "Wayside — public toilets, drinking water and playgrounds on one map",
      description:
        "Find the small points of interest that are hard to look up elsewhere: public " +
        "toilets, drinking water, playgrounds, post boxes and 16 more categories, " +
        "anywhere in the world. Free, no signup, built on OpenStreetMap.",
      canonical: meta.SITE_URL,
      jsonLd: meta.buildHomeJsonLd(),
      pageData: {
        kind: "home",
        citySlugs: [...citiesWithPages.keys()],
      },
    });

    // ---- 404 ----
    // Cloudflare serves this with a real 404 status, so unknown paths stop
    // being infinite soft 200s
    const notFound = shell
      .replace(
        /<title>[\s\S]*?<\/title>/,
        `${HEAD_OPEN}\n    <title>Page not found | ${meta.SITE_NAME}</title>\n` +
          `    <meta name="robots" content="noindex">\n    ${HEAD_CLOSE}`
      )
      .replace(
        '<div id="root"></div>',
        `<div id="root"></div>\n    ${BODY_OPEN}\n` +
          `    <div id="seo-prerender"><div class="seo-prerender-inner">` +
          `<h1 class="info-sheet-title">Page not found</h1>` +
          `<p class="info-sheet-summary">There is no page at this address. ` +
          `<a href="/">Open the map</a> and search from any area instead.</p>` +
          `</div></div>\n    ${BODY_CLOSE}`
      );
    await writeFile(path.join(DIST, "404.html"), notFound);

    // ---- Sitemap ----
    const priorityFor = (tier) => (tier === 1 ? "0.9" : tier === 2 ? "0.7" : "0.5");
    const urls = [
      `<url><loc>${meta.SITE_URL}</loc><priority>1.0</priority></url>`,
      ...[...citiesWithPages.values()].map(
        ({ city, updatedAt }) =>
          `<url><loc>${meta.cityUrl(city.slug)}</loc><lastmod>${updatedAt}</lastmod>` +
          `<priority>${priorityFor(city.tier)}</priority></url>`
      ),
      ...routes.map(
        (route) =>
          `<url><loc>${meta.categoryUrl(route.city.slug, route.categorySeo.slug)}</loc>` +
          `<lastmod>${route.updatedAt}</lastmod>` +
          `<priority>${priorityFor(route.city.tier)}</priority></url>`
      ),
    ];
    await writeFile(
      path.join(DIST, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
          "\n"
        )}\n</urlset>\n`
    );

    console.log(
      `Prerendered ${written.length} pages ` +
        `(${routes.length} category, ${citiesWithPages.size} city, 1 root), ` +
        `sitemap has ${urls.length} URLs.`
    );

    const skipped = CITIES.length * CATEGORY_SEO.length - routes.length;
    if (skipped > 0) {
      console.log(
        `Skipped ${skipped} routes: under ${meta.MIN_POIS_FOR_PAGE} points, or no data yet.`
      );
    }
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
