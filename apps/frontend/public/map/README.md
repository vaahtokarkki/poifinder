# The basemap style

`voyager.json` is the style document the map is drawn from. It started as a
verbatim copy of CARTO's Voyager style, taken on 2026-08-29, and has been
edited since — *What we changed* below is the list:

```
curl -sS https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>process.stdout.write(JSON.stringify(JSON.parse(d),null,2)+'\n'))" \
  > apps/frontend/public/map/voyager.json
```

It is served as a static asset at `/map/voyager.json` and loaded by
`src/components/BasemapLayer.tsx`. Vite copies `public/` into `dist/` verbatim,
so it ships with a normal `npm run deploy` and needs nothing else.

## What is and isn't local

The document and the POI sprite sheet beside it. Everything the style points at
for data is still absolute and still CARTO's:

| Field                 | Serves                                             |
| --------------------- | -------------------------------------------------- |
| `sources.carto`       | the TileJSON, and through it the tiles             |
| `sprite[0]` (default) | CARTO's own sheet — one image, the city-dot circle |
| `glyphs`              | the font PBFs the labels are set in                |

Those resolve under `cartocdn.com`, so `transformRequest` in BasemapLayer still
appends `VITE_CARTO_API_KEY` to every one of them. Leave them absolute unless
you are also self-hosting tiles — a style with a local `sources` block and no
tiles behind it draws an empty canvas.

`sprite[1]` is ours, `/map/sprite`, built from the app's own icon set; *POI
icons* under *What we changed* has how it is built and why the component has to
rewrite that one URL before MapLibre sees it.

## What we changed

Voyager draws a deliberately quiet map: outside parks and water it paints the
ground one colour and leaves paths as a grey dash from z15. This app is for
finding a playground or a toilet on foot, so the style now carries the parts of
the OpenStreetMap default carto that answer *where is it and how do I walk
there*. Everything else is still upstream Voyager.

**Areas** — new `fill` layers off the `landuse` and `landcover` source layers,
sitting between the stock `landuse` and the roads:

| Layer                | `class` it covers                                            | Fill      |
| -------------------- | ------------------------------------------------------------ | --------- |
| `landuse_education`  | school, university, college, kindergarten, library, hospital | `#fcfade` |
| `landuse_sports`     | playground, track, stadium                                   | `#dff5e3` |
| `landuse_pitch`      | pitch                                                        | `#aae0cb` |
| `landuse_urban`      | commercial, retail, industrial, railway, farmyard            | a `match` |
| `landcover_wood`     | wood, over the stock green                                   | `#d2e5c0` |
| `landcover_farmland` | farmland                                                     | `#f0f2dc` |
| `landcover_sand`     | sand                                                         | `#f5ecd2` |
| `landcover_wetland`  | wetland                                                      | `#dfeadb` |

The stock `landuse` layer kept `cemetery` and got its own green (`#d8e4d1`);
`stadium` moved out of it into `landuse_sports`.

**Paths** — the three stock grey-dash layers (`road_path`, `bridge_path`,
`tunnel_path`) are gone, each replaced in its own z-order slot by a family of
six that splits `class=path` by its `subclass`, plus one for `class=track`:

- `path_cycleway` — solid `#37955d`, from z13, and deliberately the heavier of
  the two: about twice the width of a footway at every zoom, because a bike
  route is a route and a footway is a detail
- `path_foot` — solid `#3f7f52`, from z15; catches anything on `class=path`
  that is not a cycleway, a plaza or a platform, subclass-less ways included.
  It waits two zooms longer than the cycleway on purpose: at z13-14 a city's
  footways are a grey wash under everything else and say nothing a street does
  not, while a bike route that far out is still worth following
- `path_steps` — the footway green, kept dashed: the ladder is what makes a
  flight of steps read as steps rather than as a very short path
- `path_pedestrian` — plazas and platforms are paved surface, not trail, so
  they stay a light `#f2ece2` line
- `path_track` — `class=track`, an earth `#a08b62`, kept dashed for unpaved
- `path_halo` — a white line under all of the above, so the greens stay legible
  where they cross a park — 55% white, not solid, or over a park it reads as
  its own line. Its opacity is a `step` on zoom around a `case` on subclass
  rather than a plain ramp, because it backs lines that start at different
  zooms: nothing below z14, cycleways only through z14-15, everything from z15.
  A flat ramp would draw a white line under a footway that is not being drawn
  yet

