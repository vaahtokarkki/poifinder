import { getCoords } from "@turf/turf";
import { point } from "@turf/helpers";
import type { Feature, Polygon, Point} from "geojson";
import {
  CATEGORIES,
  CATEGORY_CONFIG,
  OVERPASS_API_CONFIG,
  SELF_HOSTED_OVERPASS_URL,
} from "../constants";
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

/** A point of a way as Overpass writes it under `out geom` */
type OverpassGeomPoint = { lat: number; lon: number };

type OverpassElement = {
  id: number | string;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  /** The way's own points, only present when the query asked for geometry */
  geometry?: OverpassGeomPoint[];
  /** A relation's parts, each with its own geometry under `out geom` */
  members?: {
    type: "node" | "way" | "relation";
    ref?: number;
    role?: string;
    geometry?: OverpassGeomPoint[];
  }[];
  tags?: Record<string, string>;
};

/**
 * Ask every Overpass server we know about, in turn, until one answers.
 *
 * Shared by every query the app makes, because the fallback order is a property
 * of the deployment rather than of the question being asked: a self hosted
 * instance first when there is one, then the public mirrors quickly one after
 * another, then the same list again with backoff.
 */
async function runOverpassQuery(
  body: string,
  onStatusChange?: (status: string) => void
): Promise<OverpassElement[]> {
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
    maxRetries: number
  ): Promise<OverpassElement[]> => {
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

    return (data.elements || []) as OverpassElement[];
  };

  /**
   * True once the self hosted instance has been tried and has failed, which is
   * the only thing that puts a configured deployment on the public mirrors.
   * The loading text says so from then on, because the searches that follow
   * are slower and it should be clear that this is a degraded state rather
   * than how the app normally behaves
   */
  let usingFallback = false;

  const status = (text: string) =>
    onStatusChange?.(usingFallback ? `Our server is down, using a public one. ${text}` : text);

  // A self hosted instance is asked once, with no retries and no backoff:
  // there is no shared rate limit to be polite about, and a slow retry loop
  // against our own server helps nobody. Nothing is said in the loading screen
  // for it either. The normal case is one fast request, and a line of status
  // text that appears and disappears is noise rather than information.
  //
  // Should it fail, the public mirrors are still there, and using them beats
  // showing an empty map because one machine is rebooting.
  if (SELF_HOSTED_OVERPASS_URL) {
    console.debug(`[Overpass] Using self hosted instance: ${SELF_HOSTED_OVERPASS_URL}`);
    try {
      return await tryFetchFromURL(SELF_HOSTED_OVERPASS_URL, 0);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[Overpass] Self hosted instance failed (${errorMsg}), falling back to the public mirrors`
      );
      usingFallback = true;
    }
  }

  // Pass 1: Try each URL once (no retries, fast failover)
  console.debug("[Overpass] Starting pass 1: trying each URL once (quick failover)");
  const pass1Errors: string[] = [];
  for (let urlIndex = 0; urlIndex < OVERPASS_API_CONFIG.URLS.length; urlIndex++) {
    const url = OVERPASS_API_CONFIG.URLS[urlIndex];
    try {
      status(`Loading from server ${urlIndex + 1}/${OVERPASS_API_CONFIG.URLS.length}...`);
      console.debug(`[Overpass] Pass 1: Trying URL ${urlIndex + 1}/${OVERPASS_API_CONFIG.URLS.length}: ${url}`);

      const result = await tryFetchFromURL(url, 0); // maxRetries: 0 for pass 1
      console.debug(`[Overpass] Pass 1: Successfully fetched from URL ${urlIndex + 1}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      pass1Errors.push(`${url}: ${errorMsg}`);
      status(`Server ${urlIndex + 1} failed (${errorMsg}). Trying next...`);
      console.debug(`[Overpass] Pass 1: URL ${urlIndex + 1} failed (${errorMsg}), trying next...`);
    }
  }

  // Pass 2: All URLs failed in pass 1, now retry with exponential backoff
  console.debug("[Overpass] Pass 1 failed, starting pass 2: retrying all URLs with exponential backoff");
  status("All servers failed. Retrying with exponential backoff...");
  const pass2Errors: string[] = [];
  for (let urlIndex = 0; urlIndex < OVERPASS_API_CONFIG.URLS.length; urlIndex++) {
    const url = OVERPASS_API_CONFIG.URLS[urlIndex];
    try {
      status(`Retrying server ${urlIndex + 1}/${OVERPASS_API_CONFIG.URLS.length} with backoff...`);
      console.debug(`[Overpass] Pass 2: Retrying URL ${urlIndex + 1}/${OVERPASS_API_CONFIG.URLS.length}: ${url}`);

      const result = await tryFetchFromURL(url, OVERPASS_API_CONFIG.RETRY.maxRetries); // maxRetries: 3 for pass 2
      console.debug(`[Overpass] Pass 2: Successfully fetched from URL ${urlIndex + 1} after retries`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      pass2Errors.push(`${url}: ${errorMsg}`);
      status(`Server ${urlIndex + 1} failed after retries (${errorMsg}). Trying next...`);
      console.debug(`[Overpass] Pass 2: URL ${urlIndex + 1} failed even after retries (${errorMsg})`);
    }
  }

  // All passes exhausted
  console.error("[Overpass] All passes exhausted. Pass 1 errors:", pass1Errors, "Pass 2 errors:", pass2Errors);
  throw new Error(
    `All Overpass API servers are unavailable. Tried: ${
      OVERPASS_API_CONFIG.URLS.length + (usingFallback ? 1 : 0)
    } server(s).`
  );
}

