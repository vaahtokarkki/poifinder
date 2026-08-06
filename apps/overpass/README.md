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
search, with no retries: it is ours, so there is no rate limit to wait out. If
it does not answer, the app falls back to the public mirrors and says so in the
loading screen, which is the only time it says anything there.

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
down for the second the swap takes. Weekly is plenty for these categories, and
on a server that schedule is already in
[`docker-compose.prod.yml`](docker-compose.prod.yml) — see below.

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

## On a server

[`docker-compose.prod.yml`](docker-compose.prod.yml) is the deployment: one
self contained file with the settings written in, so there is no `.env` to keep
in step on the box. Copy it over and start it:

```bash
scp apps/overpass/docker-compose.prod.yml server:/srv/wayside/
ssh server 'cd /srv/wayside && docker compose -f docker-compose.prod.yml up -d'
```

It differs from the development compose in three ways. It pulls
`ghcr.io/vaahtokarkki/poifinder/overpass:latest` instead of building. It binds
the port to `127.0.0.1`, because the tunnel is on the same host and nothing
else should reach an unauthenticated API. And it runs watchtower, which
replaces the container when a new image is published.

Watchtower only touches containers carrying
`com.centurylinklabs.watchtower.enable=true`, so it leaves the rest of the
machine alone.

The weekly reimport is in the stack too, so nothing goes in the host's crontab:
ofelia reads its jobs from labels on the overpass container and runs
`update-poi-db` there every Sunday at 04:30. The job is defined next to the
thing it acts on and travels with this file, which is the point — a server
rebuilt from this compose file is a server that is already scheduled.

The two are deliberately days apart, ofelia on Sunday and watchtower on
Wednesday. Restarting the container mid import throws away hours of work and
leaves the data waiting a week for the next attempt, so an image update must
never be able to land inside the reimport window.

```bash
# what is scheduled, and what happened when it last ran
docker compose -f docker-compose.prod.yml logs ofelia
```

An image update is not a data update. It restarts the server on the same
volume; the database is only ever rebuilt by `update-poi-db`.

If the GitHub package is private, watchtower cannot pull it. Either make the
package public in its settings, or give watchtower a token with
`read:packages` (see the commented `REPO_USER` / `REPO_PASS` in the file).

## Publishing it

The app is a page on https://wayside.cc, so the API has to be reachable from a
stranger's browser over https. The container only speaks http, on purpose:
whatever fronts it is where TLS belongs.

Set `OVERPASS_BIND_ADDR=127.0.0.1` whenever that front end runs on the same
host. Then the port exists only for the tunnel, and the API is not sitting
unauthenticated on the LAN.

### Tailscale funnel

Tailscale is already on the machine for access; funnel is the same daemon
handing one service to the public internet, with a valid certificate on a
`*.ts.net` name.

In the admin console, once: enable HTTPS certificates under DNS, and give the
node the funnel attribute in the policy file:

```json
"nodeAttrs": [{ "target": ["autogroup:member"], "attr": ["funnel"] }]
```

Then on the host:

```bash
sudo tailscale funnel --bg --https=443 http://127.0.0.1:12345
tailscale funnel status        # prints the public URL
```

The mapping is stored in tailscaled's state, so it comes back after a reboot.
Nothing needs to be open on the router: the connection is outbound.

What the funnel costs: the traffic is relayed through Tailscale's servers,
which is meant for sharing a service rather than fronting a public site, so
expect rate limits and added latency under real load. Answers are gzipped by
the container's nginx, which takes most of the sting out of a home uplink.

### Cloudflare tunnel

The same shape on your own domain, and the better fit if the site is already on
Cloudflare: `cloudflared` gives `overpass.wayside.cc` with TLS and DDoS
protection at the edge, again with no inbound ports.

Whichever is used, `VITE_OVERPASS_API_URL` in the frontend build is the public
https URL with `/api/interpreter` on the end, and `OVERPASS_CORS_ORIGIN` should
name the site's origin unless the instance is meant for anyone.

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
- **TLS.** The container speaks plain HTTP, so something has to terminate TLS
  in front of it before a deployed frontend can call it. See below.
- **CORS.** `OVERPASS_CORS_ORIGIN` is a browser rule, not access control. Use
  the firewall if the instance should not be public.
