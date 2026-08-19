# Overpass API

A self hosted Overpass instance holding only the map objects Wayside asks for.

The public Overpass mirrors are donated infrastructure shared by everybody, and
the app spends real effort working around that: four fallback URLs, two passes,
exponential backoff, and a `seo:data` job that sleeps 2.5 seconds between
queries and still takes days to come round. This replaces all of it with one
server that answers in milliseconds because it holds a few hundred thousand
objects instead of ten billion.

## What is in it

Overpass is a set of files under `/db` read by the process that answers
queries, so there is no separate database server to run: the directory *is* the
database. One container is enough to develop against. On a server it is two,
one answering queries and one building the data, sharing that directory —
"On a server" below says why.

The extract is filtered before it is imported. `osmium-filter.txt` is generated
from `CATEGORY_CONFIG` in the app, so the database holds drinking fountains,
playgrounds, post boxes and the twenty-odd other categories, and nothing else.
On the Netherlands extract, 1.4 GB of OpenStreetMap comes out as 21 MB, or
about 1.5%, member nodes included. That ratio is what lets a continent fit on
a small server; it is not what decides whether the *import* fits, which is
"Covering a continent" below.

The tradeoff is that it only answers *our* queries. Ask it for restaurants and
it will honestly tell you there are none.

### And the buildings those points stand in

One thing goes back in after the filter. A toilet in a shopping centre is a
node with `amenity=toilets` on it and nothing else: which centre it is, what
street it is on and when the doors are open all belong to the building around
it, which the filter drops. `bin/join-buildings` works out which building
contains which point and puts those buildings back — and only those.

They go back **as they are**: real ways and relations with the nodes they are
drawn from, no tag added to them and none added to the points either. Nothing
in the database says which point belongs to which building. The app asks for
the buildings within 150 m of a point when its popup opens and tests which one
contains it, which is the same work done in the one place that can also do it
against a mirror we do not own.

That is the reason this step exists at all, rather than a shortcut it takes:
the app could do the geometry against any Overpass, but *this* database has no
buildings in it whatsoever without it. The tag filter drops every one, so the
question comes back honestly answered "there are none".

