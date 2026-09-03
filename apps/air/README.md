# Air quality tiles

Current fine-particle levels (PM2.5) from reference monitors and the
Sensor.Community citizen network, interpolated between them and served as
vector tiles. Six bands, the European Air Quality Index's own.

Published for every European capital and every European city of a million or
more residents — 64 cities today — each clipped to its own administrative
outline plus ten kilometres. A handful of the smallest states have no such
outline in OpenStreetMap at all, only a point; those are clipped to a wider
twenty kilometre circle around it instead. See "Choosing what to publish"
below.

The app draws them as an optional overlay and puts the nearest station's
reading in the popups of places you would linger in. Both are behind
`VITE_AIR_TILES_URL`: with that unset there is no source in the style, no tile
request, no station snapshot fetched, no tile in the layers panel and no row,
so a checkout with no tile server is a working checkout.

| File | What it is |
| --- | --- |
| [`bin/build-air-tiles`](bin/build-air-tiles) | The pipeline: fetch, interpolate, tile |
| [`bin/air-latest`](bin/air-latest) | Current PM2.5 from OpenAQ and Sensor.Community |
| [`bin/fetch-boundaries`](bin/fetch-boundaries) | Fetches city outlines from Nominatim, once, and caches them |
| [`boundaries.geojson`](boundaries.geojson) | Those outlines, committed and cached |
| [`extra-cities.json`](extra-cities.json) | Names and country codes for the cities `apps/noise/cities.json` doesn't carry |
| [`bin/air-field`](bin/air-field) | The model: inverse distance weighting, contoured, masked |

## Development

```bash
cp .env.example .env      # and put an OpenAQ key in it
docker compose build
docker compose run --rm builder build-air-tiles
docker compose up -d tiles
```

Then, in `apps/frontend/.env`:

```
VITE_AIR_TILES_URL=http://localhost:8081
```

