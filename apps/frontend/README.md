# Wayside frontend

The app itself: a Leaflet map over OpenStreetMap data, plus the prerender that
gives every indexable route a real HTML file.

## Which Overpass it talks to

By default, the public mirrors in `OVERPASS_API_CONFIG`
([`src/constants.ts`](src/constants.ts)): four of them, tried once each and then
again with exponential backoff, because they are donated and shared.

Set `VITE_OVERPASS_API_URL` (see [`.env.example`](.env.example)) and that whole
apparatus is skipped. The app sends one request to that instance and reports
what comes back, because a server we run has no rate limit to dance around and
no sibling to fail over to. [`apps/overpass`](../overpass) is such an instance.

`npm run seo:data` reads the same setting from `OVERPASS_API_URL` in the
environment, and drops its 2.5 second throttle when it is set.

## Prerendered pages

The app is a client side map, but every indexable URL is a real static HTML
file. `/helsinki/toilets` is written at build time with its own title,
description, canonical, structured data and a list of named points; it does not
depend on a crawler running our JavaScript, or on Overpass answering.

The pipeline has two halves, deliberately separated so a build never touches
the network:

| Command | What it does |
| --- | --- |
| `npm run seo:data` | Queries Overpass and refreshes `data/poi/*.json`. Slow, rate limited, run on a schedule. |
| `npm run prerender` | Reads `data/poi/`, writes one HTML file per route plus `sitemap.xml` and `404.html`. No network. |
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

A route is only published when it has at least `MIN_POIS_FOR_PAGE` points, so
thin pages never reach the index and internal links never point at a 404.

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
