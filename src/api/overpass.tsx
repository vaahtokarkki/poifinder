import { Feature, Polygon, getCoords } from "@turf/turf";

export type OverpassMarkerData = {
  position: [number, number];
  name?: string;
  tags?: Record<string, string>;
  type?: string;
};

const buildOverpassQueryForSingleLocation = (
  center: [number, number] | null,
  radius: number,
  filters: string[],
  bbox: [number, number, number, number]
) => {
  const filterArr = Array.isArray(filters) ? filters : [filters];

  // Determine the location filter string for each element type
  const locationFilter = center
    ? (type: string) => `[${filterArr.join("]|[")}]` + `(around:${radius},${center[0]},${center[1]})`
    : (type: string) => `[${filterArr.join("]|[")}]` + `(${bbox.join(",")})`;

  // Build the Overpass QL for all element types with all filters
  const elementTypes = ["node", "way", "relation"];
  const filterBlocks = elementTypes
    .map(
      (type) => `${type}${locationFilter(type)};`
    )
    .join("\n");

  return `
    [out:json];
    (
      ${filterBlocks}
    );
    out center;
  `;
};

/**
 * Build Overpass QL query for a polygon area using the 'poly' filter.
 * @param polygon A turf.js Polygon feature (GeoJSON)
 * @param filters Array of Overpass filter strings (e.g. ["leisure=playground"])
 * @returns Overpass QL string
 */
export function buildOverpassQueryForPolygon(
  polygon: Feature<Polygon>,
  filters: string[]
) {
  const filterArr = Array.isArray(filters) ? filters : [filters];

  // Get coordinates as [lng, lat] and flatten to Overpass poly string (lat lon pairs)
  const coords = getCoords(polygon)[0]; // outer ring
  const polyString = coords.map(([lng, lat]) => `${lat} ${lng}`).join(" ");

  // Compose filter string
  const filterString = `[${filterArr.join("]|[")}]`;

  // Build for all element types
  const elementTypes = ["node", "way", "relation"];
  const filterBlocks = elementTypes
    .map(
      (type) => `${type}${filterString}(poly:"${polyString}");`
    )
    .join("\n");

  return `
    [out:json];
    (
      ${filterBlocks}
    );
    out center;
  `;
}

export async function fetchOverpassMarkers(
  center: [number, number] | null,
  radius: number,
  query: string[],
  bbox: [number, number, number, number],
  polygon?: Feature<Polygon> | null
): Promise<OverpassMarkerData[]> {
  const overpassUrl = "https://overpass-api.de/api/interpreter";
  const body = polygon ? buildOverpassQueryForPolygon(polygon, query) : buildOverpassQueryForSingleLocation(center, radius, query, bbox);

  const res = await fetch(overpassUrl, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const data = await res.json();
  const elements = data.elements || [];
  return elements
    .map((el: any) => {
      if (el.type === "node" && el.lat && el.lon) {
        return {
          position: [el.lat, el.lon] as [number, number],
          name: el.tags?.name,
          tags: el.tags,
          type: el.type,
        };
      }
      if (el.type !== "node" && el.center) {
        return {
          position: [el.center.lat, el.center.lon] as [number, number],
          name: el.tags?.name,
          tags: el.tags,
          type: el.type,
        };
      }
      return null;
    })
    .filter(Boolean);
}
