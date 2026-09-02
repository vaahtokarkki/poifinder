# Air quality tiles

Current fine-particle levels (PM2.5) from OpenAQ, interpolated between
monitoring stations and served as vector tiles. Six bands, the European Air
Quality Index's own.

The app draws them as an optional overlay and puts the nearest station's
reading in the popups of places you would linger in. Both are behind
`VITE_AIR_TILES_URL`: with that unset there is no source in the style, no tile
request, no station snapshot fetched, no tile in the layers panel and no row,
so a checkout with no tile server is a working checkout.

| File | What it is |
| --- | --- |
| [`bin/build-air-tiles`](bin/build-air-tiles) | The pipeline: fetch, interpolate, tile |
| [`bin/air-latest`](bin/air-latest) | Every current PM2.5 reading OpenAQ has |
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

### Building one country

```bash
docker compose run --rm builder build-air-tiles --bbox=5.87,47.27,15.04,55.15
```

West, south, east, north in degrees — the order osmium, Overpass and the noise
builder all write a box in. `AIR_BBOX` in `.env` does the same thing for every
run.

The box clips what is *published*, never what is *computed*. Stations outside
it still shape the field inside it, because air crosses borders and a build
that dropped foreign monitors would draw a false gradient along every one of
them. It also trims `stations.json` to the box plus the mask radius, so a
one-country layer costs a fraction of a global one to serve: Germany published
693 stations out of 8,100 fetched.

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

**Fetch.** `/v3/parameters/2/latest` returns the most recent value from every
sensor on the planet measuring PM2.5. That is 21 pages of 1,000 and about
thirty seconds; the free tier allows 2,000 requests an hour, so an hourly build
uses roughly 0.3% of the budget. There is no tile cache in this app because
there is nothing to conserve.

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

**Interpolate.** Inverse distance weighting onto a 0.1° grid, about 11 km,
which is finer than the field it samples. Stations within 150 km shape a cell's
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

The measurements are OpenAQ's aggregation of government and research monitoring
networks. OpenAQ publishes under CC BY 4.0; the underlying providers have their
own terms, which is why the attribution names both the aggregator and the
networks rather than only the convenient one.

Note that this is a different footing from `apps/noise` and
[`apps/frontend/data/poi`](../frontend/data/poi), which are ODbL derivatives of
OpenStreetMap. Nothing here touches OSM at all — the tiles are built from
station coordinates and readings — so the two-licence split in the root README
is unaffected by this directory.
