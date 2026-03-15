/**
 * Utility for storing and retrieving the user's last known GPS location from localStorage.
 */

export interface GPSLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

const STORAGE_KEY = "poifinder_gps_location";

/**
 * Save the GPS location to localStorage.
 */
export function saveGPSLocation(location: GPSLocation): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch (error) {
    console.error("Failed to save GPS location to localStorage:", error);
  }
}

/**
 * Load the GPS location from localStorage.
 * Returns null if no location is stored or retrieval fails.
 */
export function loadGPSLocation(): GPSLocation | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const location = JSON.parse(stored) as GPSLocation;

    // Validate the data
    if (
      typeof location.lat === "number" &&
      typeof location.lng === "number" &&
      typeof location.timestamp === "number" &&
      isFinite(location.lat) &&
      isFinite(location.lng)
    ) {
      return location;
    }
  } catch (error) {
    console.error("Failed to load GPS location from localStorage:", error);
  }

  return null;
}

/**
 * Clear the stored GPS location from localStorage.
 */
export function clearGPSLocation(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear GPS location from localStorage:", error);
  }
}
