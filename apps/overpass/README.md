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

### And the streets those points stand on

The other half of the same problem, for the points no building contains. A post
box stands at a kerb; so does a bus shelter, a recycling container and a bike
repair stand. Containment has nothing to offer them — 12 of Helsinki's 224 post
boxes are inside anything at all — but they are all *on* a named road, and that
road is an object the tag filter drops as surely as it drops the buildings.

So the filter keeps every named highway. `WAYSIDE_JOIN_STREETS=false` turns it
off, and `bin/filter-osm-extract` does it in two passes, because
`osmium tags-filter` ORs its expressions and what is wanted here is an AND:
the first pass keeps every highway with the nodes it is drawn from, the second
keeps the named ones out of *those*, so a named way in the result is a named
road. The other way round would pull every named object in the extract through
the first pass.

Unlike the buildings there is no geometry step and no selection. A street is
kept for being a named road, not for having a point on it — the points this
database holds are dense enough that nearly every urban street is within thirty
metres of one, so selecting by proximity would drop rural roads and little
else, in exchange for a spatial join's worth of code that can be wrong.

On Bremen that is 21,094 named ways and 96,830 nodes, taking the extract from
603 KB to 2.6 MB against a 21 MB source. It is the largest single thing in the
filtered extract and worth it: it is what lets a page list "post box on
Mannerheimintie" twenty-five times over instead of "post box" twenty-five
times, which is the difference between a page worth indexing and one that is
not. See `placedByStreet` in `apps/frontend/src/seo/categories.ts`.

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

A region that will not download does not stop the run. It is retried
`WAYSIDE_DOWNLOAD_TRIES` times, resuming the transfer where it broke off, and
if it still will not come the build goes on to the next region:

- **There is a part from an earlier run.** It is used as it is, and its
  timestamp is left alone, so the country is a few days out of date rather than
  absent and stays near the front of the `oldest` queue for the next run.
- **There is no part.** The region is left out of this build and reported at
  the end. The next run fetches it whatever `--refresh` says, because a part
  that does not exist is always fetched.

Either way the run says which regions it left behind before it merges, and the
database it reports is dated by the oldest part it actually used.

This matters more than it sounds. The nightly build is eighty-seven downloads
off a free server, so the chance that all of them survive is not the thing to
design around: one reset connection at region 85 used to throw away the
eighty-four already filtered and leave the database untouched for another day.

### When it is the list that is wrong

A bad night fixes itself; a bad URL does not. A region that answers `404`, or
answers `200` with Geofabrik's web page because it was renamed or withdrawn,
will be missing from the map tonight and every night until somebody edits the
list. So that one is not allowed to pass quietly:

| | build the extract | exit status |
|---|---|---|
| download failed, will retry itself | yes, without that region | `0` |
| URL did not answer with an extract | yes, without that region | `2` |
| every region failed | no, the old extract is left alone | `1` |

`update-poi-db` knows about `2`: it imports what was built, swaps the database
in, and *then* exits `2`. Both halves matter. Holding the import back would let
one renamed country freeze the whole database until a human noticed, which is
the failure this section exists to describe; exiting `0` would mean nobody ever
notices at all.

Note that Geofabrik does not 404 an unknown region — it answers `200` with its
download page — so in practice it is the content check that catches this, not
the status code.

### Refreshing one country at a time

The filtered per region files are kept in `/db/regions` between runs, which is
what lets a refresh be one country rather than a continent:

```bash
update-poi-db --refresh=finland   # this one, everything else as it stands
update-poi-db --refresh=random    # one of the 87, picked by dice
update-poi-db --refresh=oldest    # the one refreshed longest ago
update-poi-db --refresh=oldest:2  # the two refreshed longest ago
update-poi-db --refresh=a,b,c     # these, by name
update-poi-db                     # all of them, the full rebuild
```

The list may mix names with `oldest` and `random`, and either of those may take
a count, which is what the nightly schedule uses:

```bash
# the four worth keeping current, plus the two that have waited longest
update-poi-db --refresh=finland,norway,sweden,germany,oldest:2
```

One run rather than six matters here, and the reason is in the next paragraph.

