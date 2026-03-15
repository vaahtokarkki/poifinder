/**
 * Utility for storing and retrieving the user's last known map location from localStorage.
 */

export interface MapLocation {
  lat: number;
  lng: number;
  zoom?: number;
}

const STORAGE_KEY = "poifinder_map_location";

/**
 * Save the map location to localStorage.
 */
export function saveMapLocation(location: MapLocation): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch (error) {
    console.error("Failed to save map location to localStorage:", error);
  }
}

/**
 * Load the map location from localStorage.
 * Returns null if no location is stored or retrieval fails.
 */
export function loadMapLocation(): MapLocation | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const location = JSON.parse(stored) as MapLocation;

    // Validate the data
    if (
      typeof location.lat === "number" &&
      typeof location.lng === "number" &&
      isFinite(location.lat) &&
      isFinite(location.lng)
    ) {
      return location;
    }
  } catch (error) {
    console.error("Failed to load map location from localStorage:", error);
  }

  return null;
}

/**
 * Clear the stored map location from localStorage.
 */
export function clearMapLocation(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear map location from localStorage:", error);
  }
}
