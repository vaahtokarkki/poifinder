import { getCoords } from "@turf/turf";
import { point } from "@turf/helpers";
import type { Feature, Polygon, Point} from "geojson";
import {
  CATEGORIES,
  CATEGORY_CONFIG,
  OVERPASS_API_CONFIG,
  OVERPASS_QUERY_PROLOGUE,
  PRIMARY_TAG_KEYS,
  SELF_HOSTED_OVERPASS_URL,
  filterMatchesPrimaryTag,
  matchesFilter,
} from "../constants";
import { fetchWithRetry } from "../utils/retryFetch";
import { describeAddress } from "../poiPopup";

export type OverpassMarkerData = {
  id: number | string;
  geom: Feature<Point>;
  position?: [number, number]; // Leaflet expects position as [lng, lat]
  name?: string;
  tags?: Record<string, string>;
  type?: string;
  /**
   * The corners of a way or relation as [south, west, north, east], which is
   * the same order the app's own bounding boxes are written in.
   *
   * Absent from a node, which is its own extent, and from anything cached
   * before the query started asking for it. Its one reader is the duplicate
   * check below, which needs to know how big an outline is as well as where
   * its middle is
   */
  bounds?: [number, number, number, number];
  /**
   * When the object was last edited, as OpenStreetMap's own ISO timestamp.
   * Absent from anything cached before the query started asking for it, and
   * from any server whose database was imported without metadata, so the popup
   * treats it as optional rather than assuming it
   */
  timestamp?: string;
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

  /**
   * `meta` is what carries the last edit date, which the popup shows under the
   * survey date. It is not free on the server side: a database imported without
   * metadata answers `out meta` with **no elements at all**, rather than with
   * the objects minus their timestamps. So a self hosted instance has to be
   * imported with OVERPASS_META=yes — see apps/overpass/README.md — before this
   * query reaches it, or it goes silently empty while the public mirrors carry
   * on working.
   */
  return `
    ${OVERPASS_QUERY_PROLOGUE};
    (
      ${filterBlocks}
    );
    out meta bb;
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
  /** A way or relation's corners, written by `out bb` */
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
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
  /** Written by `out meta`, and only by a server that imported metadata */
  timestamp?: string;
};

/**
 * Which mirror a query has got to, when it has had to go looking.
 *
 * Reported rather than described, because the words belong to the reader's
 * language and this file has none: what it knows is a position in a list, and
 * the indicator turns that into "2/4". Reported only once something has
 * already failed — see `report` below — so the normal case says nothing and
 * the counter appearing means what it looks like.
 */
export type OverpassProgress = {
  /** Which public mirror is being tried, counting from one */
  server: number;
  /** How many there are altogether */
  total: number;
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
  onProgress?: (progress: OverpassProgress) => void
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
    maxRetries: number,
    timeoutMs: number
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
        timeoutMs,
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
   * Only read by the error at the end, to count the servers actually tried
   */
  let usingFallback = false;

  /**
   * True once any server has failed to answer, which is the whole condition on
   * saying anything at all: the first request of a search succeeding is how
   * this normally goes, and a counter that read 1/4 every time would be
   * reporting the weather rather than a problem.
   */
  let anyFailed = false;

  /** Tell the indicator which mirror is being tried, once that is news */
  const report = (server: number) => {
    if (anyFailed) onProgress?.({ server, total: OVERPASS_API_CONFIG.URLS.length });
  };

  // A self hosted instance is asked once, with no retries and no backoff:
  // there is no shared rate limit to be polite about, and a slow retry loop
  // against our own server helps nobody. Nothing is said in the loading
  // indicator for it either. The normal case is one fast request, and a
  // counter that appears and disappears is noise rather than information.
  //
  // Should it fail, the public mirrors are still there, and using them beats
  // showing an empty map because one machine is rebooting.
  if (SELF_HOSTED_OVERPASS_URL) {
    console.debug(`[Overpass] Using self hosted instance: ${SELF_HOSTED_OVERPASS_URL}`);
    try {
      return await tryFetchFromURL(
        SELF_HOSTED_OVERPASS_URL,
        0,
        OVERPASS_API_CONFIG.TIMEOUT.patientMs
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[Overpass] Self hosted instance failed (${errorMsg}), falling back to the public mirrors`
      );
      usingFallback = true;
      anyFailed = true;
    }
  }

  // Pass 1: Try each URL once (no retries, fast failover)
  console.debug("[Overpass] Starting pass 1: trying each URL once (quick failover)");
  const pass1Errors: string[] = [];
  for (let urlIndex = 0; urlIndex < OVERPASS_API_CONFIG.URLS.length; urlIndex++) {
    const url = OVERPASS_API_CONFIG.URLS[urlIndex];
    try {
      report(urlIndex + 1);
      console.debug(`[Overpass] Pass 1: Trying URL ${urlIndex + 1}/${OVERPASS_API_CONFIG.URLS.length}: ${url}`);

      // No retries and a short timeout: this pass is looking for a host that
      // answers, not waiting for one that is thinking
      const result = await tryFetchFromURL(url, 0, OVERPASS_API_CONFIG.TIMEOUT.quickMs);
      console.debug(`[Overpass] Pass 1: Successfully fetched from URL ${urlIndex + 1}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      pass1Errors.push(`${url}: ${errorMsg}`);
      anyFailed = true;
      console.debug(`[Overpass] Pass 1: URL ${urlIndex + 1} failed (${errorMsg}), trying next...`);
    }
  }

  // Pass 2: All URLs failed in pass 1, now retry with exponential backoff
  console.debug("[Overpass] Pass 1 failed, starting pass 2: retrying all URLs with exponential backoff");
  const pass2Errors: string[] = [];
  for (let urlIndex = 0; urlIndex < OVERPASS_API_CONFIG.URLS.length; urlIndex++) {
    const url = OVERPASS_API_CONFIG.URLS[urlIndex];
    try {
      report(urlIndex + 1);
      console.debug(`[Overpass] Pass 2: Retrying URL ${urlIndex + 1}/${OVERPASS_API_CONFIG.URLS.length}: ${url}`);

      // Every mirror has already failed once, so the visitor is waiting either
      // way. Wait properly rather than time out on a query that is running
      const result = await tryFetchFromURL(
        url,
        OVERPASS_API_CONFIG.RETRY.maxRetries,
        OVERPASS_API_CONFIG.TIMEOUT.patientMs
      );
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
 * One way or relation, named the way the rest of the app names them:
 * `way/1234`, `relation/5678`. The same string is the cache key and the React
 * key, so there is one spelling to get right.
 */
export type OsmRef = `${"way" | "relation"}/${string}`;

/** One way or relation asked for by id: what it is drawn as, and what it says */
export type OverpassElementDetails = {
  shape: OverpassShape | null;
  tags: Record<string, string>;
};

/**
 * One way or relation, asked for by id.
 *
 * Fetched a point at a time, when its popup opens, rather than with the search
 * that put it on the map: geometry is by far the bulk of an Overpass answer,
 * and a query for a screenful of car parks that carried every corner of every
 * one of them would cost the reader a slower map for outlines they will never
 * look at.
 *
 * The tags come back with the geometry because they cost nothing extra — the
 * answer to `out geom` carries them either way — and because the two callers
 * want one each: the outline on the map, and the popup's account of the
 * building a point stands in.
 */
export async function fetchOverpassElement(
  type: "way" | "relation",
  id: number | string
): Promise<OverpassElementDetails> {
  const statement = type === "way" ? "way" : "rel";
  const elements = await runOverpassQuery(
    `${OVERPASS_QUERY_PROLOGUE};${statement}(id:${id});out geom;`
  );
  const self = elements.find(
    element => element.type === type && String(element.id) === String(id)
  );
  return { shape: shapeFromElements(elements), tags: self?.tags ?? {} };
}

/* ---------- The building a point is standing in ---------- */

/**
 * How the app finds out which building a point is inside.
 *
 * There is no link in OpenStreetMap between a toilet and the shopping centre
 * around it — they are two objects that happen to overlap — and no Overpass
 * query asks the question directly either. `is_in` would, but it needs areas,
 * which are a permanent background job our own instance deliberately does not
 * run. So the app asks for the buildings *near* the point and works out which
 * one contains it here, with the same ray casting the outlines already use.
 *
 * The radius is what makes that honest, and it is measured rather than picked.
 * Across every point Bremen's import joins to a building, the median sits 3.4 m
 * from its building's nearest wall, the 99th percentile 36 m and the deepest
 * 93 m; `around:` measures to a way's walls rather than to its corners, so 150
 * covers all of them with room over. Something enormous — an airport concourse
 * — could still have a middle further from any wall than this, and would come
 * back with no building rather than with the wrong one.
 *
 * What it costs is one query when a popup opens, which is the same bargain the
 * outlines already make. Against our own instance, which holds only the
 * buildings that contain something, that is 6 to 26 KB. Against a public mirror
 * holding every building in the city it is about 40 KB, and still the right
 * answer: the containment test does not care how many candidates it is given.
 */
const ENCLOSING_BUILDING = {
  /** Metres. See above: 150 covers every joined point measured on Bremen */
  RADIUS: 150,
  /**
   * `building=no` is a mapper saying "the thing you would take for a building
   * here is not one". The import applies the same rule when it decides which
   * buildings to keep — see NOT_A_BUILDING in apps/overpass/bin/join-buildings
   * — so that our server and the public mirrors answer alike
   */
  NOT_A_BUILDING: new Set(["no"]),
  /**
   * Values of `building` for a structure that is a roof and no walls. Standing
   * under one is not the same as standing in a building, so where a walled
   * building contains the point as well, that one is the answer. On its own a
   * roof is still worth naming: a fuel canopy is what a pump stands under, and
   * 2950 of the 14226 buildings our Finland import keeps are roofs like it
   */
  ROOF_ONLY: new Set(["roof", "canopy", "carport", "shelter", "tent"]),
  /**
   * Tags that give the popup something to put in front of a person. Anything
   * here, or an address, and the building can say where somebody is; without
   * them the section is the words "In this building" and nothing else.
   *
   * Not the full list of tags the popup would render — that is
   * isDisplayableTag over in PoiMarkers, which is about a point and lives with
   * the component that draws it. These are the ones that answer "which place
   * is this", which is the only question the enclosing building is asked
   */
  SAYS_SOMETHING: [
    "name",
    "operator",
    "brand",
    "opening_hours",
    "website",
    "phone",
    "wheelchair",
  ],
} as const;

/**
 * The number a tag carries, from the first of these keys that has one.
 *
 * OpenStreetMap's numbers are typed by people: `min_height=3.7` but also
 * `3,7` off a European keyboard, and `level=2;3;4` for a lift that stops at
 * three of them. parseFloat takes the front of any of those and returns NaN
 * for `min_height=roof`, which is a real thing somebody has written.
 */
const tagNumber = (tags: Record<string, string>, ...keys: string[]) => {
  for (const key of keys) {
    const value = parseFloat(String(tags[key] ?? "").replace(",", "."));
    if (!Number.isNaN(value)) return value;
  }
  return null;
};

/**
 * Whether an outline hangs above the ground instead of sitting on it.
 *
 * This is how Simple 3D Buildings says a piece of a building starts partway
 * up, and it is the one thing that reliably separates a roof from the thing
 * under it: the glass pyramid over Koskikeskus's atrium is `min_height=12`,
 * the flats over Länsituuli's shops are `building:min_level=4`. Both are
 * drawn small and inside something large, so smallest-wins on its own hands a
 * post box on the mall floor a nameless roof twelve metres over its head.
 *
 * A demotion rather than a rejection, because a floating outline is often the
 * only one there is and then it is the right answer: a fuel canopy at
 * min_height 3.7, the restaurant 63 m up Puijon torni. Measured on Finland, 31
 * of the 8345 points that join to a building join to one that floats, and 11
 * of those have a grounded building around them to fall back to.
 */
const floatsAboveGround = (tags: Record<string, string>) =>
  (tagNumber(tags, "building:min_level", "min_level") ?? 0) > 0 ||
  (tagNumber(tags, "min_height", "building:min_height") ?? 0) > 0;

/**
 * Whether a building has anything to tell somebody who is standing in it.
 *
 * Smallest-wins reads specificity off the geometry, and for the outlines a 3D
 * mapper draws the two point opposite ways: a shopping centre gets split into
 * unnamed pieces, and the piece is always smaller than the centre. Kauppakeskus
 * Willa, Pasilan rautatieasema, Länsikeskus and Helsinki-Vantaa's terminal all
 * lose their points to a nameless sub-outline that renders as "In this
 * building" with no rows under it — a section that cost a query and says
 * nothing, when the name was in the same answer all along.
 *
 * Below the ground and roof tiers rather than above them, because being in the
 * right place beats being able to name it, and above area because a name is
 * what the section is for.
 *
 * Four more points that this should reach it does not, and the reason is
 * upstream of the ranking: Sokos Tampere and FinnPark P-Hämeenpuisto are
 * `type=building` relations, whose members are an `outline` and its `part`s
 * rather than the `outer` and `inner` shapeFromElements reads. They come back
 * from Overpass with no shape at all, so they are never candidates here.
 */
const saysSomething = (tags: Record<string, string>) =>
  ENCLOSING_BUILDING.SAYS_SOMETHING.some(key => tags[key]?.trim()) ||
  describeAddress(tags) !== null;

/**
 * How good an answer a building is before its size is considered. Lower wins,
 * and size settles everything this leaves level.
 *
 * The weights make one number out of three tests read in order, so that no
 * count of weaker failings adds up to a stronger one: a floating outline is
 * behind every grounded one whatever else it has, and a nameless building is
 * only ever behind a named one that is otherwise its equal.
 */
const buildingRank = (tags: Record<string, string>) =>
  (floatsAboveGround(tags) ? 4 : 0) +
  (ENCLOSING_BUILDING.ROOF_ONLY.has(tags.building) ? 2 : 0) +
  (saysSomething(tags) ? 0 : 1);

/** The building a point stands in: which object it is, and what it says */
export type EnclosingBuilding = OverpassElementDetails & {
  ref: OsmRef;
  /**
   * When the building itself was last edited, which is its own date and not the
   * point's: a toilet node touched last week can stand in a building nobody has
   * looked at since 2012, and the popup shows both rather than letting the
   * fresher of the two vouch for the other.
   *
   * Written by `out meta`, so absent from a server whose database was imported
   * without metadata — the same bargain the marker query already makes.
   */
  timestamp?: string;
};

/** Whether a point is inside a shape: in one of its rings and in none of its holes */
export const shapeContains = (shape: OverpassShape, point: [number, number]) =>
  shape.polygons.some(
    ([outer, ...holes]) =>
      ringContains(outer, point) && !holes.some(hole => ringContains(hole, point))
  );

/**
 * The area a shape covers, in square degrees.
 *
 * Not an area anybody would quote, and it does not have to be: it is only ever
 * used to compare two buildings that both contain the same point, and no
 * conversion would change which of them is smaller.
 */
const shapeArea = (shape: OverpassShape) =>
  shape.polygons.reduce((total, [outer]) => {
    let doubled = 0;
    for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
      doubled += outer[j][0] * outer[i][1] - outer[i][0] * outer[j][1];
    }
    return total + Math.abs(doubled) / 2;
  }, 0);

/**
 * The building a point is standing in, or null if it is standing outside.
 *
 * Where several contain the point: the one that reaches the ground wins, then
 * the one with walls, then the one with a name, and size settles what is left.
 *
 * Size was the whole rule once, on the grounds that the smaller of two true
 * answers is the more specific — a shop unit inside a shopping centre, a hall
 * inside a terminal. It is a fair proxy and it is almost never asked: 8297 of
 * the 8345 points Finland joins have exactly one candidate. On the 48 that
 * have more it was wrong 28 times, because the small outline in a big building
 * is usually not a shop unit but a roof over the atrium or a nameless piece of
 * the same building drawn for 3D. The tiers above it are those two failures,
 * and area is kept underneath them as what settles genuine equals — and as
 * something that settles them the same way every time, rather than leaving the
 * answer to the order Overpass happened to return.
 *
 * Our own import ranks candidates the same way when it decides which buildings
 * to keep, so the answer does not depend on which server answered.
 */
export async function fetchEnclosingBuilding(
  [lat, lng]: [number, number]
): Promise<EnclosingBuilding | null> {
  const elements = await runOverpassQuery(
    // `meta` for the building's own last edit date, on the same terms as the
    // marker query: a self hosted instance imported without metadata answers
    // `out meta` with nothing at all rather than with the objects minus their
    // timestamps. See buildBaseOverpassQuery
    `${OVERPASS_QUERY_PROLOGUE};wr[building](around:${ENCLOSING_BUILDING.RADIUS},${lat},${lng});out meta geom;`
  );

  let best: { building: EnclosingBuilding; rank: number; area: number } | null = null;
  for (const element of elements) {
    const tags = element.tags ?? {};
    const building = tags.building;
    if (!building || ENCLOSING_BUILDING.NOT_A_BUILDING.has(building)) continue;

    // One element at a time, because these are candidates rather than parts of
    // one thing: shapeFromElements folds everything it is given into a single
    // shape, which is right for the ways of one relation and wrong for a
    // street's worth of separate buildings
    const shape = shapeFromElements([element]);
    if (!shape || !shapeContains(shape, [lat, lng])) continue;

    const rank = buildingRank(tags);
    const area = shapeArea(shape);
    if (best === null || rank < best.rank || (rank === best.rank && area < best.area)) {
      best = {
        rank,
        area,
        building: {
          ref: `${element.type as "way" | "relation"}/${element.id}`,
          shape,
          tags,
          timestamp: element.timestamp,
        },
      };
    }
  }

  return best?.building ?? null;
}

/* ---------- The doors into a building ---------- */

/**
 * Which doors are worth drawing, and on which buildings.
 *
 * The question this answers is one question — where do I get into this
 * shopping centre — and everything here is that question narrowing. A mall has
 * eleven doors in OpenStreetMap and two of them are the ones a person walks
 * to; the other nine are a loading bay, a fire exit and the stairs up to the
 * flats above. Drawing all eleven is the same as drawing none.
 *
 * Measured on the Finland extract, over the 4025 entrance nodes that sit on a
 * building our import kept.
 */
const ENTRANCE = {
  /**
   * Values of `entrance` for a door somebody arriving can use. `yes` (1980)
   * and `main` (1028) are most of them; `shop` and `secondary` are the side
   * doors of exactly the retail buildings this is for.
   *
   * Everything left out is left out because walking to it wastes the walk:
   * `staircase` (265) is the stairwell door of a block of flats, `service`
   * (234) and `delivery` are the back of the building, `emergency` (55) opens
   * outwards only, and `garage`, `parking` and `basement` are for cars.
   */
  USABLE: new Set(["main", "yes", "secondary", "shop", "entrance"]),
  /**
   * Values of `access` that say the door is not for the reader. 396 of the
   * 1037 entrances carrying `access` are `private`, which is the tag doing
   * real work here. `customers` and `permissive` stay: this app already treats
   * customers-only as a real answer rather than a closed one
   */
  CLOSED: new Set(["private", "no", "employees", "delivery", "permit"]),
  /**
   * Values of `building` for somewhere people live. A block of flats has its
   * doors mapped as diligently as a mall does — 76 of the 1560 buildings with
   * entrances are `apartments`, and 70 of those 76 have no name — and none of
   * them is a door the reader is looking for. The stairwell filter above
   * catches many of the same nodes; this catches the rest, and saves the query
   */
  RESIDENTIAL: new Set([
    "apartments", "residential", "house", "detached", "semidetached_house",
    "terrace", "terraced_house", "dormitory", "bungalow", "cabin", "hut",
    "houseboat", "static_caravan", "farm", "ger", "trullo",
  ]),
} as const;

/** One door into a building, and where it is */
export type BuildingEntrance = {
  id: number | string;
  position: [number, number];
  /** `entrance=main`: the door the building itself says is the way in */
  main: boolean;
  tags: Record<string, string>;
};

/**
 * Whether this outline is a building whose doors are worth asking about.
 *
 * Asked before the query rather than after it, so that a car park, a
 * playground and a block of flats cost nothing: three quarters of the points
 * that get this far are one of those, and the answer for all of them is a
 * query that comes back empty.
 */
export const takesEntrances = (tags: Record<string, string>): boolean => {
  const building = tags.building;
  return (
    !!building &&
    !ENCLOSING_BUILDING.NOT_A_BUILDING.has(building) &&
    !ENTRANCE.RESIDENTIAL.has(building)
  );
};

/**
 * The doors into the building named, as far as OpenStreetMap knows them.
 *
 * Asked by id rather than by position, which is what makes it worth asking
 * separately from the building itself: two toilets in the same shopping centre
 * are two different positions and one building, so the second one is answered
 * out of the cache. The building lookup cannot do that — it is keyed by where
 * the point is, because that is the only thing it knows before it has an
 * answer.
 *
 * Entrances are nodes of the building's own way, which is how they are mapped
 * and also why they survive our import: the buildings are put back into the
 * extract with the nodes they are drawn from. A door mapped as a loose node
 * inside the building — an underground concourse, mostly — is in the public
 * mirrors and not in ours, and is missing here rather than wrong.
 */
export async function fetchBuildingEntrances(
  ref: OsmRef
): Promise<BuildingEntrance[]> {
  const [type, id] = ref.split("/");
  // A relation's doors belong to its member ways, so it takes the extra step
  // down. Written as two statements rather than as `>`, which the self hosted
  // instance's query guard refuses: recursing down to every member node of
  // anything is how a cheap query is turned into an expensive one
  const statement =
    type === "relation"
      ? `rel(id:${id});way(r);node(w)[entrance];`
      : `way(id:${id});node(w)[entrance];`;
  const elements = await runOverpassQuery(
    `${OVERPASS_QUERY_PROLOGUE};${statement}out;`
  );

  const entrances: BuildingEntrance[] = [];
  for (const element of elements) {
    if (element.type !== "node" || element.lat === undefined || element.lon === undefined)
      continue;
    const tags = element.tags ?? {};
    if (!ENTRANCE.USABLE.has(tags.entrance)) continue;
    if (ENTRANCE.CLOSED.has(tags.access)) continue;
    entrances.push({
      id: element.id,
      position: [element.lat, element.lon],
      main: tags.entrance === "main",
      tags,
    });
  }
  return entrances;
}

/* ---------- The same place mapped twice ---------- */

/**
 * How close to the middle of an outline a node has to sit to be that outline
 * drawn a second time.
 *
 * A public toilet is very often in OpenStreetMap twice over: somebody dropped
 * an `amenity=toilets` node, somebody else drew the hut around it and tagged
 * that too. They are two objects and neither points at the other, so both come
 * back from a search and the map carries two markers a metre apart for one
 * toilet.
 *
 * Told apart from two real neighbours by position, which is all a `bb` answer
 * gives: a node standing for the outline sits near its middle, while the
 * separate thing next door sits off to one side. Both tests below are that
 * same idea at two scales — a share of the box for something large, a plain
 * radius for a hut whose whole box is a few metres across — and either one
 * passing is enough.
 *
 * Measured rather than guessed. Over every toilet and car park in greater
 * Helsinki, with the real outlines fetched to check the answers: 4 of 4 toilet
 * duplicates and 6 of 7 car park ones are caught, against a single wrong
 * removal. The plain bounding box on its own, with no middle to it, was right
 * barely half the time on car parks — a big lot's box reaches over the one
 * beside it.
 */
const DUPLICATE_OF_NODE = {
  /** Metres from the middle of the box, whatever its size */
  RADIUS: 10,
  /** Or, for a box too big for that, the share of it that counts as its middle */
  SHARE: 0.4,
} as const;

/** Close enough for latitude, and for longitude once it is scaled by the parallel */
const METRES_PER_DEGREE = 111320;

/**
 * Whether two objects claim to be the same kind of place.
 *
 * The primary tags and only those: `amenity=toilets` on both is the claim, and
 * a shared `wheelchair=yes` is not. An outline carrying none of them is not
 * making a claim this can test and is left alone
 */
const namesTheSameThing = (
  node: OverpassMarkerData,
  area: OverpassMarkerData
): boolean => {
  const areaTags = Object.entries(area.tags ?? {}).filter(([key]) =>
    PRIMARY_TAG_KEYS.has(key)
  );
  return areaTags.some(([key, value]) => node.tags?.[key] === value);
};

/** Whether a node is the same place as an outline, already mapped by somebody else */
const standsFor = (node: OverpassMarkerData, area: OverpassMarkerData): boolean => {
  if (!area.bounds || !node.position) return false;
  const [south, west, north, east] = area.bounds;
  const [lat, lng] = node.position;
  // The cheap test first: this rejects all but a handful of pairs outright
  if (lat < south || lat > north || lng < west || lng > east) return false;
  if (!namesTheSameThing(node, area)) return false;

  const midLat = (south + north) / 2;
  const midLng = (west + east) / 2;
  if (
    Math.abs(lat - midLat) <= ((north - south) / 2) * DUPLICATE_OF_NODE.SHARE &&
    Math.abs(lng - midLng) <= ((east - west) / 2) * DUPLICATE_OF_NODE.SHARE
  ) {
    return true;
  }

  const northing = (lat - midLat) * METRES_PER_DEGREE;
  const easting =
    (lng - midLng) * METRES_PER_DEGREE * Math.cos((midLat * Math.PI) / 180);
  return Math.hypot(northing, easting) <= DUPLICATE_OF_NODE.RADIUS;
};

/**
 * Drop the outlines that a node on the map already stands for.
 *
 * The node is what is kept, not the outline, and deliberately so even though
 * the outline is sometimes the better tagged of the two: the node is the
 * object somebody put there to be found, its popup can still name the building
 * around it, and keeping whichever happens to carry more tags would mean the
 * same toilet moving between two positions from one search to the next.
 */
const dropDuplicateOutlines = (
  markers: OverpassMarkerData[]
): OverpassMarkerData[] => {
  const nodes = markers.filter(marker => marker.type === "node" && marker.position);
  if (nodes.length === 0) return markers;
  return markers.filter(
    marker =>
      marker.type === "node" || !nodes.some(node => standsFor(node, marker))
  );
};

/* ---------- The building that only says it has one ---------- */

/**
 * What put a marker on the map for one category: being the thing asked for, or
 * only saying it has one.
 *
 * The split is the one {@link filterMatchesPrimaryTag} already draws, and it
 * is drawn on the filter rather than on the object: `[amenity=toilets]` names
 * the place itself, while the Toilets category's second filter —
 * `[building~"…"][toilets=yes]` — names a shopping centre with a toilet
 * somewhere inside it. Several categories carry a filter of that second kind:
 * `[atm=yes]` on a bank, `[cuisine=ice_cream]` on a café, `[fireplace=yes]` on
 * a shelter. All of them say the same thing, which is where to go looking.
 */
const matchKind = (
  tags: Record<string, string> | undefined,
  category: CATEGORIES
): "itself" | "stands-in" | null => {
  let standsIn = false;
  for (const filter of CATEGORY_CONFIG[category].filters) {
    if (!matchesFilter(tags, filter)) continue;
    // Any filter naming the place itself settles it, whatever else matched
    if (filterMatchesPrimaryTag(filter)) return "itself";
    standsIn = true;
  }
  return standsIn ? "stands-in" : null;
};

/**
 * Drop an outline that is only standing in for points already on the map
 * inside it.
 *
 * Kampin keskus is `building=retail` with `toilets=yes`, and three toilets are
 * mapped inside it as nodes of their own. All four come back from a search for
 * toilets, and the fourth is a marker over the whole shopping centre saying
 * "there is a toilet in here" next to three that say where. That is worse than
 * redundant: it is the least specific answer on the map drawn at the size of
 * the building, and tapping it opens a popup about a shopping centre.
 *
 * The stand-in earns its place when nothing inside it is mapped, which is the
 * usual case and why the filter exists — a centre that says it has a toilet is
 * the only lead there is. So this is a question about what else came back
 * rather than about the building, and it is asked per category: a mall with a
 * toilet point inside it is still the only lead to its cash machine.
 *
 * Only outlines, never nodes. A node standing in for something — a bank node
 * tagged `atm=yes` — has no extent for anything to be inside of, and a search
 * that finds a real cash machine ten metres away has not established that it
 * is the same one.
 */
const dropStandInAreas = (
  markers: OverpassMarkerData[],
  categories: CATEGORIES[]
): OverpassMarkerData[] => {
  const standIns: { marker: OverpassMarkerData; forCategories: CATEGORIES[] }[] = [];

  for (const marker of markers) {
    if (!marker.bounds) continue;
    const forCategories: CATEGORIES[] = [];
    let isSomethingItself = false;
    for (const category of categories) {
      const kind = matchKind(marker.tags, category);
      // Something that is one of the things asked for stays, whatever else it
      // also merely has: a library with a toilet in it is still a library
      if (kind === "itself") {
        isSomethingItself = true;
        break;
      }
      if (kind === "stands-in") forCategories.push(category);
    }
    if (!isSomethingItself && forCategories.length > 0) {
      standIns.push({ marker, forCategories });
    }
  }

  if (standIns.length === 0) return markers;

  const dropped = new Set<OverpassMarkerData>();
  for (const { marker, forCategories } of standIns) {
    const [south, west, north, east] = marker.bounds as [number, number, number, number];
    const answered = markers.some(other => {
      if (other === marker || !other.position) return false;
      const [lat, lng] = other.position;
      if (lat < south || lat > north || lng < west || lng > east) return false;
      return forCategories.some(category => matchKind(other.tags, category) === "itself");
    });
    if (answered) dropped.add(marker);
  }

  return dropped.size === 0 ? markers : markers.filter(marker => !dropped.has(marker));
};

export async function fetchOverpassMarkers(
  center: [number, number] | null,
  radius: number,
  categories: CATEGORIES[],
  bbox: [number, number, number, number],
  polygon?: Feature<Polygon> | null,
  onProgress?: (progress: OverpassProgress) => void
): Promise<OverpassMarkerData[]> {
  const filters = categories.flatMap(cat => CATEGORY_CONFIG[cat].filters || []);

  const body = polygon
    ? buildOverpassQueryForPolygon(polygon, filters)
    : buildOverpassQueryForSingleLocation(center, radius, filters, bbox);

  const elements = await runOverpassQuery(body, onProgress);

  const markers = elements
    .map((el: OverpassElement) => {
      if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
        return {
          id: el.id,
          position: [el.lat, el.lon] as [number, number],
          geom: point([el.lon, el.lat]),
          name: el.tags?.name,
          tags: el.tags,
          type: el.type,
          timestamp: el.timestamp,
        };
      }
      if (el.type !== "node") {
        /**
         * `out bb` gives the corners rather than the middle, and the middle is
         * what a marker is dropped at — which is what `out center` used to
         * give, and is the same point either way: Overpass takes its centre
         * from the bounding box too. The corners are the extra, and the
         * duplicate check above is what wanted them
         */
        const bounds = el.bounds;
        const position: [number, number] | null = el.center
          ? [el.center.lat, el.center.lon]
          : bounds
            ? [(bounds.minlat + bounds.maxlat) / 2, (bounds.minlon + bounds.maxlon) / 2]
            : null;
        if (!position) return null;
        return {
          id: el.id,
          position,
          geom: point([position[1], position[0]]),
          name: el.tags?.name,
          tags: el.tags,
          type: el.type,
          bounds: bounds && ([
            bounds.minlat,
            bounds.minlon,
            bounds.maxlat,
            bounds.maxlon,
          ] as [number, number, number, number]),
          timestamp: el.timestamp,
        };
      }
      return null;
    })
    .filter(Boolean) as OverpassMarkerData[];

  return dropStandInAreas(dropDuplicateOutlines(markers), categories);
}