`oldest` and `random` choose *around* the names rather than over them, whatever
order they were written in. On a night when Germany happens to be the least
recently refreshed part, the run above still refreshes six regions rather than
five: `oldest:2` skips what is already spoken for and takes the next two down
the list. `random:N` draws without replacement for the same reason.

A region with no part yet is always fetched, whatever `--refresh` says, so a
country cannot quietly go missing from the map.

**This makes the download smaller and nothing else smaller.** Overpass cannot
update part of a database, so every one of these still merges all 87 parts,
compresses them and imports the lot. A nightly one country refresh is one
country downloaded and the whole world imported, seven times a week — more
total CPU than one weekly rebuild, spread thinner. That is the trade, and it is
worth making on purpose rather than by accident.

`oldest` is worth preferring over `random` if the aim is coverage: it bounds
how long a region can wait, where random leaves some waiting much longer than
the average suggests. The bound is the number of regions divided by how many a
run takes, times the interval — 83 rotating regions at `oldest:2` a night is
about six weeks, where one region every other night was closer to six months.
Raising the count is the dial for that, and what it costs is download time, not
import time.

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
| `bin/rotate-access-log` | The timer for the log rotation, because the image has no cron |
| `initdb.d/05-db-permissions.sh` | Lets the FastCGI worker reach the dispatcher's socket |
| `njs/query-guard.js` | The shape check that runs in front of the interpreter |
| `initdb.d/10-cors.sh` | Replaces the interpreter's fixed `Access-Control-Allow-Origin` with a configurable one |
| `initdb.d/11-robots-txt.sh` | Answers robots.txt with "nothing here", instead of a 404 that reads as permission |
| `initdb.d/12-request-limits.sh` | Rate and body-size limits, and closes the door that let them be walked around |
| `initdb.d/13-query-guard.sh` | Loads njs and puts the query guard in front of `/api/interpreter` |
| `initdb.d/15-access-log.sh` | Moves the access log to the volume as JSON, with the real client address, and rotates it |
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
machine alone. Both containers here carry it, and it checks every ten minutes
(`WATCHTOWER_POLL_INTERVAL: 600`). They are updated together on purpose: they
share an on disk format, and a database written by one version and read by
another is the failure worth avoiding.

Replacing the server is a restart on the same database directory and costs the
queries in flight. Replacing the importer costs more, and this is the trade the
ten minute interval makes: a push can land in the middle of a rebuild and kill
it. `update-poi-db` is resumable, so what is lost is the region in flight
rather than the whole run, and the next scheduled run continues from there — on
a full world build, an hour or two of downloading and filtering. Worth checking
before pushing an image if a rebuild is running:

```bash
# silent means a rebuild is running: the lock is held
docker compose -f docker-compose.prod.yml exec importer \
  flock -n /db/update-poi-db.lock -c 'echo no rebuild running'
```

The reimports are in the stack too, so nothing goes in the host's crontab:
ofelia reads its jobs from labels on the importer and runs `update-poi-db`
there. The jobs are defined next to the thing they act on and travel with this
file, which is the point — a server rebuilt from this compose file is a server
that is already scheduled.

There is one:

| When | Job | What it refreshes |
| --- | --- | --- |
| Every night, 02:30 | `refresh-nightly` | Finland, Norway, Sweden, Germany, and the two least recently refreshed of the other 83 |

So the four countries most likely to be looked at are never more than a day
behind, and everywhere else comes round on a rotation of about six weeks. The
rest of the map moves slowly enough that a few weeks either way does not show.

It is a five field expression, minutes first. ofelia also accepts six fields
with seconds in front, so if you edit it, count the fields first — the same
string read in the other dialect shifts every unit by one place.

One job naming six regions rather than six jobs, because what none of this
makes cheaper is the import. Overpass cannot update part of a database, so a
run rebuilds and reimports all 87 parts whichever ones it downloaded; only the
download shrinks. Six names in one invocation is therefore five extra downloads
and no extra import, where six runs would be six imports — and could not be six
anyway: a rebuild takes hours, so `update-poi-db`'s lock would skip whichever
fired while another was still going. That lock is why the schedule is one job
and not a nightly job beside a weekly one.

