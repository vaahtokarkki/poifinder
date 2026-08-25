import { getCoords } from "@turf/turf";
import { point } from "@turf/helpers";
import type { Feature, Polygon, Point} from "geojson";
import {
  CATEGORIES,
  CATEGORY_CONFIG,
  OVERPASS_API_CONFIG,
  OVERPASS_QUERY_PROLOGUE,
  SELF_HOSTED_OVERPASS_URL,
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
    out meta center;
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
  /** Written by `out meta`, and only by a server that imported metadata */
  timestamp?: string;
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

      // No retries and a short timeout: this pass is looking for a host that
      // answers, not waiting for one that is thinking
      const result = await tryFetchFromURL(url, 0, OVERPASS_API_CONFIG.TIMEOUT.quickMs);
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
const shapeContains = (shape: OverpassShape, point: [number, number]) =>
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
          timestamp: el.timestamp,
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
          timestamp: el.timestamp,
        };
      }
      return null;
    })
    .filter(Boolean) as OverpassMarkerData[];
}