and `npm run dev`. The key is free and instant, from
[explore.openaq.org/register](https://explore.openaq.org/register).

There is no extract to download and no cache volume, which is the whole
difference between this and `apps/noise`: the entire input is one paginated
call returning a few thousand numbers. A build is about a minute, most of it
tippecanoe.

To look at a change to the model without spending a fetch on it:

```bash
docker compose run --rm builder build-air-tiles --keep-work
docker compose run --rm builder build-air-tiles --stations=/work/stations.json
```

The field is deterministic given the stations, so the second run rebuilds the
same map and any difference in it is the change.

### The boundaries, and why they are cached

```bash
bin/fetch-boundaries --cities=../noise/cities.json --out=boundaries.geojson \
  minsk moscow kyiv istanbul ...
bin/fetch-boundaries --cities=extra-cities.json --out=boundaries.geojson \
  minsk moscow kyiv istanbul ...
```

Two source files rather than one, because the cities this app has a full page
for (`../noise/cities.json`) and the cities this layer publishes are different
sets with a large overlap rather than one contained in the other: every
European capital and every European city of a million or more residents,
regardless of whether wayside has POI data for it. Most of that set is already
in the noise builder's list — the capitals of the countries it covers, mostly
— and [`extra-cities.json`](extra-cities.json) carries only the rest: names and
country codes for places like Moscow, Kyiv and Ankara that this app otherwise
knows nothing about. `fetch-boundaries` takes either file as `--cities`, and
looks up whichever slugs are named on the command line against it.

Every boundary already in the output file is kept and never fetched again, so
a command above is a few seconds' no-op today and a few seconds' fetch per city
when one is added. A council redrawing a limit is not on the schedule an hourly
tile build runs to, and asking Nominatim sixty-odd times an hour for answers
that have not changed is how a project gets blocked. `--refresh` names the
cities to fetch again when one really has moved.

A handful of these needed a second lookup, and a smaller handful needed a third
kind of answer entirely. Searching "Copenhagen" returns exactly one result — a
`place` node with a point and no polygon — and asking for more results does not
help, because there is only ever one. What that answer carries is its
administrative parent in the display name, and *that* has the boundary:
København → Københavns Kommune, Athens → Δήμος Αθηναίων, Glasgow → Glasgow
City. So a miss is retried once through the parent rather than given up on,
which is a rule instead of a special case for each. For the smallest states —
Monaco, San Marino, Vatican City among them — even the parent has nothing but a
point, and there the point itself is what gets published; see "Choosing what to
publish" for the wider buffer that gets built around one of these instead of a
real outline.

### Choosing what to publish

```bash
docker compose run --rm builder build-air-tiles --cities=berlin --buffer-km=10
```

The published area is a city's administrative boundary, buffered outwards. A
city is not a circle: Berlin is 45 km across and 38 km top to bottom with a
ragged edge, and no radius fits it — one large enough to hold Spandau spends a
quarter of its area on Brandenburg. The outlines live in
[`boundaries.geojson`](boundaries.geojson), taken from the OpenStreetMap
relations Nominatim serves.

The buffer is what makes it useful rather than merely administrative. Nobody
stops caring about the air one metre past a line they cannot see, and somebody
looking at a playground in Potsdam is asking the same question as somebody in
Zehlendorf.

A feature with no outline at all — see above — is buffered by
`--point-buffer-km` instead, twenty kilometres by default rather than ten. A
point is a single estimate of where a place's centre is rather than a drawn
line, and it carries none of the margin a real boundary already has built into
it; the wider radius is what keeps that estimate's error from quietly shrinking
the area a monitor there is allowed to speak for.

The boundary clips what is *published*, never what is *read*. Stations out to
the influence radius still shape the field inside it, because air crosses
boundaries and a build that dropped the monitors just over the line would draw
a false gradient along it.

## Production

There is nothing separate to deploy. Like the noise tiles, the builder and the
Caddy that serves what it writes belong in
[`apps/overpass/docker-compose.prod.yml`](../overpass/docker-compose.prod.yml),
which is still the one file that is the whole deployment.

Unlike the noise tiles, this one wants a schedule. Noise comes from road
geometry and moves at the speed of roadworks; this is the air an hour ago, and
a build from this morning is worth nothing by the afternoon. Hourly, under the
ofelia that already runs the nightly Overpass import.

A failed run changes nothing. The builder writes a new directory and moves the
`current` symlink only when it has finished, so an OpenAQ outage leaves the
last good tiles being served — a map an hour stale, which is inside what the
caption already promises, rather than an empty one.

## How the model works

Three steps, and the third is the one that keeps it honest.

**Fetch.** Two networks, doing two different jobs, and one filter that applies
to both: a reading of exactly 0.00 µg/m³ is a stopped instrument rather than
clean air. The cleanest air ever recorded still carries a microgram or two of
sea salt. That began as a citizen-sensor rule and should not have been — on a
Europe-wide build, 193 of 2,087 *reference* stations were sending flat zeroes,
9.2% of them, clustered across Iceland, Ireland and Scotland, every one pulling
the interpolation toward a cleanliness nothing had measured. Reykjavík was
drawn from three of them and produced no bands at all, because a field of flat
zeroes has no contour to cut. It now publishes nothing there, which is the
honest answer.


OpenAQ's `/v3/parameters/2/latest` returns the most recent value from every
sensor on the planet measuring PM2.5 — 21 pages of 1,000, about thirty seconds.
These are reference monitors, mostly the EEA's: calibrated instruments run to a
standard, and sparse. Around Berlin, 88 of them.

Sensor.Community is one static 9 MB file, no key and no rate limit, holding the
citizen network: SDS011 units in people's gardens and balconies. Around Berlin,
580 of them after the filtering below — roughly six times as many as the
reference network and, measured across Germany, 1.6 km apart at the median
against the reference network's 7.5 km.

So the reference network sets the **level** and the citizen network sets the
**shape**. That split is the whole design, and the calibration step below is
what holds it together.

Then most of it is thrown away. On the run this paragraph was written from,
**8,100 stations survived out of 20,812 rows — 61% dropped.** Almost all of
that is the age filter, and it is not optional: "latest" in this API means the
last value in a sensor's series, not a recent one. The third row of the very
first page of a live response carried a timestamp from **2021**. A monitor that
stopped reporting five years ago still has a latest value, and without the
filter it sits in the middle of a country pulling the interpolation toward the
air of a day long gone. The rest are negative values from drifting zeros — the
second row of that same response was `-1.0` — and readings with no usable
position.

**Calibrate.** The cheap sensors are corrected by one factor per build: every
citizen sensor with a reference monitor within 10 km is paired with it, and the
whole network is divided by the median of those ratios. Without it the map
would change colour at the edge of the dense area purely because the sensors
there are different — and since the dense areas are cities, cities would read
systematically cleaner or dirtier than the countryside for no reason but the
hardware.

The direction of that bias is not the one the datasheets warn about, which is
worth knowing. SDS011 units are famous for over-reading in damp air, where
particles carry a shell of water and scatter like something larger. But they
are optical counters with poor sensitivity at the bottom of their range, and on
a clear September morning with reference monitors at a median of 7 µg/m³ the
fitted factor was **0.42** — the citizen network reading *under* half of
reference, not over. The clamp is symmetric about 1 for exactly that reason.

Three filters run on the citizen network and none of them is optional: indoor
sensors are dropped (they measure a living room), 999.9 is dropped (that is the
SDS011 saturating, a fault rather than a reading), and anything more than five
times the worst reference monitor in the same build is dropped after correction
— 830 µg/m³ is a fault in Berlin in September and an ordinary afternoon in
Delhi, so the yardstick has to be the calibrated network rather than a constant.

**Interpolate.** Inverse distance weighting onto a 0.02° grid, about 2 km,
which the citizen network's 1.6 km median spacing is what justifies. Against
reference monitors alone this would be inventing detail; the earlier builds
used 0.1° for that reason. Stations within 150 km shape a cell's
value, weighted by Shepard's modified form, ((R−d)/(R·d))², rather than plain
1/d². Plain 1/d² does not reach zero at the search radius, so a station leaving
a cell's neighbourhood takes a finite weight with it and the field steps — and
over a continent of overlapping radii those steps are visible as circles of
exactly 150 km, drawn in the one pattern that most looks like a real
atmospheric feature and is not.

Accumulation is per station rather than per cell: each monitor touches only the
window its radius reaches, so the whole thing is a few thousand small numpy
slice updates. A global field is about three seconds and 200 MB.

**Contour and mask.** The grid is contoured at the EAQI breakpoints, then
clipped to within 75 km of a station.

The mask is the important part. Interpolation always produces a value: ask this
grid for a point in the Sahara and it returns a number, smooth and plausible
and derived from a monitor 900 km away, and nothing about the output would look
different from a cell 2 km from a reference station. The hole is what tells a
reader "nobody is measuring here" rather than "the air here is fair".

It is drawn as real geometry — the union of each station's coverage circle —
rather than as the set of grid cells within the radius, because that edge is
the most-looked-at line on the map and an 11 km staircase along it is the first
thing anybody would notice.

Bands are built as nested regions and subtracted, rather than contoured one at
a time. Asking for band 2 and band 3 separately gives two polygons computed
from the same contour line and then simplified apart from each other: a chain
of slivers where they overlap and gaps where they do not, and a point in one of
those slivers belongs to two bands at once. Subtracting neighbours means
whatever the simplifier does to an edge, both sides get the same edge. The
built output is exactly disjoint, which is checked easily enough and was worth
checking.

**Tile.** tippecanoe writes z2–z8, gzipped, at `--full-detail=13`. Eight is not
a compromise: the field has no detail below a few kilometres, so there is
nothing a z12 tile could carry that a z8 tile overzoomed does not already say,
and this layer is global where the noise one is a list of cities — z12 would be
hundreds of thousands of files describing a surface that stopped changing four
zoom levels ago.

## Why PM2.5, and why nothing else

Because it is the only pollutant here whose value at a station says anything
about a place 50 km away.

PM2.5 is dominated by regional transport and by secondary aerosol formed in the
air mass itself. It varies over tens to hundreds of kilometres, and two
stations 80 km apart really are measuring substantially the same thing.
Interpolating it is defensible.

NO₂ is the opposite, and is the trap. It is made by the traffic in front of you
and destroyed within hours, so it halves within 200 m of a kerb. An
interpolated NO₂ surface between stations 80 km apart is not a coarse estimate
of anything — it is a smooth picture of a field with no smooth component at
that scale, and it would look exactly as convincing as this one.

There is a second, duller reason. OpenAQ reports NO₂ and O₃ in µg/m³ from
European feeds and in ppm from American ones, so a global layer would have to
convert with a temperature and pressure it does not have. PM2.5 is µg/m³
everywhere.

## The popup does not read these tiles

It reads `stations.json`, written beside them: the same snapshot the field was
built from, trimmed to the published box and gzipped to about 70 KB for a
global build.

The map draws an interpolated field — a colour for every place within 75 km of
a monitor, including thousands of places with no monitor in them. It would have
been easy to have the popup read that field and print the band under the
marker, and it would have been a guess wearing the clothes of an observation.

So the row quotes a station instead: what it measured, and how far away it is.
The distance is not a footnote. A reading from 3 km away in the same city and
one from 60 km away across a mountain range are different kinds of fact, and
saying which one this is costs a clause.

It is also simply more robust. The popup needs no tile loaded, no layer
installed and no particular zoom — one fetch and some arithmetic — which is why
the wash can be hidden above z14 without the popup losing anything. Hiding the
noise layer the same way would silently break its popup, which is why
`setNoiseVisible` uses opacity instead.

## Accuracy, and what would improve it

**This is an interpolation, and its error is not evenly spread.** It is close
where monitors are dense and a guess where they are not, and nothing in the
output distinguishes the two. A reader in Berlin is looking at something within
a µg/m³ or two; a reader in a valley 60 km from the nearest station is looking
at a regional average that may be wrong in either direction by a lot.

In rough order of what would improve it:

1. **Say how far the nearest station is, on the map and not only in the
   popup.** The information already exists — it is what the mask is built from
   — and everything above about where the error lives is currently only
   knowable by opening a popup. Fading the wash with distance to the nearest
   monitor would put the uncertainty in the same picture as the value, and is
   the cheapest honest improvement available.
2. **Validate against a withheld station.** Leave each monitor out in turn,
   interpolate without it, and compare the prediction at its position with what
   it actually measured. That turns "about 11 km, about 75 km" from two guesses
   into a measured error curve against distance, and would settle both radii
   the way `bin/validate-bands` settled the noise bands. It needs no new data
   source, only the snapshot already on disk.
3. **Elevation.** Particulates pool in valleys under inversions and thin out
   with height, and a station in a basin speaks poorly for a plateau 40 km away
   at 800 m. This is the largest term the model ignores.
4. **Kriging instead of IDW.** The principled version, which fits a variogram
   rather than assuming an exponent, and which returns a variance per cell —
   the thing point 1 wants. Worth doing after point 2, because the measurement
   is what would say whether the current exponent is costing anything.
5. **Forecast rather than nowcast.** CAMS publishes European air quality
   forecasts on a regular grid, which is a different product — modelled rather
   than measured, and complete rather than masked. It would answer "should I go
   this afternoon", which is a better question than the one this answers, at
   the cost of the provenance that makes this simple.

## Licence

Three sources, three sets of terms, and the tiles carry all of them.

| What | Source | Terms |
| --- | --- | --- |
| Reference readings | EEA and others via OpenAQ | ODC-BY, CC BY 4.0 |
| Citizen readings | Sensor.Community | ODbL 1.0 / DbCL 1.0 |
| City outlines | OpenStreetMap via Nominatim | ODbL 1.0 |

**OpenAQ has no single licence, and an earlier version of this file said it
did.** It aggregates providers under twelve different sets of terms, exposed
per provider through its `/v3/licenses` resource, and its own documentation is
explicit that complying with them is the caller's job. Around Berlin the split
is 178 usable locations against 16 under Poland's GIOS terms and 2 stating no
licence at all.

So the builder does not take what it is given. `air-latest` holds an
**allowlist of licence ids** — ODC-BY, CC BY 4.0, CC0 1.0, US Public Domain,
UK OGL — fetches the licence of every location in the build area, and drops
every station it has no permission to publish. What each build actually used is
written into `stations.json` and `wayside.json`, so the question can be
answered from a tileset rather than from a document that might have drifted
from it.

The allowlist is keyed by id because names get reformatted, and the ids are
checked against their expected names on every run: if OpenAQ ever renumbers,
the build stops rather than quietly publishing whatever moved into slot 10.

### Why it stops at Europe

Not geography — licence compatibility. OpenAQ's catalogue includes CC BY-SA
4.0, whose share-alike is not one-way compatible with the ODbL that
Sensor.Community and the boundaries carry, and five sets of bespoke national
terms that would each have to be read before anything derived from them was
published. Combining those into one tileset is a conflict rather than a
paperwork problem, so `air-latest` refuses to leave Europe and refuses any
licence not on the list.

### What that makes the tiles

ODbL, and share-alike. `apps/noise` already takes this position for the same
reason — *"the tiles are a derivative database of OpenStreetMap, so they are
ODbL"* — and vector tiles built from an ODbL boundary and ODbL readings fall
the same way. An earlier version of this file claimed the opposite, that
nothing here touched OSM and the repository's two-licence split was therefore
unaffected. Adding the city boundaries and the citizen network made that false.

So `apps/air` sits beside `apps/noise` and
[`apps/frontend/data/poi`](../frontend/data/poi) on the ODbL side of the split
described in the root README. The MIT licence still covers every line of code
in this directory; it is the tiles it writes that are ODbL.

The attribution in the map control names the networks rather than only the
aggregator, because ODC-BY and CC BY both require attributing the source and
"OpenAQ" alone attributes the middleman. See the `attribution` on the source in
`src/map/airTiles.ts`.

### Not legal advice

The compatibility question above — CC BY-SA 4.0 against ODbL in particular — is
one where reasonable readings differ and the conservative one is the one this
acts on. If any of this is going to matter commercially, it wants a lawyer
rather than a README.