Both are green within a shade or two of each other, so the width is what
separates them rather than the colour. The cycleway is the lighter of the two,
which sounds backwards for the more important line and is not: it is twice the
width, so at equal tone it outweighed everything around it.

Weight is the thing to watch here, and it took three passes to get down. The
first drew a cycleway at ~3px at z17 — wider than the casing on a residential
street, which made the boldest line on a map of streets a bike path. It is now
1.6px at z17 against the footway's 0.95px, at 65% and 60% opacity, which lands
them at about `#79b48c` and `#87ab8c` over the ground. If they ever need to
come back up, the width ramps are the lever; the colours are already light.

The `_bridge` and `_tunnel` copies are the same six with the brunnel filter
swapped; the tunnel ones run at 45% opacity like every other tunnel layer.

The greens are Google-Maps-ish rather than OSM's brown-red, which is the one
place this deliberately departs from the default carto: on Voyager's warm
background a dark green reads as *walkable* far faster than OSM's dotted red.

**Trams, and no trains** — heavy rail is not drawn at all: `rail`, `rail_dash`
and their two tunnel copies are deleted, so a freight corridor no longer cuts a
dark line across a map somebody is reading to find a toilet.

One layer is left, `transit`, drawing solid `#7c8288`, thin and unhatched —
hatching a tram line at that width turns it into dots. Its filter is the whole
policy:

- **trams, wherever they run.** Tunnel, bridge or street, it is the same line
  to somebody following it, so there is no `brunnel` test on this half.
- **metros, only where they are visible.** A subway in a tunnel is under the
  map rather than on it, so `brunnel=tunnel` is excluded; a metro on a viaduct
  or at grade still draws.
- **nothing else.** `light_rail` is its own subclass in the tiles and is left
  out with the heavy rail. If a city's network reads as full of holes, that
  subclass is the first thing to add back.

Across tiles for six cities that draws 8 tram and 5 metro segments and skips
31 heavy rail, 38 subway tunnels and 14 light rail.

**Ground and roads** — Voyager's `#fbf8f3` ground under `#ffffff` roads is a
one-percent difference, so the street network read as absence rather than as
line work. The ground dropped to `#f3eee4`, roughly osm-carto's, and the two
road classes that had no casing worth the name got one: `road_minor_case` is
`#e2d8c8` fading to `#d8ccb8`, `road_service_case` `#e2d8c8` from z14. The
white fills are untouched — the contrast is all underneath them. The
residential tint moved with the ground so it still reads as slightly greyer
than open land rather than lighter.

**Road names** — the stock layers started late and repeated sparsely, so a
motorway could cross the screen unnamed and z13-15 was close to silent: nothing
on a residential street is named until `roadname_minor`, and that used to wait
for z16.

| Layer            | Stock | Now |
| ---------------- | ----- | --- |
| `roadname_major` | z13   | z11 |
| `roadname_pri`   | z14   | z12 |
| `roadname_sec`   | z15   | z13 |
| `roadname_minor` | z16   | z15 |

Each gained a text-size stop at the bottom of its new range, and the three
classified layers share a `symbol-spacing` that tightens from 220 at z16 to 120
at z11, so a long road gets its name several times across the screen instead of
once. Bringing `roadname_minor` down to z15 is what fills the gap — 400 named
ways in three sample tiles that drew nothing there before. The halo under the
two grey ones was still the old ground colour and is now `#f3eee4`.

**POI icons** — the tiles carry a `poi` layer with a `class` on every feature,
so toilets and playgrounds were arriving all along; what was missing was
pictures, because CARTO's sprite sheet holds exactly one image (`circle-11`,
which the city-dot layers draw). `scripts/build-basemap-sprite.mjs` builds a
second sheet into `public/map/sprite{,@2x}.{png,json}` out of the same
`@mui/icons-material` paths the app's own markers are drawn from, so a toilet
on the basemap and a toilet on a marker are the same drawing. Where Material
has nothing that reads right the symbol is vendored into
`scripts/basemap-symbols/` instead — the playground is OSM's own see-saw, which
nothing in Material comes close to. Run
`npm run basemap:sprite` after editing its `ICONS` map; the output is
committed, and nothing else regenerates it.

