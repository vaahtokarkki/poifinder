# Noise tiles

Modelled road and rail noise for the cities the app has pages for, as vector
tiles. Three bands — quiet, moderate, noisy — built from OpenStreetMap alone.

The app draws them as an optional overlay and reads the band under a point for
its popup. Both are behind `VITE_NOISE_TILES_URL`: with that unset there is no
source in the style, no tile request, no control and no row, so a checkout with
no tile server is a working checkout.

| Directory | What it is |
| --- | --- |
| [`bin/build-noise-tiles`](bin/build-noise-tiles) | The pipeline: download, cut, model, tile |
| [`bin/noise-bands`](bin/noise-bands) | The model itself, one area at a time |
| [`cities.json`](cities.json) | Generated from `src/seo/cities.ts` by `npm run noise:cities` |
| [`europe.txt`](europe.txt) | Extracts covering the European tier 1 cities |

## Development

```bash
cp .env.example .env
docker compose build
docker compose run --rm builder build-noise-tiles helsinki
docker compose up -d tiles
```

Then in `apps/frontend/.env`:

```
VITE_NOISE_TILES_URL=http://localhost:8080
```

and `npm run dev`. The first build downloads an extract — Finland by default,
about 700 MB — and caches it, so a second run starts at the cut.

Naming one city is the fast way to look at a change to the model. Note that it
writes a tileset containing only that city: the tiles are one tileset and
tippecanoe writes it whole, so `build-noise-tiles` with no arguments is what
produces a complete one.

## Building an arbitrary area

Anything in `cities.json` is a circle around a city centre, but the builder
takes bounding boxes too — for somewhere that is not on the list, for a
neighbourhood rather than a whole city, or for a region that spans several:

```bash
# west,south,east,north in degrees, the order osmium and Overpass use
npm run noise:build -- --bbox=24.90,60.15,25.05,60.22

# named, so the tiles say where they came from
npm run noise:build -- --bbox=kallio:24.93,60.17,25.00,60.20

# cities and boxes in the same tileset, as many of each as you like
npm run noise:build -- helsinki espoo --bbox=porvoo:25.60,60.36,25.75,60.42
```

An unnamed box becomes `area-1`, `area-2` and so on. The name ends up on every
feature as the `area` property and in `wayside.json` beside the tiles, so a
directory can always say what is in it.

A box is clipped exactly, so the tileset's bounds are the box you asked for. It
still needs an extract that covers it: `NOISE_EXTRACTS` decides what is
available, and an area no extract overlaps is skipped with a line saying so.

Large boxes work and are not stopped — a note is printed above 5,000 km² and
the build goes ahead. What it costs is time rather than correctness: every road
inside is buffered, and the tile count grows with area.

## Production

There is nothing separate to deploy. The builder and the Caddy that serves what
it writes are both in
[`apps/overpass/docker-compose.prod.yml`](../overpass/docker-compose.prod.yml),
which is still the one file that is the whole deployment. Caddy answers on two
paths under one hostname — `/api/interpreter` proxied to Overpass, `/tiles/*`
read off the noise volume — so the frontend wants:

```
VITE_OVERPASS_API_URL=https://your-host/api/interpreter
VITE_NOISE_TILES_URL=https://your-host/tiles
```

First build, once, and it is optional — with no tiles built, `/tiles` answers
204 and every popup looks as it did before this existed:

```bash
docker compose -f docker-compose.prod.yml run --rm noise-builder build-noise-tiles
```

There is no schedule. Unlike the Overpass database next to it, which is rebuilt
nightly because the points move, these bands come from road geometry and road
classes — they move at the speed of roadworks, and a job that rebuilt them on a
timer would spend gigabytes of downloads to produce the same polygons.

So rebuild by hand when something has changed, or when the area being covered
should change. The argument is the whole configuration: a run writes a complete
tileset from what it was given, so whatever is on that command line is what the
site has until the next run.

## How the model works

Four steps, and the whole of it is in `bin/noise-bands`.

**A level per way.** Each road gets a sound level in dB at 10 m, from its
`highway` class — motorway 78 down to service 55 — adjusted by `maxspeed` and
`lanes`, both clamped hard because they are present on a minority of ways and a
missing one must not swing the answer. Railways are on the same scale, split by
`usage=main`. A way in a tunnel is not a source at all, which is the single
largest correction available from OSM tagging and is free.

**A distance for each band edge.** The level falls by 10·log₁₀(d/10) — 3 dB per
doubling, because a road is a *line* source and not a point one. Beyond 50 m a
ground-effect term steepens it. Inverting that for 65 dB and 55 dB gives two
radii per way:

| Class | 65 dB | 55 dB |
| --- | --- | --- |
| motorway | 108 m | 388 m |
| trunk | 84 m | 300 m |
| primary | 57 m | 204 m |
| secondary | 32 m | 139 m |
| tertiary | 16 m | 95 m |
| residential | — | 32 m |