On Bremen, 843 of 6982 points land inside one of 578 buildings, and the extract
grows about a sixth — 602 KB to 714 KB. Set `WAYSIDE_JOIN_BUILDINGS=false` to
leave it out; the app then finds no building on this server and says nothing
about one, exactly as it did before any of this existed.

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
docker compose exec overpass update-poi-db            # one container
docker compose -f docker-compose.prod.yml exec importer update-poi-db   # on a server
```

Downloads the extract again, filters it, builds a second database next to the
live one and swaps them at the end. Queries are answered throughout; the API is
down for the second the swap takes, plus the restart if the server is in
another container. Weekly is plenty for these categories, and on a server that
schedule is already in
[`docker-compose.prod.yml`](docker-compose.prod.yml) — see below.

It needs room for the extract plus a second copy of the database while it runs.

Why a reimport rather than the minute diffs Overpass normally applies: a diff
carries every object in the region, and nothing in it says which of them our
filter kept. Applying diffs would slowly refill the database with exactly the
objects we left out. `OVERPASS_DIFF_URL` is deliberately unset.

## Covering a continent

One country is one download and needs nothing special. A continent does:
`europe-latest.osm.pbf` is 35 GB, and filtering it means holding all 35 GB on
the disk while osmium reads it four times over. That is what gets a small
server killed, and it gets killed hours in, having downloaded all 35 GB first.

Set a region list and the extract is built out of the regions in that list
instead, one at a time: download, filter, throw the download away, keep the few
megabytes that survived, and merge the pieces at the end. Same places, same
bytes over the wire, but nothing ever holds more than the largest single
region.

Two lists ship in the image, and they are alternatives rather than layers:

| List | Regions | Download | Covers |
| --- | --- | --- | --- |
| [`world-regions.txt`](world-regions.txt) | 87 | ~54 GB | every city in `src/seo/cities.ts` |
| [`europe-regions.txt`](europe-regions.txt) | 49 | ~35 GB | Europe, which is 88 of those cities |

The world list is Europe's countries plus the regions the other 60 cities sit
in. Most are whole countries; the United States and Canada are the states and
provinces that have a city in them, because `us-latest.osm.pbf` alone is 11 GB
against France's 4.7 and would more than double the peak the whole design
exists to keep down. The nineteen states are 6.4 GB together and 1.2 GB at the
largest, so going from Europe to the world costs download time and leaves peak
disk exactly where it was.

A search outside whichever list is in use comes back empty rather than failing,
so on the Europe list the map simply has nothing to show in New York or Tokyo.

`WAYSIDE_REGION_LIST` is the whole setting, and where it goes depends on which
half of the work you are configuring:

```yaml
WAYSIDE_REGION_LIST: /opt/wayside/world-regions.txt
```

On a server that is the importer's, and `update-poi-db` builds the database
from it — no `OVERPASS_PLANET_URL` involved at all, because nothing imports on
startup there. See "On a server" below.

To do the same in a single container, where the entrypoint's own init is what
imports, it takes two more settings, because that entrypoint insists on
downloading `OVERPASS_PLANET_URL` before it will run anything:

```yaml
WAYSIDE_REGION_LIST: /opt/wayside/world-regions.txt
OVERPASS_PLANET_URL: https://download.geofabrik.de/europe/monaco-latest.osm.pbf
OVERPASS_PLANET_PREPROCESS: build-region-extract /db/planet.osm.bz2
```

Monaco is the smallest thing Geofabrik publishes, and `build-region-extract`
replaces it in place before the import ever sees it.

The list is URLs, one per line, comments allowed. Any extract works; the only
rule is that the regions must not overlap, or their shared objects are imported
twice. Geofabrik's four European aggregates are left out for exactly that
reason, and the file says so; so is all of China, in favour of the Hong Kong
extract on its own.

A line may carry a name after the URL, which is what `--refresh` and the files
in `/db/regions` use:

```
https://download.geofabrik.de/north-america/us/georgia-latest.osm.pbf  us-georgia
```

Without one the name is the basename, which is unique for countries and not
below them — `europe/georgia` and `us/georgia` are both `georgia`, and two
regions answering to one name is an error rather than something the build
guesses at. Subdivisions in `world-regions.txt` are therefore named
explicitly, countries are not.

A run that dies is resumable: a region already downloaded and filtered is not
fetched again, so the next attempt picks up where it stopped rather than
starting 35 GB over. Under `--refresh=all` parts older than a day are refetched,
so a rebuild cannot quietly ship a country from the week before.

### Refreshing one country at a time

The filtered per region files are kept in `/db/regions` between runs, which is
what lets a refresh be one country rather than a continent:

```bash
update-poi-db --refresh=finland   # this one, everything else as it stands
update-poi-db --refresh=random    # one of the 87, picked by dice
update-poi-db --refresh=oldest    # the one refreshed longest ago
update-poi-db --refresh=a,b,c     # these, by name
update-poi-db                     # all of them, the full rebuild
```

The list may mix names with `oldest` and `random`, which is what the nightly
schedule uses:

```bash
update-poi-db --refresh=finland,oldest   # Finland, plus whatever waited longest
```

One run rather than two matters here, and the reason is in the next paragraph.

A region with no part yet is always fetched, whatever `--refresh` says, so a
country cannot quietly go missing from the map.

**This makes the download smaller and nothing else smaller.** Overpass cannot
update part of a database, so every one of these still merges all 87 parts,
compresses them and imports the lot. A nightly one country refresh is one
country downloaded and the whole world imported, seven times a week — more
total CPU than one weekly rebuild, spread thinner. That is the trade, and it is
worth making on purpose rather than by accident.

`oldest` is worth preferring over `random` if the aim is coverage: with 87
regions and a nightly run it guarantees every region is refreshed within 87
days, where random leaves some waiting much longer than that. On the world list
that bound is worth checking against how often you actually run it — every
other night makes it closer to six months.

Because regions now age independently, the database reports the **oldest** of
them as its `timestamp_osm_base` rather than the newest. Reporting the newest
would say the map is a day old on the strength of the one country refreshed
last night, while the rest of the continent is two months behind. Each run logs
the full span:

```
regions span 2026-06-14T20:21:23Z (oldest, and what the database reports) to 2026-08-11T20:21:23Z (newest)
```

### What it costs

Splitting by country fixes disk and makes the job resumable. It does **not**
meaningfully lower the memory the filter needs, and it is worth being clear
about why.

`osmium tags-filter` has to know which nodes the ways it keeps are built from,
and it tracks them in a bitmap indexed by node id. The bitmap is sized by the
largest node id in OpenStreetMap — around 13 billion — rather than by how many
nodes are actually kept. Filtering the Netherlands, a 1.4 GB extract, measured:

| | peak RSS |
| --- | --- |
| `tags-filter`, following references | 2.2 GB |
| `tags-filter --omit-referenced` | 153 MB |

The difference is the bitmap, and Monaco pays for the same one Europe does.
Omitting references is not an option: without the member nodes, Overpass cannot
place a way, and `out center` on every parking, playground and beach comes back
empty.

So budget **around 3 GB of usable memory** for the filter step whatever the
region, and add swap if the machine does not have it:

```bash
sudo fallocate -l 8G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Swap is enough here because this is a weekly batch job rather than something in
the request path — it will be slower, and it will finish.