The style names two sprite sources, so icon names are prefixed — `poi:toilets`.
CARTO's entry is deliberately named `default`, the id MapLibre gives a plain
string sprite, which keeps `circle-11` working unprefixed. Three layers draw
them, staged by how dense the class is:

| Layer               | From | Draws                                                        |
| ------------------- | ---- | ------------------------------------------------------------ |
| `poi_icon_civic`    | z15  | toilets, water, play, parks, transport, health, civic        |
| `poi_icon_commerce` | z16  | food, drink, groceries, lodging                              |
| `poi_icon_shop`     | z17  | the generic shop — ~3000 per Berlin tile, so it waits        |

They sit after the road names and before `housenumber`, which is the collision
order that matters: a street name beats an icon, an icon beats a house number.

`poi_icon_civic` also carries the names, for the classes worth naming — school,
college, hospital, library, museum, gallery, castle, place of worship. Its
`text-field` is a `step` on zoom wrapped round a `case` on class, so one
expression is both gates: nothing is named below z15 — where the icons
themselves start — and above it only those classes, and only where the feature
has a name. The rest of the layer stays
icons. `text-optional` is on, so a label that will not fit is dropped and its
icon stays rather than the pair going together.

The name has to come off the POI point, not the area under it: the tiles give
the `landuse` layer a `class` and nothing else, so the school polygon that
`landuse_education` paints yellow has no name in it to draw.

MapLibre will not take a relative sprite URL and does not resolve one against
the style document it just fetched, so `BasemapLayer.tsx` fetches the style
itself and rewrites `/map/sprite` to an absolute URL before handing MapLibre
the object. That is the reason the component no longer passes a style URL.

Parking and sports pitches have no icon on purpose: parking is one of the app's
own categories and drew a second pin under the first, and the ball court was
noise on top of the `landuse_pitch` fill that already says the same thing.

Material icons are Apache-2.0, the same as their use in the app bundle, and the
vendored OSM symbols are CC0, so baking either into a PNG changes nothing about
what has to ship with it.

To check a change against real data without rendering it, the tiles decode in
Node — `@mapbox/vector-tile` plus `pbf` are already in the tree, and
`featureFilter` from `@maplibre/maplibre-gl-style-spec` will tell you how many
features in a tile a layer's filter actually matches. `validateStyleMin` from
the same package catches a malformed paint property before the browser does.

## Editing it in Maputnik

Maputnik is the visual editor for MapLibre styles — layer list, color pickers,
live preview. Use the hosted build at <https://maplibre.org/maputnik/>; it is
the current version, and CARTO serves the tiles, sprite and glyphs with
`Access-Control-Allow-Origin: *`, so the preview renders the real map.

1. **Open** > *Open local file* > `apps/frontend/public/map/voyager.json`.
   Do not load it by URL from the dev server — an https page reaching
   http://localhost is a fight you do not need.
2. Edit. The layer list is the same array as in the file, in the same order.
3. **Export** > *Download*, which lands in `~/Downloads`.
4. `npm run basemap:import` — takes the newest exported style from
   `~/Downloads` and writes it back here, re-indented and with Maputnik's
   `maputnik:*` metadata stripped so the diff is cartography only. It prints
   which layers were added or removed. Pass a path to import a specific file.
5. `git diff apps/frontend/public/map/voyager.json` to see what you did, then
   `npm run dev` to see it in the app.

Maputnik has no lock on the file — it edited a copy in the browser. If you also
hand-edit the JSON between an open and an export, the export wins and your
hand-edit is gone.

One thing to watch on the way back in: the two-entry array `sprite`. If the
export flattened it to a bare string, every POI icon is gone — `git diff` will
show it plainly, and the fix is to paste the array back by hand.

To run Maputnik locally instead (same-origin, no download step for loading):
`git clone https://github.com/maplibre/maputnik && cd maputnik && npm install &&
npm start`. The old `maputnik --watch --file` binary that wrote straight to disk
was last released in 2020 and the Docker Hub image is from the same era; neither
is worth using now.

