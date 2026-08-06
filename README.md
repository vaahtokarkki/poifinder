# Wayside

A map of the small points of interest that are hard to find anywhere else:
public toilets, drinking water, playgrounds, post boxes, luggage lockers,
shelters and more, from OpenStreetMap.

## Layout

| Directory | What it is |
| --- | --- |
| [`apps/frontend`](apps/frontend) | The app: React, Leaflet, and the prerender that turns every route into a real HTML file. Deployed to Cloudflare |
| [`apps/overpass`](apps/overpass) | A self hosted Overpass API, holding only the categories the app queries. Docker, one container |

The two halves are independent. The app runs against the public Overpass
mirrors out of the box and only talks to `apps/overpass` when
`VITE_OVERPASS_API_URL` is set, so nothing here needs a server to develop
against.

## Getting started

```bash
npm install        # workspaces, so this installs the frontend too
npm run dev        # the app, against the public Overpass mirrors
npm run build      # bundle, then prerender every indexable route
```

### With your own Overpass

The public mirrors are shared, slow under load and rate limited, which is why
the client carries four fallback URLs and two passes of exponential backoff.
Running your own removes all of that:

```bash
cd apps/overpass
cp .env.example .env
docker compose up -d --build     # first run imports the extract, give it time
```

Then, in `apps/frontend/.env`:

```
VITE_OVERPASS_API_URL=http://localhost:12345/api/interpreter
```

With that set the app sends one request per search and no retries, and
`npm run seo:data` (`OVERPASS_API_URL=...`) finishes in minutes rather than
days. See [`apps/overpass/README.md`](apps/overpass/README.md).

## Scripts

Run from the repo root; each delegates to the workspace that owns it.

| Command | What it does |
| --- | --- |
| `npm run dev` | The app, on `--host` so a phone on the same network can open it |
| `npm run build` | `vite build` then the prerender |
| `npm run seo:data` | Refreshes `apps/frontend/data/poi/*.json` from Overpass |
| `npm run deploy` | Builds and pushes to Cloudflare |
| `npm run overpass:filters` | Regenerates `apps/overpass/osmium-filter.txt` from `CATEGORY_CONFIG` |
| `npm run overpass:up` | Builds and starts the Overpass container |
| `npm run overpass:update` | Reimports its database from a fresh extract |
