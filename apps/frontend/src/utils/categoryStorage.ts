/**
 * Utility for storing and retrieving the selected categories from localStorage.
 * The same comma separated format is used in the URL of a shared link.
 */

import { CATEGORIES } from "../constants";

const STORAGE_KEY = "wayside_categories";

const isCategory = (value: number): boolean =>
  !isNaN(value) && Object.values(CATEGORIES).includes(value);

/**
 * Parse a comma separated list of category ids, e.g. "0,2".
 * Returns an empty array if nothing valid is found.
 */
export function parseCategories(raw: string | null): CATEGORIES[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((value) => parseInt(value, 10))
    .filter(isCategory) as CATEGORIES[];
}

/**
 * Serialize categories for localStorage or a URL query param.
 */
export function serializeCategories(categories: CATEGORIES[]): string {
  return categories.join(",");
}

/**
 * Save the selected categories to localStorage.
 */
export function saveCategories(categories: CATEGORIES[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeCategories(categories));
  } catch (error) {
    console.error("Failed to save categories to localStorage:", error);
  }
}

/**
 * Load the selected categories from localStorage.
 * Returns an empty array if nothing is stored or retrieval fails.
 */
export function loadCategories(): CATEGORIES[] {
  try {
    return parseCategories(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.error("Failed to load categories from localStorage:", error);
    return [];
  }
}
