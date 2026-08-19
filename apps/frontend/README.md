# Wayside frontend

The app itself: a Leaflet map over OpenStreetMap data, plus the prerender that
gives every indexable route a real HTML file.

## Which Overpass it talks to

By default, the public mirrors in `OVERPASS_API_CONFIG`
([`src/constants.ts`](src/constants.ts)): four of them, tried once each and then
again with exponential backoff, because they are donated and shared.

Set `VITE_OVERPASS_API_URL` (see [`.env.example`](.env.example)) and that whole
apparatus moves out of the way. The instance is asked first and asked once: it
is ours, so there is no rate limit to dance around and nothing for a retry loop
to wait out. [`apps/overpass`](../overpass) is such an instance.

The mirrors stay behind it as a fallback, because one machine on one connection
is a single point of failure and an empty map is a worse answer than a slow
one. Nothing appears in the loading screen while the instance is answering
normally — a status line that flashes for 200 ms is noise. It appears only once
the fallback is in use, since those searches are slower and the reason ought to
be visible.

`npm run seo:data` reads the same setting from `OVERPASS_API_URL` in the
environment, and drops its 2.5 second throttle when it is set.

### How a popup knows which building a toilet is in

It works it out. When the popup for a point opens, the app asks for the
buildings within 150 m and tests which one contains it, by ray casting in
`fetchEnclosingBuilding` ([`src/api/overpass.ts`](src/api/overpass.ts)). The
smallest containing one wins — a shop unit rather than the mall it is in — and
its outline is drawn behind the marker in a dashed line, with its tags listed
under the point's own.

OpenStreetMap has no link between the two objects, and Overpass has no query
that asks the question directly: `is_in` would, but it wants areas, which our
own instance deliberately does not build. Geometry is the only honest answer,
and it is the same answer whichever server gives it — this works against the
public mirrors as well as against ours.

The radius is measured rather than picked. Across every point Bremen's import
joins to a building, the median sits 3.4 m from its building's nearest wall,
the 99th percentile 36 m, the deepest 93 m; `around:` measures to a way's walls
rather than to its corners, so 150 m reaches all of them. One query costs 6–26
KB against our instance and about 40 KB against a mirror holding every building
in the city, and it is asked once per popup, cached for the page, and shared
between the outline and the popup text.

What [`apps/overpass`](../overpass) contributes is having any buildings there
to find. Its extract is filtered down to the app's own categories, which drops
every building in the region, so
[`bin/join-buildings`](../overpass/bin/join-buildings) puts back exactly the
ones that contain a point — untouched, and with nothing written onto the points
to mark them.

## Prerendered pages

The app is a client side map, but every indexable URL is a real static HTML
file. `/helsinki/toilets/` is written at build time with its own title,
description, canonical, structured data and a list of named points; it does not
depend on a crawler running our JavaScript, or on Overpass answering.

The pipeline has two halves, deliberately separated so a build never touches
the network:

| Command | What it does |
| --- | --- |
| `npm run seo:data` | Queries Overpass and refreshes `data/poi/*.json`. Slow, rate limited, run on a schedule. |
| `npm run prerender` | Reads `data/poi/`, writes one HTML file per route plus `sitemap.xml` and `404.html`. No network. |

### Trailing slashes

Every URL the site claims for itself ends in one. A page written to
`dist/helsinki/toilets/index.html` is what Cloudflare serves at
`/helsinki/toilets/`, and it answers the un-slashed form with a 307 to it — so
canonicals, `og:url`, breadcrumbs, the sitemap and the internal links all use
the slashed form, and none of them cost a redirect hop. `categoryPath`,
`cityPath` and their `*Url` counterparts in [`src/seo/pageMeta.ts`](src/seo/pageMeta.ts)
are the only places that build one. The app itself does not care: `pathSegments`
in [`src/utils.ts`](src/utils.ts) trims slashes off both ends.
| `npm run build` | `vite build` followed by the prerender. |

`data/poi/` is committed. That makes builds deterministic and means a broken
Overpass mirror can never empty the site.

