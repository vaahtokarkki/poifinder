import { getCoords } from "@turf/turf";
import { point } from "@turf/helpers";
import type { Feature, Polygon, Point} from "geojson";
import { CATEGORIES, CATEGORY_CONFIG, OVERPASS_API_CONFIG } from "../constants";
import { fetchWithRetry } from "../utils/retryFetch";

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

  const body = polygon
    ? buildOverpassQueryForPolygon(polygon, filters)
    : buildOverpassQueryForSingleLocation(center, radius, filters, bbox);

  // Callback to detect retryable errors (429, 4xx, 5xx)
  const isRetryableError = async (response: Response): Promise<boolean> => {
    // Retry on any 4xx or 5xx status (transient errors)
    if (response.status >= 400) {
      if (response.status === 429) {
        console.debug("[Overpass] Rate limit detected (HTTP 429)");
      } else if (response.status >= 500) {
        console.debug(`[Overpass] Server error detected (HTTP ${response.status})`);
      } else {
        console.debug(`[Overpass] Client error detected (HTTP ${response.status})`);
      }
      return true;
    }

    return false;
  };

  const tryFetchFromURL = async (
    url: string,
    maxRetries: number,
    passNumber: number
  ): Promise<OverpassMarkerData[]> => {
    const res = await fetchWithRetry(
      url,
      {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
      {
        maxRetries,
        initialDelayMs: OVERPASS_API_CONFIG.RETRY.initialDelayMs,
        backoffMultiplier: OVERPASS_API_CONFIG.RETRY.backoffMultiplier,
        jitterPercent: OVERPASS_API_CONFIG.RETRY.jitterPercent,
        isRetryableError,
      }
    );

    // Check if response is successful
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    // Parse and validate response
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Failed to parse Overpass API response as JSON");
    }

    // Extract and transform elements
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
  };

  // Pass 1: Try each URL once (no retries, fast failover)
  console.debug("[Overpass] Starting pass 1: trying each URL once (quick failover)");
  const pass1Errors: string[] = [];
  for (let urlIndex = 0; urlIndex < OVERPASS_API_CONFIG.URLS.length; urlIndex++) {
    const url = OVERPASS_API_CONFIG.URLS[urlIndex];
    try {
      if (urlIndex > 0) {
        console.debug(`[Overpass] Pass 1: Trying URL ${urlIndex + 1}/${OVERPASS_API_CONFIG.URLS.length}: ${url}`);
      }

      const result = await tryFetchFromURL(url, 0, 1); // maxRetries: 0 for pass 1
      console.debug(`[Overpass] Pass 1: Successfully fetched from URL ${urlIndex + 1}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      pass1Errors.push(`${url}: ${errorMsg}`);
      console.debug(`[Overpass] Pass 1: URL ${urlIndex + 1} failed (${errorMsg}), trying next...`);
    }
  }

  // Pass 2: All URLs failed in pass 1, now retry with exponential backoff
  console.debug("[Overpass] Pass 1 failed, starting pass 2: retrying all URLs with exponential backoff");
  const pass2Errors: string[] = [];
  for (let urlIndex = 0; urlIndex < OVERPASS_API_CONFIG.URLS.length; urlIndex++) {
    const url = OVERPASS_API_CONFIG.URLS[urlIndex];
    try {
      console.debug(`[Overpass] Pass 2: Retrying URL ${urlIndex + 1}/${OVERPASS_API_CONFIG.URLS.length}: ${url}`);

      const result = await tryFetchFromURL(url, OVERPASS_API_CONFIG.RETRY.maxRetries, 2); // maxRetries: 3 for pass 2
      console.debug(`[Overpass] Pass 2: Successfully fetched from URL ${urlIndex + 1} after retries`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      pass2Errors.push(`${url}: ${errorMsg}`);
      console.debug(`[Overpass] Pass 2: URL ${urlIndex + 1} failed even after retries (${errorMsg})`);
    }
  }

  // All passes exhausted
  console.error("[Overpass] All passes exhausted. Pass 1 errors:", pass1Errors, "Pass 2 errors:", pass2Errors);
  throw new Error(`All Overpass API servers are unavailable. Tried: ${OVERPASS_API_CONFIG.URLS.length} server(s).`);
}
