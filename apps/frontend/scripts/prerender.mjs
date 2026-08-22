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
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
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
     * Work out which routes exist and which of those are worth indexing,
     * before rendering any of them.
     *
     * These are two different questions and used to be one. A route we have
     * data for gets a real page whatever the count, because the app can render
     * it and a URL that works has no business answering 404 — that was
     * /helsinki/luggage-storage, four points, serving the 404 page to a visitor
     * who then watched React draw the map anyway. What the thresholds decide is
     * only whether the page is fit to be indexed: below them it is written with
     * a noindex, left out of the sitemap, and not linked to from anywhere.
     *
     * Internal links still point only at indexable pages, so the link graph a
     * crawler walks is the one we are actually asking it to index.
     */
    const routes = [];
    for (const city of CITIES) {
      const cityData = poiData.get(city.slug);
      if (!cityData) continue;
      for (const categorySeo of CATEGORY_SEO) {
        const entry = cityData.categories?.[categorySeo.slug];
        // No data at all is not the same as an empty result: we cannot write a
        // truthful count for a category that was never queried, and a page
        // claiming zero while the map draws forty is worse than no page
        if (!entry || entry.count < 1) continue;
        const pois = entry.pois ?? [];
        routes.push({
          city,
          categorySeo,
          count: entry.count,
          pois,
          indexable: meta.isIndexable(categorySeo.slug, entry.count, pois.length),
          // This category's own refresh date, so a page whose query failed
          // last time does not inherit a freshness it does not have
          updatedAt: (entry.updatedAt ?? cityData.generatedAt ?? new Date().toISOString()).slice(
            0,
            10
          ),
        });
      }
    }

    const indexableRoutes = routes.filter((route) => route.indexable);
    const publishedRoutes = new Set(
      indexableRoutes.map((route) => `${route.city.slug}/${route.categorySeo.slug}`)
    );
    const publishedCities = new Set(indexableRoutes.map((route) => route.city.slug));
    const hasPage = (citySlug, categorySlug) =>
      publishedRoutes.has(`${citySlug}/${categorySlug}`);

    const written = [];

    /** Assemble a page from the shell: head tags in, content after #root */
    async function writePage({
      urlPath,
      title,
      description,
      canonical,
      jsonLd,
      pageData,
      noindex = false,
    }) {
      const head = [
        `<title>${escapeAttr(title)}</title>`,
        `<meta name="description" content="${escapeAttr(description)}">`,
        `<link rel="canonical" href="${escapeAttr(canonical)}">`,
        // Written, reachable, and deliberately not in the index. "follow" so
        // the links out of it still carry, which is the only reason a crawler
        // that lands here should bother reading it
        ...(noindex ? [`<meta name="robots" content="noindex, follow">`] : []),
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="${meta.SITE_NAME}">`,
        `<meta property="og:title" content="${escapeAttr(title)}">`,
        `<meta property="og:description" content="${escapeAttr(description)}">`,
        `<meta property="og:url" content="${escapeAttr(canonical)}">`,
        `<meta property="og:image" content="${meta.OG_IMAGE.url}">`,
        `<meta property="og:image:type" content="${meta.OG_IMAGE.type}">`,
        `<meta property="og:image:width" content="${meta.OG_IMAGE.width}">`,
        `<meta property="og:image:height" content="${meta.OG_IMAGE.height}">`,
        `<meta property="og:image:alt" content="${escapeAttr(meta.OG_IMAGE.alt)}">`,
        // The card is 1200x630, so claim the wide one. Twitter falls back to
        // the small card on its own if the image ever fails to fetch
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${escapeAttr(title)}">`,
        `<meta name="twitter:description" content="${escapeAttr(description)}">`,
        `<meta name="twitter:image" content="${meta.OG_IMAGE.url}">`,
        `<meta name="twitter:image:alt" content="${escapeAttr(meta.OG_IMAGE.alt)}">`,
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
        noindex: !route.indexable,
      });
    }

    // ---- City hub pages ----
    // A hub lists only the categories it can send a visitor to a real page
    // for. A city whose every category is thin still gets a hub, so the URL
    // resolves, but it is noindex and lists nothing
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
      if (route.indexable) {
        hub.entries.push({ categorySeo: route.categorySeo, count: route.count });
      }
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
        jsonLd: meta.buildCityJsonLd(city, categories, totalPoints, updatedAt),
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
        noindex: entries.length === 0,
      });
    }

    // ---- City index ----
    // Only the cities with something to land on: this page is the one path
    // into the hubs, so a link from here is a promise the page is worth
    // reading, and a hub left out of it has nothing pointing at it at all
    const indexedHubs = [...citiesWithPages.values()].filter(({ city }) =>
      publishedCities.has(city.slug)
    );
    const indexedCities = indexedHubs.map(({ city }) => city);
    const countryCount = new Set(indexedCities.map((city) => city.country)).size;
    // The index is as current as the newest hub it lists, which is the same
    // date the sitemap gives it below
    const citiesUpdatedAt = indexedHubs
      .map(({ updatedAt }) => updatedAt)
      .sort()
      .at(-1);

    if (indexedCities.length > 0) {
      await writePage({
        urlPath: "cities",
        title: meta.citiesTitle(indexedCities.length),
        description: meta.citiesDescription(indexedCities.length, countryCount),
        canonical: meta.CITIES_URL,
        jsonLd: meta.buildCitiesJsonLd(indexedCities, citiesUpdatedAt),
        pageData: {
          kind: "cities",
          citySlugs: indexedCities.map((city) => city.slug),
        },
      });
    }

    // ---- Map root ----
    // It links to the index above rather than being it. That link is the whole
    // of the root's job in the link graph and the only reason the hub pages are
    // reachable from the one URL anything external points at
    await writePage({
      urlPath: "",
      title: "Wayside — public toilets, drinking water and playgrounds on one map",
      description:
        "Find the small points of interest that are hard to look up elsewhere: public " +
        "toilets, drinking water, playgrounds, post boxes and 16 more categories, " +
        "anywhere in the world. Free, no signup, built on OpenStreetMap.",
      canonical: meta.HOME_URL,
      jsonLd: meta.buildHomeJsonLd(),
      pageData: {
        kind: "home",
        cityCount: indexedCities.length,
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
          `<a href="/">Open the map</a> and search from any area instead` +
          // The address that got here is usually a city we have no page for,
          // so the index is the more useful of the two offers. It is noindex
          // above, so this is for the visitor rather than for a crawler
          (indexedCities.length > 0
            ? `, or see the <a href="${meta.CITIES_PATH}">cities with a page of their own</a>.`
            : `.`) +
          `</p>` +
          `</div></div>\n    ${BODY_CLOSE}`
      );
    await writeFile(path.join(DIST, "404.html"), notFound);

    // ---- Sitemap ----
    // ---- Sitemaps ----
    //
    // Indexable routes only. A sitemap is a list of pages we are asking to have
    // indexed, so listing a noindex page in it is a contradiction a crawler
    // spends budget discovering.
    //
    // Split one file per category, behind an index at the old address, because
    // Search Console reports coverage per sitemap. One blended "1 of 25
    // indexed" says nothing about what to do next; twenty-one lines saying
    // toilets are indexed and picnic spots are not is the difference between
    // pruning the category list deliberately and guessing at it. Nothing here
    // is near the 50,000 URL limit — the split is for the reporting.
    const priorityFor = (tier) => (tier === 1 ? "0.9" : tier === 2 ? "0.7" : "0.5");
    // Google ignores <priority> and has for years; it stays because Bing still
    // documents it and it costs a few bytes. <lastmod> is the one that counts,
    // and ours is per category rather than the build clock, which is the only
    // reason it is worth sending
    const urlEntry = (loc, lastmod, tier) =>
      `<url><loc>${loc}</loc>` +
      (lastmod ? `<lastmod>${lastmod}</lastmod>` : "") +
      `<priority>${tier === null ? "1.0" : priorityFor(tier)}</priority></url>`;

    /** A child sitemap, and the newest lastmod in it for the index */
    const children = [];
    const addChild = (name, urls, lastmods) => {
      if (urls.length === 0) return;
      children.push({ name, count: urls.length, lastmod: lastmods.sort().at(-1) });
      return writeFile(
        path.join(DIST, name),
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
            "\n"
          )}\n</urlset>\n`
      );
    };

    // The root and the city hubs. Kept together because they are one job —
    // "is the shape of the site indexed" — separate from any single category
    const hubs = [...citiesWithPages.values()].filter(({ entries }) => entries.length > 0);
    // The index sits between them and is as current as the newest hub in it:
    // its content is the list, so it changes exactly when the list does
    const hubsLastmod = hubs.map(({ updatedAt }) => updatedAt).sort().at(-1);
    await addChild(
      "sitemap-cities.xml",
      [
        urlEntry(meta.HOME_URL, null, null),
        ...(indexedCities.length > 0 ? [urlEntry(meta.CITIES_URL, hubsLastmod, 1)] : []),
        ...hubs.map(({ city, updatedAt }) => urlEntry(meta.cityUrl(city.slug), updatedAt, city.tier)),
      ],
      hubs.map(({ updatedAt }) => updatedAt)
    );

    for (const categorySeo of CATEGORY_SEO) {
      const forCategory = indexableRoutes.filter(
        (route) => route.categorySeo.slug === categorySeo.slug
      );
      await addChild(
        `sitemap-${categorySeo.slug}.xml`,
        forCategory.map((route) =>
          urlEntry(
            meta.categoryUrl(route.city.slug, route.categorySeo.slug),
            route.updatedAt,
            route.city.tier
          )
        ),
        forCategory.map((route) => route.updatedAt)
      );
    }

    // A category that stops being indexable — every route in it thin, or the
    // whole category paused — leaves its child sitemap behind from the last
    // build. `vite build` empties dist and never sees one, but `npm run
    // prerender` on its own is meant to be re-runnable, and a stale file full
    // of noindex URLs is the exact contradiction the split exists to avoid
    const wanted = new Set(children.map(({ name }) => name));
    for (const file of await readdir(DIST)) {
      if (/^sitemap-.*\.xml$/.test(file) && !wanted.has(file)) {
        await rm(path.join(DIST, file));
        console.log(`Removed ${file}, nothing in it is indexable any more.`);
      }
    }

    // The index keeps the address robots.txt already advertises and Search
    // Console is already submitted against, so the split costs no resubmission
    await writeFile(
      path.join(DIST, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        children
          .map(
            ({ name, lastmod }) =>
              `<sitemap><loc>${meta.SITE_URL}/${name}</loc>` +
              (lastmod ? `<lastmod>${lastmod}</lastmod>` : "") +
              `</sitemap>`
          )
          .join("\n") +
        `\n</sitemapindex>\n`
    );
    const urls = children.reduce((sum, child) => sum + child.count, 0);

    const indexableCities = [...citiesWithPages.values()].filter(
      ({ entries }) => entries.length > 0
    ).length;
    console.log(
      `Prerendered ${written.length} pages ` +
        `(${routes.length} category, ${citiesWithPages.size} city, ` +
        `${indexedCities.length > 0 ? "1 index, " : ""}1 root), ` +
        `${urls} URLs across ${children.length} sitemaps behind sitemap.xml.`
    );
    const pausedRoutes = routes.filter((route) =>
      meta.PAUSED_CATEGORIES.has(route.categorySeo.slug)
    ).length;
    console.log(
      `Indexable: ${indexableRoutes.length} category, ${indexableCities} city. ` +
        `${routes.length - indexableRoutes.length - pausedRoutes} category pages are noindex ` +
        `(under ${meta.MIN_POIS_FOR_PAGE} points or ${meta.MIN_NAMED_POIS_FOR_PAGE} listable), ` +
        `${pausedRoutes} more in the ${meta.PAUSED_CATEGORIES.size} paused categories ` +
        `(${[...meta.PAUSED_CATEGORIES].join(", ")}).`
    );

    const noData = CITIES.length * CATEGORY_SEO.length - routes.length;
    if (noData > 0) {
      console.log(
        `${noData} routes have no data and no page, so they 404. ` +
          `Run \`npm run seo:data\` to fill them in.`
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
