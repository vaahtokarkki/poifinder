import { fetchWithRetry } from "../utils/retryFetch";

/**
 * The first view of a visit that has nothing else to go on: no city or
 * coordinates in the URL, no view kept from an earlier visit, no GPS fix yet.
 *
 * The lookup is city accurate at best, so it is only ever a placeholder for
 * the browser's own position, and it must not hold the first load for long:
 * it runs without retries and gives up quickly, leaving the map where it was.
 */

const IP_LOCATION_URL = "https://ipapi.co/json/";

const IP_LOCATION_TIMEOUT_MS = 2500;

type IpLocationResponse = {
  latitude?: number;
  longitude?: number;
  error?: boolean;
  reason?: string;
};

/** The visitor's approximate [lat, lon] by IP, or null when it cannot be had */
export async function fetchIpLocation(): Promise<[number, number] | null> {
  try {
    const res = await fetchWithRetry(
      IP_LOCATION_URL,
      { headers: { Accept: "application/json" } },
      { maxRetries: 0, timeoutMs: IP_LOCATION_TIMEOUT_MS }
    );
    if (!res.ok) return null;

    const data: IpLocationResponse = await res.json();
    // The free tier answers 200 with an error body when it is out of quota
    if (data.error) return null;

    const { latitude, longitude } = data;
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !isFinite(latitude) ||
      !isFinite(longitude)
    ) {
      return null;
    }
    return [latitude, longitude];
  } catch (error) {
    console.debug("IP location lookup failed:", error);
    return null;
  }
}