It still rebuilds and reimports the whole world every night — see "Refreshing
one country at a time" above for what that costs, and lower the count in
`oldest:2` if the box cannot keep up.

Ofelia and watchtower used to be kept days apart, Sunday and Wednesday, so that
an image update could never land inside the reimport window. They are not any
more: watchtower runs every ten minutes and the importer is updated with the
server, so the schedules do cross. What makes that survivable rather than
prevented is that `update-poi-db` resumes at the region it stopped on.

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

## Keeping it to our own queries

The interpreter is public and unauthenticated, and it cannot usefully be made
otherwise. The app is a web page with no login, so any key it carries is a key
every visitor can read out of the bundle, and a key minted by an endpoint that
anybody may call is a key anybody may mint. There is no waterproof answer here.

What there is, is a different question. The risk is not somebody taking the
data — this database is a filtered scrap of what the public mirrors hand out
for free, so nobody who wants Overpass would come here for it. The risk is one
query costing the machine an hour. And what a query costs can be checked
without knowing who is asking.

Five days of logs, 5029 requests, had exactly one query in them that this app
did not send:

```
[out:json][timeout:60];node(60.10,24.70,60.35,25.20);out meta;
```

Every node in greater Helsinki, no tag filter: 4 MB and 2.8 s, run by hand with
`curl`. It is not the size that marks it out, it is the shape. The app always
names *what* it wants before it says *where* — `nwr[amenity=toilets](bbox)` —
and this names only where.

So there are three things in front of the dispatcher now, and none of them is a
password.

### The bounds

`OVERPASS_TIME` is the one that was missing, and it is the only one that stops
work rather than stopping waiting. It is the dispatcher's `--time`, the ceiling
on how long one query may run; unset, as it was, there is no ceiling at all.
`OVERPASS_MAX_TIMEOUT` only makes nginx give up listening, which frees the
client and leaves Overpass computing.

| | Was | Now | Worst real case |
| --- | --- | --- | --- |
| `OVERPASS_TIME` — seconds one query may run | unset | 60 | 4.0 s |
| `OVERPASS_MAX_TIMEOUT` — how long nginx waits | 180s | 90s | — |
| `OVERPASS_SPACE` — RAM one query may use | 2 GB | 256 MB | 848 KB answered |
| `OVERPASS_MAX_SIZE` — largest query body | 1 MB | 256 KB | 177 KB |
| `WAYSIDE_RATE_LIMIT` — requests/second/address | none | 10, burst 20 | 3 |

Every "now" column sits far above what this app does and far below what an
unbounded query can cost. None of them shapes normal traffic, which needs no
shaping; they are there so that nothing runs away.

`OVERPASS_TIME` has to stay at or above the `[timeout:]` the build scripts ask
for — `QUERY_TIMEOUT` in `apps/frontend/scripts/fetch-poi-data.mjs`, kept at
the same number — because a query asking for more time than the server allows
is refused rather than clamped. Raise both together.

The rate limit answers **429** rather than nginx's default 503, because the app
knows what a 429 is: `fetchWithRetry` treats it as retryable and backs off,
where a 503 it would read as the server being down and fail over to the public
mirrors.

### The query guard

[`njs/query-guard.js`](njs/query-guard.js) runs in front of `/api/interpreter`
and refuses what the app would never send:

- a spatial filter — a bounding box, `around:`, `poly:` — with no tag filter in
  front of it
- recursion (`>`, `>>`) as a statement of its own
- `is_in`, `area[...]`, `foreach`, `make`, `convert`
- any output format other than `json`
- a body over 256 KB, or one nginx had to spill to a temporary file, since a
  query that cannot be read is not one to forward unread

An id lookup is still an id lookup: `node(1)` and `way(id:5)` are not bounding
boxes and pass, which is also what keeps the health check working.

The rules were checked against all 4985 logged queries that carried a body.
One was refused, and it is the one above. `WAYSIDE_QUERY_GUARD=log` runs it
without refusing anything, writing what it would have refused to the error log
— worth a few days before enforcing, on the chance the app grows a shape the
rules do not know.

If it is ever wrong, a refusal is a 403, which the app treats as a failed
server and falls back to the public mirrors over. The cost of a mistake here is
a slower answer, not a broken map.