## Editing it by hand

The layers are painted in array order, first to last, so a layer's position in
`layers` is its z-order. Names are stable and descriptive: `background`,
`water`, `building`, `road_*_fill` / `road_*_case` (the case is the darker
outline drawn under the fill), `place_*` and `roadname_*` for labels,
`boundary_*` for borders.

Common edits:

- **Recolor**: change `paint.fill-color` / `line-color` / `text-color`. Values
  are often zoom-interpolated expressions — keep the expression shape and
  change only the color literals inside it.
- **Hide something**: delete the layer object, or set
  `"layout": { "visibility": "none" }`. Deleting is smaller; the visibility
  flag is easier to reverse.
- **Change when it appears**: `minzoom` / `maxzoom` on the layer.
- **Thin the labels**: raise `minzoom` on the `place_*` layers, or drop
  `housenumber` entirely — it is the last layer in the array and by far the
  densest at high zoom.

After editing, check it is still valid JSON and still parses as a style:

```
node -e "const s=require('./apps/frontend/public/map/voyager.json'); \
  console.log(s.version, s.layers.length, Object.keys(s.sources))"
```

MapLibre will log a console error naming the offending layer if a paint or
layout property is malformed, so open the browser console after `npm run dev`.

## Legibility pass

A later pass on top of "What we changed" above, aimed at the map read on a
phone in daylight.

**Buildings fade in across z13-z15, and the residential ground got tone.**
`building` and `building-top` carried no `minzoom`, so they drew wherever the
source has them; at z14 that tiles the screen in `#e4dcd0` and buries the road
network. They now start at z13 and reach full at z15 — but note the shape of
the ramp, not just the `minzoom`. An opacity ramp of `[[14, 0], [15, 1]]` means
buildings are *exactly zero at z14*, so a `minzoom` of 14 draws nothing at 14;
the ramp is `[[13, 0], [14, 0.6], [15, 1]]` so that z14 gets real weight.

The other half of that zoom looking empty was the ground. `landuse_residential`
composited to `#f0eadf` against a `#f3eee4` background — three steps out of 255,
so built-up land was indistinguishable from no data. Its tint is now
`rgb(232, 226, 216)` at 50% from z13, landing around `#eee8de`, and still steps
back at z16 where the buildings take over as the texture.

**Minor and service roads are white ribbons from z13/z14.** `road_minor_fill`
and `road_service_fill` were `minzoom: 15`, so from z13 to z15 a minor road was
its casing and nothing else — and that casing was `#e2d8c8` against a `#fbf8f3`
background, barely a shade apart. The fills now start at z13 and z14. The
casings also darkened, to `#ddd5c7`/`#d2c9b8`, and that is the half that
actually matters: white on cream is nearly invisible without an edge to hold
it, so bringing the white down without darkening the casing would have changed
very little.

**The ground carries the warmth only while the buildings cannot.** This is the
one relationship to understand before touching any of these colours. Buildings
are invisible at z13, 60% at z14, full from z15. So built-up land needs its own
light tan at z13 or it reads as empty, and needs the ground to step back to
near white by z15 or the two stack and the map goes brown. The residential fill
ramps against the buildings, not independently of them:

| Zoom | Built ground | vs the `#f3eee4` cream | Buildings |
| ---- | ------------ | ---------------------- | --------- |
| z13  | `#eae7e0`    | -9,-7,-4 (cool grey)   | none      |
| z14  | `#f5f2ea`    | about equal            | 60%       |
| z15+ | `#f8f5ef`    | +5,+7,+11 (whiter)     | full      |

All three ground stops sit in the same cool grey family — red-to-blue spreads
of 10, 11 and 11. Only the amount changes with zoom, never the temperature: a
warmer z13 was tried and read as tan next to the zoom above it, because the eye
compares the two across a pinch rather than judging either alone.

At z15 the built ground is *lighter* than the surrounding cream: built-up reads
as white, undeveloped as cream, and every bit of contrast comes from the
buildings on top. That inversion is what lets the buildings be warm without the
map browning over.

