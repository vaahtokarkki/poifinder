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
  name: string;
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
  /** The named subset, which is what a list can usefully show */
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

/** The map root: the index of every city that has pages */
export type HomePageData = {
  kind: "home";
  citySlugs: string[];
};

export type PageData = CategoryPageData | CityPageData | HomePageData;

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