### The front door

`/cgi-bin/` is now `internal`. It is the location that actually reaches the
dispatcher, and the image leaves it open to the world, so everything above
could be walked around by asking for `/cgi-bin/interpreter` instead of
`/api/interpreter` — the guard, the rate limit, all of it. `/api/` was always
the front door and the rewrite that gets from one to the other is internal, so
nothing outside loses anything.

The rate limit sits on the `/api/` locations rather than on the server for a
related reason: an internal redirect runs nginx's preaccess phase again, so a
limit declared once at the top counted every request twice and the effective
rate was half the configured one.

### robots.txt

There is no `robots.txt` on this host, so every crawler that looked for one got
a 404 — 21 of them over five days, from Applebot, Googlebot, AhrefsBot and
`facebookexternalhit`. A 404 means "no restrictions", so they went on to render
the app and call the interpreter: Applebot alone accounted for 265 queries in
that window, more than every real visitor put together on a quiet day.

Now it answers `Disallow: /`, to everybody. Nothing here is a crawlable page,
and it costs no indexing: the text a crawler reads on a city page — the counts,
the category links, the neighbours — is built into the prerendered HTML from
`src/seo/pageData.ts` and rendered from that same build-time data, with no
request to this server anywhere in it. The map markers were never indexable.

## Access logs

Every request is written to `logs/access.log` on the database volume, one JSON
object per line. On the server that is `/mnt/hdd1/wayside/logs/`.

It is a file rather than the Docker log on purpose. The image points
`/var/log/nginx/access.log` at stdout, which means the requests land in the
Docker log, capped at 30 MB and thrown away with the container — and watchtower
replaces the serving container whenever a new image is published. Nothing else
moves: the dispatcher, the importer and nginx's errors still go to stdout, so
`docker compose logs` is now the container's own story without a line per
request in the way.

A line looks like this, wrapped:

```json
{"time":"2026-08-20T16:24:28+00:00","ip":"203.0.113.45","proxy_ip":"172.17.0.1",
 "xff":"203.0.113.45","country":"","method":"POST","uri":"/api/interpreter",
 "status":200,"bytes":399,"request_length":315,"duration":0.032,
 "referer":"https://wayside.cc/","ua":"Mozilla/5.0 ...",
 "query":"data=[out:json];nwr[tourism=viewpoint](around:1000,60.1,24.9);out meta center;"}
```

Two fields are worth explaining.

**`ip` is the client, not the tunnel.** Nothing reaches this container except
through whatever terminates TLS on the host, so every connection arrives from
the Docker bridge and without `real_ip` every line would read `172.17.0.1`. The
hook trusts `X-Forwarded-For` from the loopback and the private ranges only —
which is every address that can physically reach the port — and `proxy_ip`
keeps the address that actually connected, so a line still says where it came
in. Both the Tailscale funnel and `cloudflared` set the header.

**`query` is the Overpass QL the app posted**, which is what says *what* was
asked for: the categories, the radius, the map area. nginx can only log a body
it still holds in memory, so it is empty for a query above
`client_body_buffer_size` — a large polygon search — and the rest of the line
is written either way.

The health check is not logged. It runs `curl` inside the container once a
minute, and it is the only thing that can reach nginx from `127.0.0.1`, so a
`map` on the connecting address drops it and nothing else.

### Rotation

`logrotate` runs from supervisor, since the image has no cron:
`bin/rotate-access-log` wakes every hour and lets logrotate decide whether a
day has passed. Hourly rather than daily because a restart is a sleep that
starts again — with a 24 hour timer, a container replaced shortly before
midnight each day would never rotate at all. The schedule lives in
`logs/logrotate.state`, beside the logs, so a restart does not lose it either.

Ten days are kept, `WAYSIDE_ACCESS_LOG_DAYS`, and the files are dated rather
than numbered:

```
access.log                     today
access.log-2026-08-19          yesterday, not yet compressed
access.log-2026-08-18.gz       and back to ten days
```

Ten days is the retention policy in full. What is worth knowing about traffic
is knowable within days, and the file pairs an address with the coordinates
somebody searched around, which is not something to keep for longer than it is
being used. `WAYSIDE_ACCESS_LOG=false` turns the whole thing off and puts the
requests back in the Docker log.

