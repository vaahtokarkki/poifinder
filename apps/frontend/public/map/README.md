# The basemap style

`voyager.json` is the style document the map is drawn from. It started as a
verbatim copy of CARTO's Voyager style, taken on 2026-08-29:

```
curl -sS https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>process.stdout.write(JSON.stringify(JSON.parse(d),null,2)+'\n'))" \
  > apps/frontend/public/map/voyager.json
```

It is served as a static asset at `/map/voyager.json` and loaded by
`src/components/BasemapLayer.tsx`. Vite copies `public/` into `dist/` verbatim,
so it ships with a normal `npm run deploy` and needs nothing else.

## What is and isn't local

Only the document. The three URLs inside it are still absolute and still point
at CARTO:

| Field           | Serves                                    |
| --------------- | ----------------------------------------- |
| `sources.carto` | the TileJSON, and through it the tiles     |
| `sprite`        | the icon sheet the symbol layers draw from |
| `glyphs`        | the font PBFs the labels are set in        |

They all resolve under `cartocdn.com`, so `transformRequest` in BasemapLayer
still appends `VITE_CARTO_API_KEY` to every one of them. Leave them absolute
unless you are also self-hosting tiles — a style with a local `sources` block
and no tiles behind it draws an empty canvas.

## Editing it

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
