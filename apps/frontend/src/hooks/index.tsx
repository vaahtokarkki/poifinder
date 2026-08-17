import { useEffect, useState } from "react";
import { loadGPSLocation, saveGPSLocation } from "../utils/gpsLocationStorage";

export type LatLng = {
  lat?: number;
  lng?: number;
  /** True once we have coordinates, either from localStorage or from the device */
  initialized: boolean;
  isFromCache?: boolean;
  /** True once the device has reported a position during this session */
  hasGpsLock: boolean;
};

/**
 * Start from the last known position in localStorage so the map can be centered
 * immediately. It is not a GPS lock, so consumers can display it as stale.
 */
const initialPosition = (): LatLng => {
  const cached = loadGPSLocation();
  if (!cached) {
    return { initialized: false, hasGpsLock: false };
  }
  return {
    lat: cached.lat,
    lng: cached.lng,
    initialized: true,
    isFromCache: true,
    hasGpsLock: false,
  };
};

// A single geolocation subscription is shared by every consumer of the hook, so
// that all components see the same position and only one watch is running.
let currentPosition: LatLng = initialPosition();
const listeners = new Set<(position: LatLng) => void>();
let watching = false;

const publish = (position: LatLng) => {
  currentPosition = position;
  listeners.forEach((listener) => listener(position));
};

const onGeolocation = ({ coords, timestamp }: GeolocationPosition) => {
  publish({
    lat: coords.latitude,
    lng: coords.longitude,
    initialized: true,
    isFromCache: Date.now() - timestamp > 5000, // Assume cached if older than 5s
    hasGpsLock: true,
  });
  saveGPSLocation({
    lat: coords.latitude,
    lng: coords.longitude,
    timestamp: Date.now(),
  });
};

/**
 * Starts watching the device position. Runs at most once per page load; the
 * watch is never torn down because the position is needed for the whole session.
 */
const startWatching = () => {
  if (watching || !("geolocation" in navigator)) {
    return;
  }
  watching = true;

  // Get a position immediately if available (up to 5 minutes old)
  // This ensures fast initial response, especially on repeat visits
  navigator.geolocation.getCurrentPosition(
    onGeolocation,
    (error) => {
      if (error) console.debug("Geolocation error (cached):", error.message);
    },
    {
      // Ask for GPS rather than the network provider. Wi-Fi based positioning
      // makes Chrome request Android's "nearby devices" permission, which is
      // alarming out of context.
      enableHighAccuracy: true,
      maximumAge: 5 * 60 * 1000, // Accept cached position up to 5 minutes old
      timeout: 5000, // Don't wait more than 5 seconds for GPS
    }
  );

  // Watch for fresh position updates in the background
  // This silently updates position as fresh GPS becomes available
  navigator.geolocation.watchPosition(
    onGeolocation,
    (error) => {
      if (error) console.debug("Geolocation watch error:", error.message);
    },
    {
      enableHighAccuracy: true, // GPS only, see the note above
      timeout: 10000, // Wait up to 10s for fresh GPS
      maximumAge: 0, // Always get fresh GPS for watchPosition
    }
  );
};

export const useUserPosition = (): { position: LatLng } => {
  const [position, setPosition] = useState<LatLng>(currentPosition);

  useEffect(() => {
    listeners.add(setPosition);
    startWatching();
    // Catch up with a position that arrived before this component subscribed
    setPosition(currentPosition);

    return () => {
      listeners.delete(setPosition);
    };
  }, []);

  return { position };
};
