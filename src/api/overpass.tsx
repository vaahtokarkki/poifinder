import { getCoords } from "@turf/turf";
import { Feature, Polygon } from "geojson";
import { CATEGORIES, CATEGORY_CONFIG } from "../constants";

export type OverpassMarkerData = {
  position: [number, number];
  name?: string;
  tags?: Record<string, string>;
  type?: string;
};

const buildBaseOverpassQuery = (
  filters: string[],
  spatialFilter: string,
) => {
  // ${center ? `(around:${radius},${center[0]},${center[1]})` : `(${bbox.join(",")})`};`;
  const queryStr = (filter: string) => `nwr${filter}${spatialFilter};`;

  const filterBlocks = filters
    .map(filter =>
      queryStr(filter)
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

const buildOverpassQueryForSingleLocation = (
  center: [number, number] | null,
  radius: number,
  filters: string[],
  bbox: [number, number, number, number]
) => buildBaseOverpassQuery(filters, (center ? `(around:${radius},${center[0]},${center[1]})` : `(${bbox.join(",")})`));

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
  // Get coordinates as [lng, lat] and flatten to Overpass poly string (lat lon pairs)
  const coords = getCoords(polygon)[0]; // outer ring
  const polyString = coords.map(([lng, lat]) => `${lat} ${lng}`).join(" ");
  return buildBaseOverpassQuery(filters, `(poly:"${polyString}")`);
}

type OverpassElement = {
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export async function fetchOverpassMarkers(
  center: [number, number] | null,
  radius: number,
  categories: CATEGORIES[],
  bbox: [number, number, number, number],
  polygon?: Feature<Polygon> | null
): Promise<OverpassElement[]> {
  // Map categories to filter strings using CATEGORY_CONFIG
  const filters = categories.flatMap(cat => CATEGORY_CONFIG[cat].filters || []);

  const overpassUrl = "https://overpass-api.de/api/interpreter";
  const body = polygon
    ? buildOverpassQueryForPolygon(polygon, filters)
    : buildOverpassQueryForSingleLocation(center, radius, filters, bbox);

  const res = await fetch(overpassUrl, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const data = await res.json();

  const elements: OverpassElement[] = data.elements || [];
  return elements
    .map((el: OverpassElement) => {
      if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
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
