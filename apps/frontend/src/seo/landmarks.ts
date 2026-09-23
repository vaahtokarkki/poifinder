import type { Locale } from "../copy";

/**
 * The sights a city is visited for, and how far each is from the nearest
 * public toilet or drinking fountain.
 *
 * This exists because of what people actually type. "Toilet near me" is
 * answered by the Maps panel, and a list page never gets the click: 36,830
 * impressions of near-me queries in August 2026 produced five. What Maps does
 * not answer well is the question a person asks standing at a sight they do
 * not know — "toilets near the Colosseum", "water fountain near Trevi" — and
 * the pages that rank for it are forum threads and travel blogs listing three
 * places from memory. Every mapped point near every sight is data this site
 * already has.
 *
 * Two halves, fetched at different paces. The sights themselves come from
 * scripts/fetch-landmarks.mjs into data/landmarks.json, which is run by hand:
 * the Colosseum does not move. The distances are worked out in
 * scripts/fetch-poi-data.mjs, against the full set of points it already holds
 * for the category, so they are exactly as current as the counts beside them.
 */

/** How far from a sight a point counts as "near" it, in metres */
export const LANDMARK_RADIUS = 500;

/**
 * Past this, the nearest point is no answer to "near the X" and the sight is
 * left off the page rather than written up as a 2 km walk
 */
export const LANDMARK_MAX_DISTANCE = 1000;

/** The sights listed per city, most visited first */
export const MAX_LANDMARKS = 6;

/** A sight, as data/landmarks.json stores it */
export type Landmark = {
  /** Wikidata id, which is also what the proximity rows point at */
  id: string;
  lat: number;
  lon: number;
  /** Wikipedia languages with an article on it, the measure of fame it is ranked by */
  sitelinks: number;
  /** Its name per locale, from Wikidata labels, OpenStreetMap as the fallback */
  names: Partial<Record<Locale, string>> & { default: string };
};

/** One sight's distance to a category, as the fetch stores it per category */
export type LandmarkProximity = {
  landmark: string;
  /** Points within LANDMARK_RADIUS */
  within: number;
  /** Straight line distance to the nearest point, in metres */
  distance: number;
  /** Compass bearing from the sight to that point, in degrees */
  bearing: number;
  /** The nearest point, as `node/123`, so a link can open its popup */
  poi: string;
  lat: number;
  lon: number;
};

/** The same with the sight's name in the page's language, as a page carries it */
export type LandmarkEntry = Omit<LandmarkProximity, "landmark"> & { name: string };

export function landmarkName(landmark: Landmark, locale: Locale): string {
  return landmark.names[locale] ?? landmark.names.default;
}

/** Eight compass points, clockwise from north, which is what the copy deck is keyed by */
export const DIRECTIONS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export function directionOf(bearing: number): Direction {
  const index = Math.round((((bearing % 360) + 360) % 360) / 45) % 8;
  return DIRECTIONS[index];
}

/**
 * A distance as a walker reads it: to the nearest ten metres, because the
 * points are mapped to a few metres and the sight's own coordinate is its
 * centre, so anything finer is precision the data does not have
 */
export function roundDistance(meters: number): number {
  return Math.max(10, Math.round(meters / 10) * 10);
}
