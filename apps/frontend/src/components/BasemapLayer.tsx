import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import type { RequestParameters, StyleSpecification } from "maplibre-gl";
import { installNoiseWhenBasemapReady } from "../map/noiseTiles";
import { installAirWhenBasemapReady } from "../map/airTiles";
import { setGlMap } from "../map/glMap";

/**
 * The CARTO Voyager basemap, drawn from vector tiles.
 *
 * This used to be a react-leaflet <TileLayer> pointed at
 * rastertiles/voyager/{z}/{x}/{y}{r}.png. CARTO now wants a key on every
 * request to basemaps.cartocdn.com and serves unkeyed raster tiles
 * watermarked, so the layer had to be touched anyway — vector is the same
 * Voyager cartography, stays sharp on a retina screen without asking for the
 * {r} tiles, and costs one tile request per four zoom levels rather than one
 * per tile, which is the difference between the free tier holding and not.
 *
 * MapLibre draws it into a canvas the adapter parks in Leaflet's tilePane, so
 * everything above it — the markers, the clusters, the route line — is
 * untouched Leaflet and behaves exactly as it did.
 *
 * The style document is a copy of CARTO's, vendored into public/map and edited
 * since — public/map/README.md has how it was taken, what was changed and how
 * to pull a fresh upstream copy under it. The document and the POI sprite sheet
 * beside it are the local parts; the tile source, CARTO's own sprite and the
 * glyph server are still absolute cartocdn.com URLs, so tiles, city dots and
 * fonts come from CARTO exactly as before, and so does the attribution the
 * adapter reads off the source.
 */
/**
 * Absolute, not relative: every real path is prerendered at its own depth
 * (/helsinki/toilets), and a relative style URL would resolve against that.
 */
const STYLE_URL = "/map/voyager.json";

/**
 * Set it and every CARTO request carries the key. Leave it unset and the map
 * still draws today, on CARTO's sufferance: they have said the key is coming
 * for vector too, and the day it lands an unkeyed build has no basemap at all.
 */
const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY?.trim();

/**
 * The key has to reach more than the style document: the style points at a
 * sprite sheet, a glyph server and a TileJSON on tiles.basemaps.cartocdn.com,
 * and that TileJSON points at four more tiles-a..d hosts. MapLibre passes every
 * one of them through transformRequest, which is the only place that sees the
 * whole set.
 */
function withKey(url: string): string {
  if (!CARTO_API_KEY || !url.startsWith("http")) return url;
  const parsed = new URL(url);
  if (!parsed.hostname.endsWith("cartocdn.com")) return url;
  parsed.searchParams.set("key", CARTO_API_KEY);
  return parsed.toString();
}

const transformRequest = (url: string): RequestParameters => ({ url: withKey(url) });

/**
 * The style is fetched here rather than handed to MapLibre as a URL, for one
 * reason: the POI icons.
 *
 * Those come from a second sprite sheet of our own, built by
 * `scripts/build-basemap-sprite.mjs` and served out of public/map alongside the
 * style. MapLibre will not take that sheet's URL relative — normalizeSpriteURL
 * puts it through `new URL(url)` with no base and throws "must be absolute" —
 * and it does not resolve it against the style document it just fetched, nor
 * does the Map constructor pass `transformStyle` through to the first load.
 * Its own error message says to modify the style instead, so that is what this
 * does. The URL cannot simply be absolute in the file: the origin is
 * localhost:5173 in dev and wayside.cc in prod.
 *
 * CARTO's sheet is the entry named `default`, which is the id MapLibre gives a
 * plain string sprite, so its images keep their bare names and the `circle-11`
 * the city-dot layers draw is unaffected.
 */
async function loadStyle(signal: AbortSignal): Promise<StyleSpecification> {
  const response = await fetch(withKey(STYLE_URL), { signal });
  if (!response.ok) {
    throw new Error(`basemap style: ${response.status} ${response.statusText}`);
  }
  const style: StyleSpecification = await response.json();
  if (Array.isArray(style.sprite)) {
    style.sprite = style.sprite.map(sheet =>
      sheet.url.startsWith("/")
        ? { ...sheet, url: new URL(sheet.url, window.location.origin).toString() }
        : sheet,
    );
  }
  return style;
}

const BasemapLayer = () => {
  const map = useMap();

  useEffect(() => {
    const abort = new AbortController();
    let layer: ReturnType<typeof maplibreGL> | undefined;
    let detachNoise: (() => void) | undefined;
    let detachAir: (() => void) | undefined;

    loadStyle(abort.signal)
      .then(style => {
        if (abort.signal.aborted) return;
        // Everything else is left at the adapter's defaults, which are the ones
        // this needs: the GL map is non-interactive so Leaflet keeps the pointer
        // events, it renders into tilePane so it sits under every marker, and
        // its own attribution control is off so the credits the style carries —
        // CARTO and OpenStreetMap — land in Leaflet's control instead, once the
        // style has loaded and the adapter can read them off the source
        layer = maplibreGL({ style, transformRequest });
        layer.addTo(map);

        const glMap = layer.getMaplibreMap();
        /**
         * Published for the overlays' sake: the noise popup asks which band a
         * point falls in and only the GL map holding the tile can answer, and
         * the layers panel asks where the view is centred. A build with
         * neither overlay configured simply never asks
         */
        setGlMap(glMap);
        /**
         * And the noise layer itself, added only once this basemap has
         * finished drawing. It used to be part of the style document handed to
         * MapLibre, which meant its tiles were requested alongside CARTO's and
         * competed with them for the connection. The basemap is what the
         * reader is waiting for; noise is an overlay most of them never open
         */
        detachNoise = installNoiseWhenBasemapReady(glMap);
        /**
         * And the air quality wash, on the same terms and for the same reason.
         * Two independent installs rather than one that adds both: each is a
         * no-op in a build where its own tile URL is unset, so a checkout with
         * one tile server configured and not the other gets exactly the layer
         * it has
         */
        detachAir = installAirWhenBasemapReady(glMap);
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        // Nothing to fall back to — the map draws its markers over an empty
        // pane — so say why in the console rather than failing silently
        console.error("basemap style failed to load", error);
      });

    return () => {
      abort.abort();
      detachNoise?.();
      detachAir?.();
      setGlMap(null);
      if (layer) map.removeLayer(layer);
    };
  }, [map]);

  return null;
};

export default BasemapLayer;