**Buffer and union.** Ways are bucketed by radius so the buffer runs once per
distance rather than once per way, in a local metric frame centred on the area.
The unions become band 3, band 2 is what is left of the 55 dB union, and band 1
is the rest of the area.

Quiet is a polygon rather than the absence of one, deliberately. A reader
outside every built area has to be told nothing, and a reader in a quiet park
has to be told "quiet"; with quiet drawn, the popup tells them apart by whether
it found a feature at all.

An area is cut from *every* extract whose bounding box it overlaps, and the
pieces are concatenated before the model runs. That is not tidiness: Geneva and
Basel are ringed by roads in France and Germany, and cutting from one extract
only would model them as if that traffic did not exist. Ways duplicated across
an extract overlap are harmless, since the model unions its buffers.

**Tile.** tippecanoe writes z10–z12, gzipped. The client overzooms above 12,
which for three smooth polygons costs nothing — a z12 tile carries about 1.5 m
of resolution, far finer than a band edge that was modelled rather than
measured. Roughly 350 files for the 36 tier 1 cities; going to z15 would be
18,000 for no visible gain.

## Accuracy, and what would improve it

**This is not a noise model.** [CNOSSOS-EU][cnossos] is the noise model, the
EU's own method under Directive 2015/996, and [NoiseModelling][nm] implements it
from this same OpenStreetMap input. What it has and this does not is traffic
volume, a terrain model, and building-by-building diffraction.

What this gets right is the *shape* of the answer: motorways reach much further
than side streets, a park's edge is louder than its middle, a tunnelled road is
not there. What it cannot get right is the level, because nothing in
OpenStreetMap says how many cars use a road. Three coarse bands are the most
that can honestly be claimed from that input, which is why there are three and
why the popup says "modelled" out loud rather than hiding it in a tooltip.

### Sound adds, and this does not add it

The structural error, and the one worth knowing before trusting a band. A real
model puts receivers on a grid and sums the energy reaching each one:
`10·log₁₀(Σ 10^(Lᵢ/10))`. Two equal sources are 3 dB louder than one.

This buffers each way independently and unions the results, so a place reached
by several roads is scored as if only the nearest mattered. With the same
constants:

| Situation | Summed properly | This says |
| --- | --- | --- |
| Two primary roads 140 m apart, point midway | 66.4 dB — band 3 | band 2 |
| Ten residential streets, point 40 m from each | 64.0 dB — band 2 | band 1, quiet |

The error is one-directional: this **under-states** noise in dense areas and
never over-states it. Somewhere it calls loud really is loud; somewhere it
calls quiet may not be — which is the wrong way round for a feature about
finding somewhere quiet.

Fixing it means becoming a grid computation: sample receivers, sum over every
source within range, contour the result. That is numpy and a contouring step
rather than shapely alone, and it is roughly the point at which running
NoiseModelling instead becomes the cheaper answer, since it does that properly
and takes the same OSM input.

### The band edges

The band edges are 55 and 65 dB Lden, which are the [END][end] reporting
threshold and the step above it, so "quiet" means what it means on a strategic
noise map rather than what it means relative to the rest of the city. The
constants that place them there are parameters, not physics. In rough order of
what would improve them:

1. **Fit against published contours.** EU agglomerations over 100,000 people
   publish Lden maps under END, on a five-year cycle, as vector contours. Fit
   `BASE_LEVEL` and the two decay coefficients against a handful of cities that
   publish them, then report the confusion matrix across the three bands for
   cities held out. That turns the ladder from a guess into a measurement and
   costs no new input data.
2. **Building shielding.** After distance, buildings are the largest term in a
   city, and OSM has the footprints. Counting footprints on the sight line is a
   crude Maekawa stand-in and would be the first thing to make a courtyard read
   differently from the street it opens off.
3. **Traffic counts where they are published.** Britain's DfT figures cover
   every major road; several German and Nordic cities publish DTV layers. This
   replaces the guess at the centre of both this model and CNOSSOS.
4. **NoiseModelling itself**, once any of the above shows the cheap model is the
   thing holding the answer back. It is GPL, which reaches the software and not
   the data it produces, so running it as a batch step changes nothing about
   the licensing below.

## Licence

The tiles are a derivative database of OpenStreetMap, so they are ODbL, the
same as [`apps/frontend/data/poi`](../frontend/data/poi) and not the MIT that
covers the code. That is the reason this uses OSM alone: mixing in a national
noise dataset would give the output a second provenance with its own terms, and
the two-licence split this repository has is worth more than the accuracy that
would buy.

[cnossos]: https://eur-lex.europa.eu/eli/dir/2015/996/oj
[nm]: https://github.com/Universite-Gustave-Eiffel/NoiseModelling
[end]: https://environment.ec.europa.eu/topics/noise/environmental-noise-directive_en
