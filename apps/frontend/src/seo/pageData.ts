/**
 * The build time payload of a prerendered page.
 *
 * The prerender writes it into the HTML as a JSON script tag and the app reads
 * it back on mount. Both sides then render the same component from the same
 * data, which is what keeps the static HTML honest: everything a crawler sees
 * in the prerendered markup is also what a visitor sees in the sheet.
 */
export const PAGE_DATA_ELEMENT_ID = "__wayside_page__";

export type PoiEntry = {
  id: string;
  /**
   * The name OpenStreetMap carries for the point itself. Absent on the points
   * that have none, which for most of these categories is the great majority
   * of them — those rows are identified by `context` instead
   */
  name?: string;
  /**
   * The name of the place the point stands inside: the building around a
   * toilet, the park around a picnic table. Worked out at fetch time by
   * testing the point against the outlines of the named places near it, never
   * written onto the point in OpenStreetMap and never presented as its name.
   *
   * A row carries a name, a context, or both. One with neither is not stored:
   * it is a row that reads "Public toilet" and says nothing. See poiTitle in
   * pageMeta.ts for how the two are put together
   */
  context?: string;
  lat: number;
  lon: number;
  /** Street address, when OpenStreetMap has the housenumber and street */
  address?: string;
  openingHours?: string;
  /** "yes" | "no" | "limited", straight from the OSM tag */
  wheelchair?: string;
  /** "yes" | "no", straight from the OSM tag */
  fee?: string;
};

/** A city and category page: one category, listed and mapped */
export type CategoryPageData = {
  kind: "category";
  citySlug: string;
  categorySlug: string;
  /** Every matching point in the city radius, named or not */
  count: number;
  /**
   * The subset a list can usefully show: the points that carry a name, plus
   * the ones a named building or park can place. One row per distinct
   * identity — see the dedup in fetch-poi-data.mjs, which is what stops a park
   * with nine picnic tables in it from filling the page nine times over
   */
  pois: PoiEntry[];
  /**
   * Which neighbouring pages exist. Internal links are only worth anything if
   * they resolve, and only the build knows which routes cleared the threshold,
   * so the answer travels with the page rather than being guessed at runtime
   */
  siblingCategories: string[];
  nearbyCities: string[];
  /** ISO date of the OpenStreetMap extract this page was built from */
  updatedAt: string;
};

/** A city hub: every category that has enough points in that city */
export type CityPageData = {
  kind: "city";
  citySlug: string;
  entries: { categorySlug: string; count: number }[];
  nearbyCities: string[];
  updatedAt: string;
};

/**
 * The map root. It carries a count rather than the list itself: the index is a
 * page of its own now, and the root's one job in the link graph is to point at
 * it. See CitiesPageData
 */
export type HomePageData = {
  kind: "home";
  cityCount: number;
};

/** /cities: the index of every city that has pages, grouped by country */
export type CitiesPageData = {
  kind: "cities";
  citySlugs: string[];
};

export type PageData = CategoryPageData | CityPageData | HomePageData | CitiesPageData;

/**
 * The payload of the page currently loaded, or null on a route that was not
 * prerendered (a shared link with coordinates, an unknown city).
 */
export function readPageData(): PageData | null {
  if (typeof document === "undefined") return null;
  const element = document.getElementById(PAGE_DATA_ELEMENT_ID);
  if (!element?.textContent) return null;
  try {
    const parsed = JSON.parse(element.textContent) as PageData;
    return parsed && typeof parsed.kind === "string" ? parsed : null;
  } catch {
    // A malformed payload must not take the app down with it
    return null;
  }
}
