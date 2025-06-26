import { getCoords } from "@turf/turf";
import { Feature, Polygon } from "geojson"

export type OverpassMarkerData = {
  position: [number, number];
  name?: string;
  tags?: Record<string, string>;
  type?: string;
};

const extraFilterMap: Record<string, string | undefined> = {
  "amenity=parking": "[access!=private]",
  // Add more mappings here if needed
};

const buildOverpassQueryForSingleLocation = (
  center: [number, number] | null,
  radius: number,
  filters: string[],
  bbox: [number, number, number, number]
) => {
  const filterArr = Array.isArray(filters) ? filters : [filters];

  const elementTypes = ["node", "way", "relation"];
  const locationStr = center
    ? (type: string, filter: string, extra: string = "") =>
        `${type}[${filter}]${extra}(around:${radius},${center[0]},${center[1]});`
    : (type: string, filter: string, extra: string = "") =>
        `${type}[${filter}]${extra}(${bbox.join(",")});`;

  const filterBlocks = filterArr
    .map(filter =>
      elementTypes
        .map(type =>
          locationStr(type, filter, extraFilterMap[filter] || "")
        )
        .join("\n")
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

  const elementTypes = ["node", "way", "relation"];
  const filterBlocks = filterArr
    .map(filter =>
      elementTypes
        .map(
          type =>
            `${type}[${filter}]${extraFilterMap[filter] || ""}(poly:"${polyString}");`
        )
        .join("\n")
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