### Reading it

```bash
cd /mnt/hdd1/wayside/logs

# busiest addresses today
jq -r .ip access.log | sort | uniq -c | sort -rn | head

# how many queries, and how slow, over ten days
zcat -f access.log* | jq -r '[.status, .duration] | @tsv' | sort | uniq -c

# which categories people actually ask for
jq -r '.query' access.log | grep -o '\[[a-z_:"]*=[^]]*\]' | sort | uniq -c | sort -rn | head -20
```

`zcat -f` reads the plain files and the compressed ones alike, which is what
makes the whole ten days one command.

## Analytics

`docker-compose.prod.yml` also carries a Matomo and its MariaDB. It is here
rather than in a file of its own because it shares this machine and this
machine's tunnel, and because both are the same kind of thing: a service that
answers the app, published from home, with the data staying on the disk you
can point `df` at.

The point of self hosting it is not thrift. **The site shows no cookie
banner**, and what makes that defensible is that the audience measurement
never leaves this box, sets no cookies, and does not keep a full IP address.
Miss one of those and the site needs a consent dialog in front of the first
pageview. The frontend's half is in `apps/frontend/src/analytics/`; this
section is the server's half.

### First start

```bash
mkdir -p /mnt/hdd1/matomo/db /mnt/hdd1/matomo/www
docker compose -f docker-compose.prod.yml up -d matomo-db matomo
```

Publish `127.0.0.1:12346` the same way the API is published. It has to be the
public internet and not just the tailnet: the tracker is a request made by
every visitor's browser, so a `tailscale serve` that only answers inside the
tailnet would measure nobody.

**With Tailscale**, on the same node that already funnels the API:

```bash
sudo tailscale funnel --bg --https=8443 http://127.0.0.1:12346
tailscale funnel status        # both mappings, 443 and 8443
```

8443 and not 443 because Funnel takes exactly three ports — 443, 8443 and
10000 — and the API already holds 443. The two mappings coexist and both come
back after a reboot. The analytics URL is therefore
`https://<node>.<tailnet>.ts.net:8443/`, port and all.

Do not try to share 443 with `--set-path=/analytics` instead. Funnel strips the
prefix before proxying, so Matomo answers at the root and writes root-absolute
URLs for its own assets, and every one of them 404s a level up.

**With `cloudflared`** it is a hostname rather than a port —
`analytics.wayside.cc` — which is the tidier answer if the domain is already on
Cloudflare, and the one worth preferring here: Funnel relays through
Tailscale's own servers and is documented as a way to share a service rather
than to front a public site. The API already puts a query per map view through
it; analytics adds a beacon per pageview and per event on top.

Whichever is used, that URL goes in three places, the port included where there
is one:

| Where | What |
| --- | --- |
| `trusted_hosts[]` in the config block below | the host, e.g. `wayside.tailnet.ts.net:8443` — add a second line without the port too, Matomo compares the `Host` header both ways depending on the request |
| `--url=` on the archive job label | the full URL with a trailing slash |
| `VITE_MATOMO_URL` in the GitHub Actions repository variables | the same full URL — it is baked in at build time, so changing it needs a redeploy |

Recreate the container after editing the compose file.

Open the URL and walk the installer. The database page is already filled in
from the environment; the passwords in the compose file are placeholders and
must be changed **before the first start**, since MariaDB only reads them
while the data directory is empty.

### The three settings that have to be made by hand

Matomo keeps these in its database rather than in a config file, so they
cannot be shipped in the compose file. Under **Administration → Privacy →
Anonymize data**, before the first real visitor:

| Setting | Value |
| --- | --- |
| Anonymize visitors' IP addresses | Yes, mask at least 2 bytes |
| Also anonymize the Location derived from the IP | Yes |
| Delete old raw data | On, 13 months or less |

An install left on its defaults keeps whole IP addresses forever, which is the
one thing that would put this back inside the rules a banner exists for.

Two more, worth the click: turn off "Send anonymous usage statistics to
Matomo", and leave the tracker's own opt-out iframe reachable — it is what
makes the exemption an offer rather than an assumption.

### What is measured, and what cannot be