/**
 * The outline of a point that is drawn rather than dropped: the playground's
 * fence, the car park's edge, the path of a beach.
 *
 * Both lists are given because one element can hold both. A multipolygon whose
 * parts do not all close — which happens, contributors leave gaps — is worth
 * drawing as the lines it does have rather than not at all.
 */
export type OverpassShape = {
  /** Closed rings in Leaflet [lat, lng], outer ring first and its holes after */
  polygons: [number, number][][][];
  /** Open ways in Leaflet [lat, lng] */
  lines: [number, number][][];
};

const toLatLngs = (points: OverpassGeomPoint[]): [number, number][] =>
  points.map(({ lat, lon }) => [lat, lon]);

/** Two points of a way are the same node when they are at the same place */
const samePoint = (a: [number, number], b: [number, number]) =>
  a[0] === b[0] && a[1] === b[1];

const isClosed = (ring: [number, number][]) =>
  ring.length > 3 && samePoint(ring[0], ring[ring.length - 1]);

/**
 * Join ways end to end into the longest chains they make.
 *
 * A multipolygon relation does not hand over rings, it hands over the ways its
 * contributors happened to split the outline into, in no particular order and
 * in either direction. Drawing them as they come gives a polygon whose edges
 * cross, so they are stitched back together first: take a way, keep appending
 * whatever still touches either end, and stop when the chain closes or nothing
 * fits.
 */
const stitchWays = (ways: [number, number][][]): [number, number][][] => {
  const remaining = ways.filter(way => way.length > 1);
  const chains: [number, number][][] = [];

  while (remaining.length > 0) {
    let chain = remaining.pop() as [number, number][];

    let joined = true;
    while (joined && !isClosed(chain)) {
      joined = false;
      for (let i = 0; i < remaining.length; i++) {
        const way = remaining[i];
        const head = chain[0];
        const tail = chain[chain.length - 1];
        // The shared node belongs to both ways, so one copy of it is dropped
        if (samePoint(tail, way[0])) chain = chain.concat(way.slice(1));
        else if (samePoint(tail, way[way.length - 1]))
          chain = chain.concat([...way].reverse().slice(1));
        else if (samePoint(head, way[way.length - 1]))
          chain = way.slice(0, -1).concat(chain);
        else if (samePoint(head, way[0]))
          chain = [...way].reverse().slice(0, -1).concat(chain);
        else continue;

        remaining.splice(i, 1);
        joined = true;
        break;
      }
    }

    chains.push(chain);
  }

  return chains;
};