The join adds a pass of its own: `bin/join-buildings` reads the extract again
for the buildings, and holds a copy of them on the disk while it assembles
their outlines. Reckon on the filter step taking about twice as long and on
room for a buildings-only copy of the region — for Bremen, 21 MB of extract
means 9 MB of buildings and six seconds instead of three. Memory is the same
bitmap as above, paid once more. `WAYSIDE_JOIN_BUILDINGS=false` turns it off on
a machine where that is the thing that will not fit.

The import that follows is the other half. `OVERPASS_FLUSH_SIZE` is how much it
buffers before writing: the image defaults to 16, `docker-compose.prod.yml`
sets 8, and 2 will get a very small machine through at the cost of speed.

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
| `Dockerfile` | `wiktorn/overpass-api` plus the filter, the three commands and the entrypoint hooks |
| `docker-compose.yml` | The service, its volume and every setting worth changing |
| `docker-compose.prod.yml` | The deployment: serving and importing split in two, on a host directory |
| `osmium-filter.txt` | Generated from `CATEGORY_CONFIG`. Do not edit |
| `europe-regions.txt` | The countries `europe-latest.osm.pbf` is made of, for building it a piece at a time |
| `world-regions.txt` | Those plus every other region a city in the app sits in. The default |
| `bin/filter-osm-extract` | Cuts an extract down to the tags in the filter, and calls the join |
| `bin/join-buildings` | Puts the buildings the points stand in back, as they are in OpenStreetMap |
| `bin/build-region-extract` | Downloads and filters a region list one country at a time, and merges the result |
| `bin/update-poi-db` | Rebuild and swap, with the API up throughout |
| `initdb.d/05-db-permissions.sh` | Lets the FastCGI worker reach the dispatcher's socket |
| `initdb.d/10-cors.sh` | Replaces the interpreter's fixed `Access-Control-Allow-Origin` with a configurable one |
| `initdb.d/20-supervisorctl.sh` | Gives supervisorctl a socket, so the swap can stop the dispatcher properly |
| `initdb.d/30-wait-for-database.sh` | Holds a serving container back until there is a database, instead of letting it crash into FATAL |

The `initdb.d` scripts are hooks the upstream entrypoint runs on every start,
before the server comes up. Each patches something the image gets wrong for
this use, and each says why in its own header.

## On a server

[`docker-compose.prod.yml`](docker-compose.prod.yml) is the deployment: one
self contained file with the settings written in, so there is no `.env` to keep
in step on the box. Copy it over, make the database directory, start it, and
build the data once:

```bash
scp apps/overpass/docker-compose.prod.yml server:/srv/wayside/
ssh server '
  mkdir -p /srv/wayside/db
  cd /srv/wayside
  docker compose -f docker-compose.prod.yml up -d
  docker compose -f docker-compose.prod.yml exec importer update-poi-db
'
```

That last line is not optional. Nothing in this stack builds a database on its
own, by design, and until it has run the API answers nothing.

It differs from the development compose in four ways. It pulls
`ghcr.io/vaahtokarkki/poifinder/overpass:latest` instead of building. It binds
the port to `127.0.0.1`, because the tunnel is on the same host and nothing
else should reach an unauthenticated API. It runs watchtower, which replaces
containers when a new image is published. And it splits the work in two.

### Two containers

`overpass` answers queries. `importer` builds the data. They share the database
directory and nothing else.

