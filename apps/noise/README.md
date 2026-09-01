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
the build goes ahead. What it costs is memory and time rather than correctness:
the grid is one cell per 20 m across the whole box, so its cost grows with the
area and not with how much is in it, and the tile count grows with area too.

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

It doesn't. That is the point of it.

**[NoiseModelling][nm] is the model** — CNOSSOS-EU, the EU's own method under
Directive 2015/996, from Université Gustave Eiffel. Emission by road class,
propagation, diffraction over and around buildings, specular reflection off
façades, ground effect: all of it is theirs, and it is the same method the
published maps this is validated against are themselves made with. Nothing in
this repository computes an acoustic quantity.

What is here is the order things run in:

**Cut.** `osmium extract` takes each area out of every extract whose bounding
box it overlaps, and the pieces are merged into one `.osm.pbf` per area. There
is no tag filtering — `Import_OSM` selects what its model needs, and a filter
of ours in front of it would only be a second opinion.

An area is cut from *every* overlapping extract deliberately: Geneva and Basel
are ringed by roads in France and Germany, and cutting from one extract only
would model them as if that traffic did not exist. The box is padded by 1300 m,
which has to stay above `NOISE_MAX_SRC_DIST` or a band would stop at the edge of
the cut rather than at the edge of what makes it.

**Model.** `bin/ScriptRunner` runs [`groovy/wayside-bands.groovy`](groovy/wayside-bands.groovy),
which is the whole of our involvement: `Import_OSM` → `Regular_Grid` →
`Road_Emission_from_Traffic` → `Noise_level_from_source` → `Create_Isosurface`
→ `Export_Table`. The isosurface breaks are `55.0,65.0,200.0`, so the three
bands come out of the tool rather than being thresholded afterwards, and the
export renames `ISOLVL` to the one-based `band` the app reads.

Receivers sit on a 25 m grid at 4 m above ground — the height END maps are
computed at, and therefore the height the reference in `bin/validate-bands` is
measured at. `NOISE_DELTA` is the knob, and a CNOSSOS run costs roughly its
square: one screen pixel at z12 is about 23 m, so finer buys detail nobody can
see at a price that is very visible.

The projection is UTM, picked from each area's own centre. NoiseModelling wants
a metric SRID and chooses none for us.

**Tile.** tippecanoe writes z10–z12, gzipped. The client overzooms above 12,
which for three smooth polygons costs nothing. `current` is a symlink swapped
at the end of a run, so a rebuild is one atomic rename and a build that dies
leaves the served tiles untouched.

Quiet is a polygon rather than the absence of one, deliberately. A reader
outside every built area has to be told nothing, and a reader in a quiet park
has to be told "quiet"; with quiet drawn, the popup tells them apart by whether
it found a feature at all.

### What this replaced, and why

A hand written model lived in `bin/noise-bands` until it was measured. It
buffered each road at the distance where that road alone crossed a threshold
and unioned the buffers; later it grew a receiver grid, energy summation and a
building screening term. Against Berlin's END façade levels the grown version
scored **41.3% balanced accuracy against the 57.2%** of the cruder thing it had
replaced, and found **8% of genuinely noisy places against 87%**.

The reason was not a bad constant, and no value of one would have fixed it.
Buildings both shield and reflect — a courtyard is quieter than free field, a
street canyon is louder — and a model that can only ever subtract cannot do
both. Every increase in the screening term bought courtyards and lost noisy
streets, monotonically, across a six-point sweep.

That is the whole argument for using someone else's model. Not that ours was
badly written, but that the physics has two signs in it and a shortcut that
only has one will always be trading one error for the other.

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

### What the measurement found

Berlin publishes its END strategic noise map as facade levels — a point on
every noise-affected residential wall carrying the Lden of all assessed
sources, four million of them, over WFS. `bin/validate-bands` scores the model
against it. The first run, on the buffer model this used to be, over 5,275
sampled points:

| | |
| --- | --- |
| exact agreement | 40.2% |
| model **over**-stated | 53.9% |
| model **under**-stated | 5.9% |
| published >=65 dB where the model said quiet | **0.0%** |

This section used to say the opposite. It argued that unioned buffers cannot
add two sources together, that the error was therefore one-directional, and
that "somewhere it calls quiet may not be". The reasoning was right and the
conclusion was backwards, because it accounted for one error and there were
two. The other was having no buildings at all, and in Berlin it was the larger
by roughly nine to one: a courtyard behind a Mietskaserne block is 20 dB
quieter than the street it is 25 m from, and a model that cannot see the block
called the whole block loud.

Two known errors in opposite directions do not cancel to "roughly right", and
which one dominates is not something to reason out from first principles. One
afternoon against a published map settled it.

### What changed as a result

**Receivers on a grid.** Each cell takes the distance to the nearest source in
each emission-level bucket, converts it to a level, and the levels are summed
as energy rather than the loudest winning. A flat and a motorway now add.

**Buildings.** A cell whose straight line to the source it hears crosses a
building takes `SCREEN_ATTENUATION` off — a flat 12 dB, which is the middle of
what a single screen is worth in the real methods. It is straight-line
blocking, not diffraction: a low shed shields as well as a six-storey block,
because footprints are all OpenStreetMap gives and heights would be a guess.

**Not the band edges.** 55 and 65 dB Lden are the [END][end] reporting
threshold and the step above it, and they stayed. The measurement was taken at
facades, which include courtyard walls — the most shielded places in a city and
the ones a model without buildings gets most wrong. The points this app maps
are benches and playgrounds, in the open, where the same error is much smaller.
So the over-statement is an upper bound on the error a reader sees, not the
error itself, and moving a threshold on it would have over-corrected for the
places that actually matter. Fix the mechanism, then re-measure.

### Re-running it

```bash
docker compose run --rm builder validate-bands \
  --bands=/work/bands/berlin.geojson --lat=52.52 --lon=13.405 --radius=12000
```

`--wfs`, `--layer` and `--field` point it at another city's END service. Watch
the bottom line rather than the accuracy: how often the map says quiet where
the city says noisy is the only cell with a promise attached to it.

### What is still missing

1. **Traffic counts where they are published.** Britain's DfT figures cover
   every major road; several German and Nordic cities publish DTV layers. This
   replaces the guess at the centre of both this model and CNOSSOS.
2. **Diffraction rather than blocking.** The screening term is flat because
   this reads footprints and not heights. `building:levels` is well tagged in
   German cities and would turn one constant into a path-difference
   calculation.
3. **Summation within a level bucket.** Two residential streets either side of
   a receiver still count once, not twice, because a bucket contributes through
   its nearest source only. Across buckets the energy does add, which is where
   most of the missing sum was.
4. **Fit the constants.** `BASE_LEVEL`, the two decay coefficients and
   `SCREEN_ATTENUATION` are all parameters. With `validate-bands` there is now
   a loss function to fit them against — an asymmetric one, penalising a false
   quiet several times a false loud.
5. **NoiseModelling itself**, once the above shows the cheap model is the thing
   holding the answer back. It is GPL, which reaches the software and not the
   data it produces, so running it as a batch step changes nothing about the
   licensing below.

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
