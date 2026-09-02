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
   * A row carries a name, a context, a street or some combination. One with
   * none of them is not stored: it is a row that reads "Public toilet" and
   * says nothing. See poiTitle in pageMeta.ts for how they are put together
   */
  context?: string;
  /**
   * The name of the street the point stands on, for the street furniture no
   * building or park contains: the road a post box or a bus shelter is beside.
   * Worked out at fetch time as the nearest named highway within 30 m.
   *
   * Only ever set where `context` is not — containment is the better answer
   * where there is one — so the two never compete for the same row. See
   * `placedByStreet` in categories.ts
   */
  street?: string;
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
  /**
   * Whether this category has a country hub in this locale, so the page can
   * link up to it.
   *
   * A flag rather than the page working it out, for the same reason
   * `siblingCategories` is a list: only the build knows which hubs cleared the
   * three-city threshold, and a link that guesses is a link that 404s.
   */
  hasCountryHub?: boolean;
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

/**
 * A country hub: one category across every city in one country that has a page
 * for it.
 *
 * The answer to a query with no town in it — "vessat kartalla", "drinkwater\u00ADkaart
 * nederland". It carries the cities rather than the points: the points are on
 * the city pages this one links to, and a country's worth of them is not a
 * list anybody reads.
 */
export type CountryPageData = {
  kind: "country";
  countryCode: string;
  /** The English name, which is also what the slug is derived from */
  country: string;
  categorySlug: string;
  /** Cities with a page for this category, most points first */
  entries: { citySlug: string; count: number }[];
  /** Points across all of them, which is the number the title claims */
  total: number;
  updatedAt: string;
};

export type PageData =
  | CategoryPageData
  | CityPageData
  | HomePageData
  | CitiesPageData
  | CountryPageData;

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
