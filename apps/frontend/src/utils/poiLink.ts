import type { OverpassMarkerData } from "../api/overpass";

/**
 * A link to one point on the map.
 *
 * The point travels as `poi=node/123456`, which is the same string the map
 * keys its markers by, and the coordinates travel with it. Both, because they
 * answer different questions: the id is what the popup is rebuilt from, and
 * the coordinates are what lets the map be in the right place before the
 * lookup has returned — and the only thing left to show if the point has been
 * deleted from OpenStreetMap since the link was made.
 *
 * The coordinates are the point's own, not the map's. A link to a fountain
 * should open on the fountain however the map happened to be sitting when it
 * was shared.
 */
export const POI_PARAM = "poi";

/** The point's identity, as `node/123456` */
export const poiRef = (marker: OverpassMarkerData): string =>
  `${marker.type}/${marker.id}`;

export function poiShareUrl(marker: OverpassMarkerData): string {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  url.searchParams.set(POI_PARAM, poiRef(marker));
  if (marker.position) {
    url.searchParams.set("lat", marker.position[0].toFixed(6));
    url.searchParams.set("lon", marker.position[1].toFixed(6));
  }
  return url.toString();
}

/**
 * The point a URL asks for, or null. Parsed strictly: anything that is not one
 * of the three OpenStreetMap types followed by digits is somebody editing the
 * address bar, and is ignored rather than sent to Overpass.
 */
export function parsePoiRef(
  search: string
): { type: "node" | "way" | "relation"; id: string } | null {
  const raw = new URLSearchParams(search).get(POI_PARAM);
  if (!raw) return null;
  const match = /^(node|way|relation)\/(\d{1,20})$/.exec(raw);
  return match
    ? { type: match[1] as "node" | "way" | "relation", id: match[2] }
    : null;
}