/** Whether a point lies inside a ring, by the usual ray crossing count */
const ringContains = (ring: [number, number][], [lat, lng]: [number, number]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i];
    const [latJ, lngJ] = ring[j];
    if (
      latI > lat !== latJ > lat &&
      lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI
    ) {
      inside = !inside;
    }
  }
  return inside;
};

/**
 * The rings of a relation, sorted into polygons with their holes.
 *
 * The roles the relation gives its members are followed where they are there,
 * and a courtyard is put into whichever outer ring it sits in rather than into
 * the first one, because a relation can carry several separate areas — a car
 * park in two halves either side of a road — and a hole belongs to one of them.
 */
const assemblePolygons = (
  outerRings: [number, number][][],
  innerRings: [number, number][][]
): [number, number][][][] => {
  const polygons = outerRings.map(ring => [ring]);
  for (const hole of innerRings) {
    const owner =
      polygons.find(([outer]) => ringContains(outer, hole[0])) ?? polygons[0];
    owner?.push(hole);
  }
  return polygons;
};

const shapeFromElements = (elements: OverpassElement[]): OverpassShape | null => {
  const polygonRings: { outer: [number, number][][]; inner: [number, number][][] } = {
    outer: [],
    inner: [],
  };
  const lines: [number, number][][] = [];

  for (const el of elements) {
    if (el.type === "way" && el.geometry) {
      const points = toLatLngs(el.geometry);
      // A closed way is an area unless it says otherwise. Everything this app
      // maps that is drawn closed — a playground, a car park, a building — is
      // one, and `area=no` is how the rare loop that is not says so
      if (isClosed(points) && el.tags?.area !== "no") polygonRings.outer.push(points);
      else if (points.length > 1) lines.push(points);
      continue;
    }

    if (el.type === "relation" && el.members) {
      const memberWays = el.members.filter(
        member => member.type === "way" && member.geometry && member.geometry.length > 1
      );
      const byRole = (role: string) =>
        stitchWays(
          memberWays
            .filter(member => (member.role || "outer") === role)
            .map(member => toLatLngs(member.geometry as OverpassGeomPoint[]))
        );

      for (const chain of byRole("outer")) {
        if (isClosed(chain)) polygonRings.outer.push(chain);
        else lines.push(chain);
      }
      for (const chain of byRole("inner")) {
        if (isClosed(chain)) polygonRings.inner.push(chain);
        else lines.push(chain);
      }
    }
  }

  if (polygonRings.outer.length === 0 && lines.length === 0) return null;
  return {
    polygons: assemblePolygons(polygonRings.outer, polygonRings.inner),
    lines,
  };
};

/**
 * The outline of one way or relation, asked for by id.
 *
 * Fetched a point at a time, when its popup opens, rather than with the search
 * that put it on the map: geometry is by far the bulk of an Overpass answer,
 * and a query for a screenful of car parks that carried every corner of every
 * one of them would cost the reader a slower map for outlines they will never
 * look at.
 */
export async function fetchOverpassShape(
  type: "way" | "relation",
  id: number | string
): Promise<OverpassShape | null> {
  const statement = type === "way" ? "way" : "rel";
  const elements = await runOverpassQuery(
    `[out:json];${statement}(id:${id});out geom;`
  );
  return shapeFromElements(elements);
}

export async function fetchOverpassMarkers(
  center: [number, number] | null,
  radius: number,
  categories: CATEGORIES[],
  bbox: [number, number, number, number],
  polygon?: Feature<Polygon> | null,
  onStatusChange?: (status: string) => void
): Promise<OverpassMarkerData[]> {
  const filters = categories.flatMap(cat => CATEGORY_CONFIG[cat].filters || []);

  const body = polygon
    ? buildOverpassQueryForPolygon(polygon, filters)
    : buildOverpassQueryForSingleLocation(center, radius, filters, bbox);

  const elements = await runOverpassQuery(body, onStatusChange);

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