### Refreshing the OpenStreetMap extract

```bash
npm run seo:data                          # refresh anything older than 7 days
npm run seo:data -- --cities=helsinki     # one city
npm run seo:data -- --force               # ignore freshness
npm run seo:data -- --max-age-days=14     # change what counts as stale
```

A full refresh is thousands of queries against donated infrastructure and takes
hours. The throttle is intentional. Weekly is plenty for these categories.

### Adding a city or a category

- A city is one entry in [`src/seo/cities.ts`](src/seo/cities.ts): slug, name,
  country, coordinates, tier. Everything else follows from it.
- A category needs an entry in `CATEGORY_CONFIG`
  ([`src/constants.ts`](src/constants.ts)) for the Overpass filters, and one in
  [`src/seo/categories.ts`](src/seo/categories.ts) for the slug and the page
  copy. If you run your own Overpass, a new category also needs
  `npm run overpass:filters` and a reimport, or the objects are not in the
  database to be found: see [`apps/overpass`](../overpass).

### Which routes get a page, and which get indexed

These are two questions, and conflating them is what put `/helsinki/toilets`
and `/helsinki/luggage-storage` on opposite sides of a 404.

Every route we have data for gets a real HTML file, whatever the count. The app
can render it, so a URL that works has no business answering 404 while React
draws the map behind the error page.

What the thresholds decide is whether that page is fit to be indexed:

| Threshold | Why |
| --- | --- |
| `MIN_POIS_FOR_PAGE` (8) | How much the map has to show |
| `MIN_NAMED_POIS_FOR_PAGE` (5) | How much of the page is not a template |

The second one matters more than it looks. The intro, all seven FAQ answers and
the link groups are generated from the city name and a number; the list of
named points is the only part that is genuinely this page's. A route with 224
points and none of them named — Helsinki post boxes, which is the case that
prompted the rule — renders three hundred words that differ from another city's
only in the proper nouns. One of those is a page. Three thousand is a
thin-content pattern, and the risk is not that they fail to rank but that they
set how the whole directory gets classified.

A route below either threshold is written with `noindex, follow`, kept out of
`sitemap.xml`, and not linked to from any other page. So internal links still
only ever point at pages we are asking to have indexed, and nothing 404s that
did not deserve to.

A route with no data at all still 404s, because there is no truthful count to
put on it. That is what `npm run seo:data` is for.

### How the pages reach each other

Only one URL on this site gets linked from outside, and it is the root. Every
other page has to be reachable from it or it is an orphan — indexed at best on
the strength of the sitemap, with nothing pointing at it and no anchor text
saying what it is. A sitemap gets a page discovered; it does not stand in for a
link.

So there is a path down and a path back up at every level:

```
/                 the map. One link: "Browse N cities with a page of their own"
  /cities/        the index, grouped by country. Links to every hub
    /helsinki/    the hub. Links to its categories, six nearby cities, /cities/
      /helsinki/toilets/   links to its siblings, the same category in nearby
                           cities, its own hub, and /cities/
```

The index is a page rather than a section of the root because the root is a
map, and someone who opens a map does not want to read a directory of a few
hundred city names first. Moving it cost the hubs nothing: a crawler follows
one link as readily as a hundred, and the hubs now also get a link from every
category page under them, which the breadcrumb had been claiming all along
without the page ever having one.

`/cities` is a reserved first path segment, listed in `RESERVED_SLUGS` in
[`src/utils.ts`](src/utils.ts). Without that the app would read it as a place
name and send it to the geocoder, because an unknown first segment is how a
city we have no page for still centres the map.

### Why the content is duplicated in two places, and why it is not

It is not duplicated. [`PrerenderedPage`](src/components/PrerenderedPage.tsx) is
rendered to static markup by the prerender and rendered again by the running app
inside the bottom sheet, from the same JSON payload embedded in the page. The
crawler and the visitor read the same words by construction. The static copy is
removed once React has mounted, so the page never says everything twice.

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
