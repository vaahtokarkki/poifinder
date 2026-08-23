/**
 * Matomo, wired for a site that shows no cookie banner.
 *
 * The whole reason this file is not just the snippet off Matomo's install page
 * is the two lines in {@link start}: cookies off, Do Not Track honoured. Those,
 * plus IP masking and a short retention on the server (see apps/overpass/
 * docker-compose.prod.yml and the Matomo setup notes in its README), are what
 * keep audience measurement inside the exemption that lets it run without
 * asking. Take `disableCookies` out and the site needs a consent banner before
 * the first pageview, so it is pushed before anything else can fire.
 *
 * What that costs: no visitor is recognised across days, so "returning
 * visitors" and anything built on it are noise. Pageviews, events, referrers
 * and the technology breakdown are all intact, and they are what this is for.
 *
 * Unset VITE_MATOMO_URL and every function here is a no-op, which is what a dev
 * build and a preview deploy should be.
 */
import { CATEGORIES } from "../constants";
import { CATEGORY_SEO_BY_CATEGORY } from "../seo/categories";

declare global {
  interface Window {
    /** Matomo's command queue. Pushed to before matomo.js exists, and drained by it */
    _paq?: unknown[][];
  }
}

const MATOMO_URL = import.meta.env.VITE_MATOMO_URL?.trim().replace(/\/?$/, "/");
const SITE_ID = import.meta.env.VITE_MATOMO_SITE_ID?.trim();

/** Both halves or nothing: a tracker URL with no site id measures nobody */
const enabled = Boolean(MATOMO_URL && SITE_ID);

/**
 * Matomo truncates long values itself, but an event name is meant to be a label
 * rather than a payload. Anything longer is a mistake at the call site
 */
const MAX_NAME_LENGTH = 200;

const push = (command: unknown[]): void => {
  if (!enabled) return;
  (window._paq = window._paq ?? []).push(command);
};

const label = (value: string): string =>
  value.length > MAX_NAME_LENGTH ? `${value.slice(0, MAX_NAME_LENGTH - 1)}…` : value;

/**
 * The page as Matomo should record it: the path, and the categories of a shared
 * link because that is the one query param that says something about the visit.
 *
 * `lat` and `lon` are dropped, and this function is the only reason the tracker
 * is not left to read `location.href` for itself. They are on every link the
 * share button makes, they are usually where the person actually is, and a
 * coordinate in an analytics database is the kind of personal data that would
 * make every other precaution here beside the point.
 */
const trackedUrl = (): string => {
  const url = new URL(window.location.href);
  const categories = url.searchParams.get("categories");
  url.search = categories ? `?categories=${encodeURIComponent(categories)}` : "";
  url.hash = "";
  return url.toString();
};

/** The stable name of a category in a report: the slug its own page lives at */
const categoryName = (category: CATEGORIES | null): string =>
  category === null
    ? "uncategorised"
    : CATEGORY_SEO_BY_CATEGORY[category]?.slug ?? CATEGORIES[category] ?? "unknown";

/** The selection as one sortable label, e.g. "drinking-water,toilets" */
const categorySetName = (categories: readonly CATEGORIES[]): string =>
  categories.length === 0
    ? "none"
    : [...categories].map(categoryName).sort().join(",");

let started = false;

/**
 * Load the tracker and record the pageview. Called once, from main.tsx.
 *
 * Every page of this site is its own document — the city and category pages are
 * prerendered files, and there is no router turning a click into a new view — so
 * one pageview per load is the whole of the pageview tracking. If in-app
 * navigation ever lands, this is where its counterpart goes: setCustomUrl with
 * the new path, then another trackPageView.
 */
export function initAnalytics(): void {
  if (!enabled || started) return;
  started = true;

  // Order matters. Both of these have to be in the queue before the pageview,
  // or the first request of the visit is the one that ignores them
  push(["disableCookies"]);
  push(["setDoNotTrack", true]);

  push(["setTrackerUrl", `${MATOMO_URL}matomo.php`]);
  push(["setSiteId", SITE_ID as string]);
  push(["setCustomUrl", trackedUrl()]);
  push(["setDocumentTitle", document.title]);
  push(["trackPageView"]);
  // Clicks out to OpenStreetMap, Wikidata and the rest. Only the links in the
  // document at this point; the popups add theirs later, see poiPopupOpened
  push(["enableLinkTracking"]);

  const script = document.createElement("script");
  script.async = true;
  script.src = `${MATOMO_URL}matomo.js`;
  document.head.appendChild(script);
}