The serving container sets `OVERPASS_MODE: serve`, which is not a mode the
upstream entrypoint recognises — and that is the point. The entrypoint
downloads and imports under `init` and `clone` only, so under any other value
it goes straight to serving whatever is already in `/db`. There is no
`OVERPASS_PLANET_URL` in that service at all. Restarting it is eight seconds
and no network.

That matters more than it sounds. With the import in the serving container's
startup path, an import that died left no `/db/init_done` behind, and
`restart: unless-stopped` then started the 35 GB download again from the top,
and again after that. An out of memory kill during the first import turned into
a machine that downloaded Europe forever.

On a machine with no database yet, the serving container waits rather than
starting. Without that, supervisord starts the dispatcher, the dispatcher exits
because `/db/db` is not there, and after four tries in eight seconds supervisor
gives up permanently — `FATAL` is forever, so a database appearing an hour
later would not bring it back. It waits instead, says so once a minute, and
starts on its own the moment one appears.

The importer holds the region list, the CPU limit and the Docker socket, and
its entrypoint is `sleep infinity`. It does nothing until something runs
`update-poi-db` in it. The database directory is swapped by rename, and because
a server that was already running has the old files open and would go on using
them, the importer then restarts it through the Docker API — which is what the
socket is for, and why the old directory is only deleted once that has worked.
If the restart fails, the previous database is left in place and the log says
what to do by hand. On the very first import there is nothing to restart off,
so it does not: the waiting container picks the database up by itself.

```bash
docker compose -f docker-compose.prod.yml exec importer update-poi-db
```

The importer is capped at `cpus: 1.0` so that a filter measured in hours cannot
take the API down with it, with `OSMIUM_POOL_THREADS: 1` to match — `cpus` is a
share of the machine's time rather than a smaller machine, so osmium would
otherwise start a thread per core and have them take turns on one core's worth.
It is much slower this way. That is the trade: the import is a weekly batch job,
the API is what people are waiting on.

Watchtower only touches containers carrying
`com.centurylinklabs.watchtower.enable=true`, so it leaves the rest of the
machine alone.

The reimports are in the stack too, so nothing goes in the host's crontab:
ofelia reads its jobs from labels on the importer and runs `update-poi-db`
there. The jobs are defined next to the thing they act on and travel with this
file, which is the point — a server rebuilt from this compose file is a server
that is already scheduled.

There are two:

| When | Job | What it refreshes |
| --- | --- | --- |
| Even nights, 02:30 | `refresh-finland` | Finland |
| Odd nights, 02:30 | `refresh-rotating` | Finland, and the least recently refreshed of the other 86 |

So Finland every night, and everywhere else on a rotation of roughly six
months. Finland is the map most likely to be looked at; the rest moves slowly
enough that a season either way does not show.

Both are five field expressions, minutes first. ofelia also accepts six fields
with seconds in front, so if you edit either one, count the fields first — the
same string read in the other dialect shifts every unit by one place.

The odd/even split is what keeps them apart: `2-30/2` and `1-31/2` between them
cover every day of the month exactly once, so one job fires each night and never
two. The obvious alternative — a Finland job every night and an oldest job every
other night — reads better and does not work. A full rebuild takes hours, so the
oldest run would still be going when the Finland run fired, `update-poi-db`'s
lock would skip the second, and Finland would end up refreshed every *other*
night, which is the opposite of the intent.

Naming both regions in one invocation is also cheaper than two runs, because
what none of this makes cheaper is the import. Overpass cannot update part of a
database, so a run rebuilds and reimports all 87 parts whichever ones it
downloaded; only the download shrinks. `--refresh=finland,oldest` is therefore
one extra download and no extra import, where two separate runs would be two
imports.

Both still rebuild and reimport the whole of Europe — see "Refreshing one
country at a time" above for what that costs.

Ofelia and watchtower are deliberately days apart, Sunday and Wednesday.
Replacing the importer mid run throws away hours of work and leaves the data
waiting a week for the next attempt, so an image update must never be able to
land inside the reimport window.

```bash
# what is scheduled, and what happened when it last ran
docker compose -f docker-compose.prod.yml logs ofelia
```

An image update is not a data update. It restarts the containers on the same
database directory; the data is only ever rebuilt by `update-poi-db`.

### Changing a setting the database is built with

