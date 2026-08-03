/**
 * Utility for caching the POIs of the latest fetch in localStorage, so the map
 * can be populated instantly on the next visit instead of waiting for Overpass.
 */

import type { OverpassMarkerData } from "../api/overpass";
import type { CATEGORIES } from "../constants";

export interface CachedPois {
  markers: OverpassMarkerData[];
  /** Bounding box the markers were fetched for: [south, west, north, east] */
  bbox: [number, number, number, number];
  categories: CATEGORIES[];
  timestamp: number;
}

const STORAGE_KEY = "wayside_pois";

/** Keep the stored payload small enough to fit the localStorage quota. */
const MAX_CACHED_MARKERS = 500;

/** Cached POIs older than this are only used as a placeholder while refetching. */
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Save the markers of the latest fetch to localStorage.
 * Large result sets are trimmed, and shrunk further if the quota is exceeded.
 */
export function savePois(pois: Omit<CachedPois, "timestamp">): void {
  let attempt: CachedPois = {
    ...pois,
    markers: pois.markers.slice(0, MAX_CACHED_MARKERS),
    timestamp: Date.now(),
  };

  while (attempt.markers.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
      return;
    } catch {
      // Most likely the quota is exceeded, retry with half of the markers
      attempt = {
        ...attempt,
        markers: attempt.markers.slice(0, Math.floor(attempt.markers.length / 2)),
      };
    }
  }

  console.error("Failed to save POIs to localStorage, clearing the cache");
  clearPois();
}

/**
 * Load the cached POIs from localStorage.
 * Returns null if nothing is stored or the stored data is unusable.
 */
export function loadPois(): CachedPois | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const cache = JSON.parse(stored) as CachedPois;

    // Validate the data
    if (
      Array.isArray(cache.markers) &&
      Array.isArray(cache.categories) &&
      Array.isArray(cache.bbox) &&
      cache.bbox.length === 4 &&
      cache.bbox.every((value) => typeof value === "number" && isFinite(value)) &&
      typeof cache.timestamp === "number"
    ) {
      return {
        ...cache,
        markers: cache.markers.filter((marker) => marker?.geom?.geometry),
      };
    }
  } catch (error) {
    console.error("Failed to load POIs from localStorage:", error);
  }

  return null;
}

/**
 * Clear the cached POIs from localStorage.
 */
export function clearPois(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear POIs from localStorage:", error);
  }
}

/**
 * Whether the cached POIs were fetched for exactly the given categories.
 * Cached markers of other categories must not be displayed at all.
 */
export function poiCacheMatchesCategories(
  cache: CachedPois,
  categories: CATEGORIES[]
): boolean {
  if (cache.categories.length !== categories.length) {
    return false;
  }
  const cached = [...cache.categories].sort();
  return [...categories].sort().every((category, i) => cached[i] === category);
}

/**
 * Whether the cached POIs are fresh enough and cover the given map center, in
 * which case the initial fetch on app start can be skipped entirely.
 */
export function isPoiCacheUpToDate(
  cache: CachedPois,
  categories: CATEGORIES[],
  center: { lat: number; lng: number }
): boolean {
  if (!poiCacheMatchesCategories(cache, categories)) {
    return false;
  }
  if (Date.now() - cache.timestamp > MAX_CACHE_AGE_MS) {
    return false;
  }
  const [south, west, north, east] = cache.bbox;
  return (
    center.lat >= south &&
    center.lat <= north &&
    center.lng >= west &&
    center.lng <= east
  );
}
