import { OverpassMarkerData } from "./api/overpass";
import type { OverpassShape } from "./api/overpass";
import { multiPolygon, polygon } from "@turf/helpers";
import { centerOfMass } from "@turf/center-of-mass";
import { pointOnFeature } from "@turf/point-on-feature";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
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

/**
 * Where to sample a modelled value for a point OpenStreetMap drew as a shape.
 *
 * The marker of a way or a relation sits at the middle of its bounding box —
 * see the position in api/overpass.ts, and note that `out center` computes the
 * same thing, so this is not a shortcut the app took. For a compact shape that
 * is close enough to the middle to be the middle. For a crescent bay, an
 * L-shaped park or a green ring around a housing block it is not in the shape
 * at all, and the noise band read there is the band of whatever *is* there,
 * which is usually the road the shape bends around.
 *
 * So: the area weighted centroid, which is the middle a person would point at.
 * Checked for being inside, because a centroid need not be — the crescent
 * again — and falling back to a point that is guaranteed to lie on the feature
 * when it is not. Sampling outside the shape is the bug being fixed here, and
 * an off-centre point inside it is a far smaller error than an accurate one
 * outside.
 *
 * Rings arrive as Leaflet [lat, lng] and GeoJSON wants [lng, lat], which is
 * the one thing to be careful of in here.
 *
 * Returns null for a shape with no closed ring — an unclosed way is a line,
 * whose middle is already what the bounding box gives — and for anything
 * turf cannot make a polygon of, so that the caller keeps the marker position
 * rather than losing the row.
 */
export function shapeSamplePoint(shape: OverpassShape | null): [number, number] | null {
  if (!shape || shape.polygons.length === 0) return null;

  const coordinates = shape.polygons.map((rings) =>
    rings.map((ring) => ring.map(([lat, lng]) => [lng, lat] as [number, number]))
  );

  let feature;
  try {
    feature = multiPolygon(coordinates);
  } catch {
    // An unclosed or degenerate ring. The marker position is still an answer
    return null;
  }

  try {
    const middle = centerOfMass(feature);
    const inside = booleanPointInPolygon(middle, feature)
      ? middle
      : pointOnFeature(feature);
    const [lng, lat] = inside.geometry.coordinates as [number, number];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  } catch {
    return null;
  }
}