Cookies are off (`disableCookies` in `src/analytics/index.ts`), so Matomo
recognises a visitor by a daily-salted hash of address and browser
configuration. That is enough to tie a visit together and not enough to follow
anyone from one day to the next, which is the trade being made deliberately:

- **Trustworthy.** Pageviews and which city and category pages get them,
  referrers and campaigns, device and browser, country, all the custom events
  below, and the site-search report including searches that returned nothing.
- **Not trustworthy.** New versus returning visitors, unique visitors over
  anything longer than a day, and attribution across visits. Do not quote
  those numbers; Cloudflare's own edge analytics is the better daily-unique
  figure, and it counts the people who block the tracker outright.

Events, as they read in **Behaviour → Events**:

| Category | Action | Name |
| --- | --- | --- |
| Categories | `select` / `deselect` | the category slug, e.g. `drinking-water` |
| Categories | `clear all` | — |
| Categories | `query: categories` / `preset` / `place-search` / `pan` / `initial` / `route` / `gps` | the whole selection sorted, e.g. `parking,toilets` |
| Presets | `apply` / `clear` | the preset id, e.g. `road-trip` |
| POI | `popup open` | the category the point was drawn as |
| POI | `tap: no details` | the category of a point with nothing to show |
| POI | `noise: about` | the category of the point whose noise band was being explained |
| Search | `result chosen` | — |
| Map | `share: native` / `share: clipboard` | `ok` / `failed` |
| Map | `directions: open` / `directions: close` | — |
| Map | `route` | `ok` / `failed` |
| Map | `my location` | `centered` / `no fix` |
| Map | `zoom hint: shown` / `zoom hint: tapped` | — |
| Map | `noise layer: show` / `noise layer: hide` | — |
| Sheet | `read to end` | the page the sheet was showing, e.g. `home`, `city`, `category` |
| Errors | `overpass failed` | the message every mirror ended on |

The two Categories rows are the pair worth reading together. `select` and
`deselect` say what people reach for in the picker; `query:` says what they
actually went looking with, and its trigger separates a deliberate choice from
the map catching up with a pan. `POI / popup open` is the third: what got
searched for against what got opened.

`Sheet / read to end` is the one event about the text rather than the map:
somebody pulled the bottom sheet open and scrolled to its last line. Once per
visit, so it counts readers and not flicks, and the name says which page's
sheet — `home` is the map root, where that text is the whole of what this site
says about itself.

Searches go to Matomo's site-search report rather than to an event, because
that report has a "no results" list in it, and a place the geocoder cannot
find is the half worth acting on.

### What is deliberately not sent

The `lat` and `lon` query params are stripped from the URL before every
pageview (`trackedUrl` in `src/analytics/index.ts`). They are on every link
the share button produces and they are usually where the person actually is.
Nothing else in the app passes a coordinate to Matomo, and nothing new should:
a bbox in an events table would undo every other precaution in this section.

### Upgrades

Neither container carries the watchtower label, unlike the Overpass pair. A
Matomo release is a file change and a database migration, and watchtower doing
the first without the second leaves an install that refuses to track. Do it
deliberately:

```bash
docker compose -f docker-compose.prod.yml pull matomo
docker compose -f docker-compose.prod.yml up -d matomo
docker compose -f docker-compose.prod.yml exec -u www-data matomo php console core:update
```

### If the reports are empty

- **Every visit is one visitor from 127.0.0.1.** The proxy headers in the
  config block are not reaching Matomo, or the tunnel is not setting them.
- **"Matomo can't be reached from this hostname".** `trusted_hosts` still says
  `CHANGE_ME.example.com`.
- **Nothing at all, and no request in the network tab.** The frontend was
  built without `VITE_MATOMO_URL`; it is a build-time value, so this needs a
  redeploy, not a setting change.
- **Numbers stop moving after a while.** The archive job. `docker compose logs
  ofelia` says whether it ran; ofelia reads its schedule from container
  labels, so restart it after changing them.

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
- **Access logs.** `WAYSIDE_ACCESS_LOG` and `WAYSIDE_ACCESS_LOG_DAYS` decide
  whether requests are written to the volume and for how long. See "Access
  logs" above.
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
