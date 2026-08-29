# Vendored map symbols

SVGs the sprite builder draws from that are not `@mui/icons-material`. One file
per symbol, referenced from `ICONS` in `../build-basemap-sprite.mjs` by its
filename; anything whose value there ends in `.svg` is looked up here.

Keep them single-colour and path-only. The builder recolours every path with
the ink named beside it and draws a white halo from the same paths, so a fill
or a stroke set inside the file is ignored, and a `<rect>`, `<circle>` or
`<g transform>` is dropped on the floor — convert those to paths before
vendoring. The `viewBox` is read from the file, so the source's own grid
(14x14 for OSM's, 24x24 for Material's) needs no adjusting.

| File              | From                                                  | Licence |
| ----------------- | ----------------------------------------------------- | ------- |
| `playground.svg`  | openstreetmap-carto `symbols/leisure/playground.svg`   | CC0     |

openstreetmap-carto is CC0 in full, cartographic design included, so its
symbols carry no attribution requirement — the row above is provenance, not an
obligation.
