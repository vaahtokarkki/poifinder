import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import type { RequestParameters } from "maplibre-gl";

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
 */
const STYLE_URL = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

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

const BasemapLayer = () => {
  const map = useMap();

  useEffect(() => {
    // Everything else is left at the adapter's defaults, which are the ones
    // this needs: the GL map is non-interactive so Leaflet keeps the pointer
    // events, it renders into tilePane so it sits under every marker, and its
    // own attribution control is off so the credits the style carries — CARTO
    // and OpenStreetMap — land in Leaflet's control instead, once the style
    // has loaded and the adapter can read them off the source
    const layer = maplibreGL({ style: withKey(STYLE_URL), transformRequest });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map]);

  return null;
};

export default BasemapLayer;