An earlier pass tinted the ground instead — `rgb(226,216,200)` with `#cbbca2`
casings — and the map went brown. The cause was saturation, not lightness:
those carry a 40-odd point spread between their red and blue channels, and
spread is what reads as brown once it covers half the screen. Move lightness,
leave the spread alone.

The building colours are zoom ramps, not flat values. z16 wanted the warm tan;
z14 wanted the same shapes in grey, because at that zoom the buildings are the
only large warm surface on screen and they tip the whole view brown. So each
ramps from a grey-leaning value at z14 to the warm one at z16:

| Role                   | z14       | z16       |
| ---------------------- | --------- | --------- |
| `building-top` (face)  | `#eae7de` | `#eee7d9` |
| `building` (shadow)    | `#dcd7cc` | `#e0d6c4` |
| `building-top` outline | `#d8d4c9` | `#dcd0b9` |

That drops the face's red-to-blue spread from 21 to 11 at z14 and leaves z16
exactly as it was. If you retune the close zoom, change the z16 stop and leave
the z14 stop alone, or the far zoom browns again.

`building-top` is the face you actually see — its `fill-translate` is `[0,0]`
until z16 — so it is the layer carrying the colour. `building` sits under it
and is darker, so it reads as a shadow edge once the offset opens up.

**Trams are drawn dark; everything else on rails is not.** `tram` is its own
layer at `#808080`, split out of `transit`, which now covers only
`subway` / `light_rail` / `monorail`. The distinction is what the line is for:
the S-Bahn, U-Bahn and mainline are background texture and stay pale
`#c9ced3`, while a tram is street-level transit someone using this app might
actually board, so it is drawn to be read. `tram_tunnel` draws underground trams dashed, so a line under the street
cannot be read as one running on it. Its `line-dasharray` is in line-width
units, so the dashes hold their proportions as the line thickens with zoom and
need no stops of their own. Note that Berlin has no underground tram in the
data — four sampled tiles across the city return zero `brunnel=tunnel` trams —
so this layer is correct but invisible here; it is for cities that have them.

Also worth knowing: the tiles carry no `class=transit` at all below z14, so
none of the tram, transit or rail layers draw at z13 no matter what their
`minzoom` says.

The four filters partition the
rail-ish features with no overlap — check that if you touch any of them, or a
line will either double-draw or vanish.

**Small roads change treatment at z15.** From z13 to z14 they are thin grey
lines (`#c0c4c6` fading to `#d3d5d3`), drawn by the casing alone —
`road_minor_fill` and `road_service_fill` do not start until z15. A white
ribbon with a casing needs width to read as one, and at z13 there is none: it
just washes out into the ground. From z15 the casing warms to `#d3ccc0` and
hands over to the white-fill treatment, which by then has room to work.

**Rail: `light_rail` added, and a `rail` layer that did not exist.** Two
separate gaps. The `transit` filter listed `tram` and `subway` but not
`light_rail`, which is what the tiles call an S-Bahn — so a line drawn as tram
or subway stopped dead wherever it handed over to one, on the surface, looking
like a data error. Separately nothing in the style matched `class == "rail"`
at all, so mainline track was never drawn. In one z14 tile over Friedrichshain
that is 13 features drawing nothing: 7 mainline, 6 S-Bahn.

Both now draw in a light cool grey `#c9ced3`, replacing the old `#7c8288`,
which read as a hard dark line rather than the background texture rail should
be. Tunnels stay filtered out of both — an underground line drawn on the
surface is worse than no line.

To re-check that against live data, decode a tile and run the layer filters
over it rather than trusting the map by eye; `class`/`subclass`/`brunnel` are
what the filters turn on, and they are not guessable from the rendered image.

## Pulling a fresh upstream copy

CARTO changes Voyager occasionally. To rebase your edits onto a newer version,
re-run the `curl` above on a clean branch, commit that as the new pristine
copy, then merge your edit commits on top — that way `git` shows you exactly
which of your changes upstream has moved under.

## Licensing

The tiles, sprites and fonts remain CARTO's service under CARTO's terms whether
or not the style document is local, so the API key story is unchanged. The
style document itself is published at github.com/CartoDB/basemap-styles —
check the license there before shipping a modified copy, and keep the CARTO and
OpenStreetMap attribution the map already shows.
