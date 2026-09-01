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
/**
 * How many points across a shape are worth reading a modelled value at.
 *
 * The grid below is laid over the bounding box and thinned to what falls
 * inside, so a compact park keeps most of its candidates and a crescent bay
 * keeps a third of them. Twenty five candidates is the size where a playground
 * the size of a tennis court still gets several readings and a forest park
 * does not cost fifty hit tests to describe in one word.
 */
const SAMPLE_GRID = 5;

/**
 * Where to read a modelled value across a shape, rather than at one point in
 * it.
 *
 * The centroid answers "what is it like in the middle", and for a park with a
 * road down one side that is the wrong question: the middle can be the only
 * quiet corner of somewhere nobody would sit, or the one loud strip of
 * somewhere pleasant. What the reader is deciding is what the place as a whole
 * is like, and that is a question about area.
 *
 * So: a grid over the bounding box, keeping the points that fall inside the
 * shape. Evenly spaced, which is what makes counting them the same as
 * weighting by area — every point stands for an equal patch of the place. The
 * centroid comes first in the list so that a caller that can only use one
 * point still gets the best one, and so that a shape too thin to catch any
 * grid point at all still gets an answer.
 *
 * Longitude spacing is not corrected for latitude. The grid only has to be
 * even *within one shape*, and no park is wide enough for the convergence of
 * the meridians to skew which half of it is loud.
 */
export function shapeSamplePoints(shape: OverpassShape | null): [number, number][] {
  const centre = shapeSamplePoint(shape);
  if (!shape || !centre) return centre ? [centre] : [];

  const coordinates = shape.polygons.map((rings) =>
    rings.map((ring) => ring.map(([lat, lng]) => [lng, lat] as [number, number]))
  );

  let feature;
  try {
    feature = multiPolygon(coordinates);
  } catch {
    return [centre];
  }

  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const rings of shape.polygons) {
    for (const [lat, lng] of rings[0]) {
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      if (lng < west) west = lng;
      if (lng > east) east = lng;
    }
  }
  if (!Number.isFinite(south) || !Number.isFinite(west)) return [centre];

  const points: [number, number][] = [centre];
  // Cell centres rather than the box edges: a grid that starts at the corner
  // spends its first row and column on the boundary, where half the samples
  // fall outside the shape and the rest describe its edge
  for (let row = 0; row < SAMPLE_GRID; row++) {
    const lat = south + ((row + 0.5) * (north - south)) / SAMPLE_GRID;
    for (let column = 0; column < SAMPLE_GRID; column++) {
      const lng = west + ((column + 0.5) * (east - west)) / SAMPLE_GRID;
      try {
        if (booleanPointInPolygon([lng, lat], feature)) points.push([lat, lng]);
      } catch {
        // A degenerate ring turf will not test against. The centroid stands
      }
    }
  }
  return points;
}

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
