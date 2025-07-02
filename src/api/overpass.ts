import { getCoords } from "@turf/turf";
import { point } from "@turf/helpers";
import type { Feature, Polygon, Point} from "geojson";
import { CATEGORIES, CATEGORY_CONFIG } from "../constants";

export type OverpassMarkerData = {
  id: number | string;
  geom: Feature<Point>;
  position?: [number, number]; // Leaflet expects position as [lng, lat]
  name?: string;
  tags?: Record<string, string>;
  type?: string;
};

const buildBaseOverpassQuery = (
  filters: string[],
  spatialFilter: string,
) => {
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

export function buildOverpassQueryForPolygon(
  polygon: Feature<Polygon>,
  filters: string[]
) {
  const coords = getCoords(polygon)[0]; // outer ring
  const polyString = coords.map(([lng, lat]) => `${lat} ${lng}`).join(" ");
  return buildBaseOverpassQuery(filters, `(poly:"${polyString}")`);
}

type OverpassElement = {
  id: number | string;
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
): Promise<OverpassMarkerData[]> {
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
          id: el.id,
          position: [el.lat, el.lon] as [number, number],
          geom: point([el.lon, el.lat]),
          name: el.tags?.name,
          tags: el.tags,
          type: el.type,
        };
      }
      if (el.type !== "node" && el.center) {
        return {
          id: el.id,
          position: [el.center.lat, el.center.lon] as [number, number],
          geom: point([el.center.lon, el.center.lat]),
          name: el.tags?.name,
          tags: el.tags,
          type: el.type,
        };
      }
      return null;
    })
    .filter(Boolean) as OverpassMarkerData[];
}