/** One event. `value` has to be a number, Matomo sums and averages it */
export function trackEvent(
  category: string,
  action: string,
  name?: string,
  value?: number
): void {
  const command: unknown[] = ["trackEvent", category, action];
  if (name !== undefined) command.push(label(name));
  if (value !== undefined) command.push(value);
  push(command);
}

/**
 * What people looked for and how many answers they got.
 *
 * Matomo's own site search report rather than an event, because it is the one
 * that has a "no results" list in it, and a search that finds nothing is the
 * interesting half.
 */
export function trackSearch(query: string, resultCount: number): void {
  push(["trackSiteSearch", label(query), "place", resultCount]);
}

/** What triggered a query to Overpass */
export type QueryTrigger =
  | "initial"
  | "categories"
  | "preset"
  | "place-search"
  | "pan"
  | "route"
  | "gps";

/**
 * The events of this app, named once here so a report is a list of things that
 * happened rather than a list of strings somebody typed twice.
 */
export const analytics = {
  /** A single category ticked or unticked in the picker */
  categoryToggled(category: CATEGORIES, selected: boolean): void {
    trackEvent("Categories", selected ? "select" : "deselect", categoryName(category));
  },

  categoriesCleared(): void {
    trackEvent("Categories", "clear all");
  },

  /**
   * The selection a query actually went out with, which is the honest answer to
   * "what do people use this for". The picker events above say what was tried;
   * this says what was searched, and the trigger says whether it was a
   * deliberate choice or the map catching up with a pan.
   */
  categoriesQueried(categories: readonly CATEGORIES[], trigger: QueryTrigger): void {
    trackEvent("Categories", `query: ${trigger}`, categorySetName(categories), categories.length);
  },

  /** A preset chip. Tapping the active one clears it, which is its own answer */
  presetToggled(presetId: string, applied: boolean, categoryCount: number): void {
    trackEvent("Presets", applied ? "apply" : "clear", presetId, categoryCount);
  },

  /**
   * A point opened. The name is the category it was drawn as, so the report
   * reads as which kinds of place people actually stop to look at, against the
   * `query` events above which say what they asked to see.
   */
  poiPopupOpened(category: CATEGORIES | null): void {
    trackEvent("POI", "popup open", categoryName(category));
    // The popup's links only exist now. Matomo marks the ones it has already
    // bound, so this binds the new ones and leaves the rest alone
    push(["enableLinkTracking"]);
  },

  /** A point with nothing to say: the tap gets a line at the bottom, not a popup */
  poiTappedWithoutDetails(category: CATEGORIES | null): void {
    trackEvent("POI", "tap: no details", categoryName(category));
  },

  /** A geocoder result taken. Separate from trackSearch, which is the query */
  searchResultChosen(): void {
    trackEvent("Search", "result chosen");
  },

  shared(method: "native" | "clipboard", ok: boolean): void {
    trackEvent("Map", `share: ${method}`, ok ? "ok" : "failed");
  },

  directionsPanelToggled(open: boolean): void {
    trackEvent("Map", open ? "directions: open" : "directions: close");
  },

  routeSearched(ok: boolean): void {
    trackEvent("Map", "route", ok ? "ok" : "failed");
  },

  /** The locate button. Without a fix it does nothing, and that is worth knowing */
  myLocationUsed(hasFix: boolean): void {
    trackEvent("Map", "my location", hasFix ? "centered" : "no fix");
  },

  /**
   * The view went below the zoom points load at. Fires on the transition, not
   * on every render, so it counts how often people end up too far out rather
   * than how long they stay there
   */
  zoomHintShown(): void {
    trackEvent("Map", "zoom hint: shown");
  },

  zoomHintTapped(): void {
    trackEvent("Map", "zoom hint: tapped");
  },

  /** Every mirror exhausted. The message, not the query: no bbox goes to Matomo */
  overpassFailed(message: string): void {
    trackEvent("Errors", "overpass failed", message);
  },
};
