import * as turf from "@turf/turf";

/**
 * Buffers an array of [lat, lng] points by 500 meters and returns a GeoJSON polygon.
 * @param points Array of [lat, lng] coordinates
 * @returns GeoJSON Polygon feature
 */
export function bufferPointsToPolygon(points: [number, number][]): turf.Feature<turf.Polygon> | null {
  if (!points || points.length === 0) return null;

  // Convert [lat, lng] to [lng, lat] for turf
  const turfPoints = points.map(([lat, lng]) => [lng, lat]);
  const featureCollection = turf.featureCollection(
    turfPoints.map((coords) => turf.point(coords))
  );

  // Buffer each point by 500 meters
  const buffered = turf.buffer(featureCollection, 500,  {units: 'meters'});
  if (!buffered) return null;

  const unified = turf.union(buffered);
  // Union all buffered polygons into one
  // const unified = buffered.features.reduce((acc, feature) => {
  //   if (!acc) return feature; // first feature
  //   return turf.union(turf.featureCollection([acc, feature])); // union current with accumulator
  // }, null);

  return unified;
}
