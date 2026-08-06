# Overpass API

A self hosted Overpass instance holding only the map objects Wayside asks for.

The public Overpass mirrors are donated infrastructure shared by everybody, and
the app spends real effort working around that: four fallback URLs, two passes,
exponential backoff, and a `seo:data` job that sleeps 2.5 seconds between
queries and still takes days to come round. This replaces all of it with one
server that answers in milliseconds because it holds a few hundred thousand
objects instead of ten billion.

## What is in it

One container. Overpass is a set of files under `/db` read by the process that
answers queries, so there is no separate database server to run: the volume
`overpass-db` *is* the database.

The extract is filtered before it is imported. `osmium-filter.txt` is generated
from `CATEGORY_CONFIG` in the app, so the database holds drinking fountains,
playgrounds, post boxes and the seventeen other categories, and nothing else.
On the Monaco extract used to test this, the filter keeps about 3% of the file;
the ratio is what decides whether a country fits on a small server.

The tradeoff is that it only answers *our* queries. Ask it for restaurants and
it will honestly tell you there are none.

## Running it

```bash
cp .env.example .env          # pick the region, the port, the origin
docker compose up -d --build
docker compose logs -f        # the first import takes a while
```

Then point the app at it, in `apps/frontend/.env`:

```
VITE_OVERPASS_API_URL=http://localhost:12345/api/interpreter
```

and rebuild the frontend. With that set the app queries this server once per
search, with no failover and no retries: it is ours, so a failure is a real
failure and worth showing rather than hiding behind another mirror.

Check it by hand:

```bash
curl -s 'http://localhost:12345/api/interpreter' \
  --data '[out:json];nwr[amenity=drinking_water](60.15,24.9,60.19,25.0);out center;' | head
```

## Keeping it current

```bash
docker compose exec overpass update-poi-db
```

Downloads the extract again, filters it, builds a second database next to the
live one and swaps them at the end. Queries are answered throughout; the API is
down for the second the swap takes. Weekly from cron is plenty for these
categories:

```cron
30 4 * * 0 cd /srv/wayside/apps/overpass && docker compose exec -T overpass update-poi-db >> /var/log/wayside-overpass.log 2>&1
```

It needs room for the extract plus a second copy of the database while it runs.

Why a reimport rather than the minute diffs Overpass normally applies: a diff
carries every object in the region, and nothing in it says which of them our
filter kept. Applying diffs would slowly refill the database with exactly the
objects we left out. `OVERPASS_DIFF_URL` is deliberately unset.

## After changing the categories

`osmium-filter.txt` is generated. A new category in `CATEGORY_CONFIG` is not in
the database until the file is regenerated and the data reimported:

```bash
npm run overpass:filters      # from the repo root, rewrites osmium-filter.txt
docker compose up -d --build  # bake the new filter into the image
docker compose exec overpass update-poi-db
```

Until then the new category simply comes back empty. The image workflow already
refuses to publish a stale filter, with
`npm run -w @wayside/frontend overpass:filters -- --check`.

## Files

| File | What it is |
| --- | --- |
| `Dockerfile` | `wiktorn/overpass-api` plus the filter, the two commands and the entrypoint hooks |
| `docker-compose.yml` | The service, its volume and every setting worth changing |
| `osmium-filter.txt` | Generated from `CATEGORY_CONFIG`. Do not edit |
| `bin/filter-osm-extract` | Cuts an extract down to the tags in the filter |
| `bin/update-poi-db` | Rebuild and swap, with the API up throughout |
| `initdb.d/05-db-permissions.sh` | Lets the FastCGI worker reach the dispatcher's socket |
| `initdb.d/10-cors.sh` | Replaces the interpreter's fixed `Access-Control-Allow-Origin` with a configurable one |
| `initdb.d/20-supervisorctl.sh` | Gives supervisorctl a socket, so the swap can stop the dispatcher properly |

The `initdb.d` scripts are hooks the upstream entrypoint runs on every start,
before the server comes up. Each patches something the image gets wrong for
this use, and each says why in its own header.

## Prebuilt image

[`build-overpass-image.yml`](../../.github/workflows/build-overpass-image.yml)
publishes `ghcr.io/<owner>/poifinder/overpass` on every change under
`apps/overpass/`, for amd64 and arm64. No OSM data is in it: the image is the
server and the tag filter, and a container imports its own extract on first
start. To run that instead of building locally, replace the `build:` block in
`docker-compose.yml` with `image: ghcr.io/<owner>/poifinder/overpass:latest`.

## Notes on the settings

- **Region.** `OVERPASS_PLANET_URL` is the whole of it. Country extracts from
  [Geofabrik](https://download.geofabrik.de/), city sized ones from
  [download.openstreetmap.fr](https://download.openstreetmap.fr/extracts/).
- **Meta data is off.** Who edited an object and when roughly doubles the
  database and the app shows none of it.
- **Areas are off.** Area queries need a background job rebuilding them
  continuously. Every query the app makes is `around:`, a bbox or a polygon.
- **TLS.** The container speaks plain HTTP. A page served over https cannot
  call an http API, so put a reverse proxy in front of it before pointing a
  deployed frontend at it.
- **CORS.** `OVERPASS_CORS_ORIGIN` is a browser rule, not access control. Use
  the firewall if the instance should not be public.