`OVERPASS_META` is one of these, and so is `OVERPASS_COMPRESSION`: they describe
the files on disk, not the running server, so editing the compose file changes
nothing until the data is built again. `update-poi-db` reads the variable from
its own environment, which means the importer has to be recreated before it is
run, or it rebuilds with the value it started with:

```bash
# recreate both containers so they see the new value, then rebuild the data
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec importer update-poi-db
```

The reimport is a full one — Overpass cannot add metadata to a database that was
built without it — so it costs whatever a rebuild of the region costs, plus the
3 seconds in 111 that the metadata itself adds. Queries are answered from the
old database throughout and the swap at the end takes a second.

### Where the database lives

`/srv/wayside/db` on the host, bound to `/db` in both containers, rather than a
named volume — so it is somewhere you can point `df` at, back up, or move to a
bigger disk. It has to hold the live database, a second copy of it while the
swap happens, and the importer's working files: the region being downloaded
(France, 4.7 GB, the largest on either list) plus the filtered pieces of the
ones before it.

Moving an existing deployment off the old named volume means copying the data
across, or the next start finds an empty directory and the API answers nothing
until you have run the importer again:

```bash
docker compose -f docker-compose.prod.yml down
mkdir -p /srv/wayside/db
docker run --rm -v overpass-db:/from -v /srv/wayside/db:/to alpine \
  sh -c 'cd /from && cp -a . /to'
docker compose -f docker-compose.prod.yml up -d
```

If the GitHub package is private, watchtower cannot pull it. Either make the
package public in its settings, or give watchtower a token with
`read:packages` (see the commented `REPO_USER` / `REPO_PASS` in the file).

Watchtower also needs `DOCKER_API_VERSION: "1.40"`, which is set. Its Docker
client asks for API 1.25 and a current daemon refuses anything below 1.40:

```
client version 1.25 is too old. Minimum supported API version is 1.40
```

It exits 1 and restarts forever on that. Only watchtower is affected — ofelia
negotiates a version, so the weekly reimport runs either way. If you ever see
the same message from something else in the stack, this is the setting.

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

- **Region.** `OVERPASS_PLANET_URL` is the whole of it for one country. Country
  extracts from [Geofabrik](https://download.geofabrik.de/), city sized ones
  from [download.openstreetmap.fr](https://download.openstreetmap.fr/extracts/).
  For a continent, set `WAYSIDE_REGION_LIST` as well and see "Covering a
  continent" above.
- **Import memory.** `OVERPASS_FLUSH_SIZE` bounds the importer, and nothing
  bounds the filter: budget about 3 GB for it whatever the region.
- **Meta data is on, and has to stay on.** `OVERPASS_META=yes` is what makes
  `out meta` return the last edit date, which the popup shows under the survey
  date. A database imported without it does not answer such a query with the
  objects minus their timestamps — it answers with **no elements at all**, so
  the map goes empty while the public mirrors carry on working. Measured on the
  Finland extract (900,822 objects after filtering): the database goes from
  2,778,327,394 to 2,785,130,890 bytes, **+6.8 MB, or +0.24%**, and the import
  from 111 to 114 seconds. The cost is five files — `nodes_meta.bin` 5.5 MB,
  `ways_meta.bin` 1.1 MB, `relations_meta.bin` 16 KB, `user_data.bin` 131 KB,
  `user_indices.bin` 33 KB — or about 7.5 bytes an object. Nearly all of the
  2.6 GB is `nodes.map` and `ways.map`, which meta does not touch: those are
  sized by how far the kept ids are scattered across the global id space, which
  a filtered extract maximises. An earlier version of this note claimed meta
  "roughly doubles the database", which is true of neither this database nor
  this setting — `OVERPASS_META=attic` keeps every historic version of every
  object and is the expensive one. Note that Geofabrik's public extracts carry
  `version+timestamp` only, so `changeset` comes back as 0 and `user` empty.
- **Areas are off.** Area queries need a background job rebuilding them
  continuously. Every query the app makes is `around:`, a bbox or a polygon.
- **TLS.** The container speaks plain HTTP, so something has to terminate TLS
  in front of it before a deployed frontend can call it. See below.
- **CORS.** `OVERPASS_CORS_ORIGIN` is a browser rule, not access control. Use
  the firewall if the instance should not be public.
