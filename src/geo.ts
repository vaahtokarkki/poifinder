import { OverpassMarkerData } from "./api/overpass";
import { polygon } from "@turf/helpers";
import { transformScale } from "@turf/transform-scale";
import { booleanIntersects } from "@turf/boolean-intersects";
import { Polygon } from "geojson";
import { booleanContains } from "@turf/turf";

/**
 * Construct a Turf.js Polygon from a bounding box.
 * @param bbox [south, west, north, east]
 * @returns Turf Polygon feature
 */
export function bboxToTurfPolygon(
  bbox: [number, number, number, number]
): Polygon {
  const [south, west, north, east] = bbox;
  return polygon([
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ]).geometry;
}

export function filterMarkersInBbox(
  markers: OverpassMarkerData[],
  bbox: [number, number, number, number]
): OverpassMarkerData[] {
  if (!bbox || bbox.length !== 4) {
    return markers; // Return all markers if bbox is invalid
  }
  const polygonFeature = bboxToTurfPolygon(bbox);
  transformScale(polygonFeature, 2, { mutate: true });
  const out =  markers.filter((marker) => booleanIntersects(marker.geom.geometry, polygonFeature))
  return out
}
