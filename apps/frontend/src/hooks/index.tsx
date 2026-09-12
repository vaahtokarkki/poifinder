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
  /** Radius in metres the device claims the fix is good to, when it says */
  accuracy?: number;
  /**
   * Degrees clockwise from north, as reported by the positioning hardware.
   * Only ever there while the device is moving, and null on most desktops,
   * which is why the compass reads the magnetometer first (useDeviceHeading).
   */
  heading?: number | null;
};

/**
 * How the device is answering, so the map can say "waiting for GPS" without
 * having to guess the difference between a fix that is slow and one that is
 * never coming.
 *
 * "idle" is the state this starts in: nothing has been asked of the device
 * yet, so there is nothing to report and no prompt on screen.
 */
export type GpsStatus =
  | "unsupported"
  | "idle"
  | "waiting"
  | "locked"
  | "denied"
  /** The device answered, and the answer was that it does not know where it is */
  | "unavailable";

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

const supported = typeof navigator !== "undefined" && "geolocation" in navigator;

let currentStatus: GpsStatus = supported ? "idle" : "unsupported";
const statusListeners = new Set<(status: GpsStatus) => void>();

const publishStatus = (status: GpsStatus) => {
  if (status === currentStatus) return;
  currentStatus = status;
  statusListeners.forEach((listener) => listener(status));
};

const onGeolocation = ({ coords, timestamp }: GeolocationPosition) => {
  publish({
    lat: coords.latitude,
    lng: coords.longitude,
    initialized: true,
    isFromCache: Date.now() - timestamp > 5000, // Assume cached if older than 5s
    hasGpsLock: true,
    accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : undefined,
    heading: Number.isFinite(coords.heading) ? coords.heading : null,
  });
  publishStatus("locked");
  saveGPSLocation({
    lat: coords.latitude,
    lng: coords.longitude,
    timestamp: Date.now(),
  });
};

/**
 * Starts watching the device position, asking for permission if it has not
 * been given yet. Runs at most once per page load; the watch is never torn
 * down because the position is needed for the whole session.
 */
const startWatching = () => {
  if (!supported) {
    publishStatus("unsupported");
    return;
  }
  if (watching) return;
  watching = true;
  publishStatus("waiting");

  // Get a position immediately if available (up to 5 minutes old)
  // This ensures fast initial response, especially on repeat visits
  navigator.geolocation.getCurrentPosition(
    onGeolocation,
    (error) => {
      if (error) console.debug("Geolocation error (cached):", error.message);
      if (error?.code === error?.PERMISSION_DENIED) {
        publishStatus("denied");
        return;
      }
      // The watch below is still trying, so this is only the end of the road
      // if nothing has answered by now
      if (currentStatus === "waiting") publishStatus("unavailable");
    },
    {
      // Ask for GPS rather than the network provider. Wi-Fi based positioning
      // makes Chrome request Android's "nearby devices" permission, which is
      // alarming out of context.
      enableHighAccuracy: true,
      maximumAge: 5 * 60 * 1000, // Accept cached position up to 5 minutes old
      // GPS indoors routinely takes longer than this used to allow. Five
      // seconds reported a failure while the chip was still spinning and the
      // watch below was still working, which is how a slow fix came to look
      // like a broken one
      timeout: 20000,
    }
  );

  // Watch for fresh position updates in the background
  // This silently updates position as fresh GPS becomes available
  navigator.geolocation.watchPosition(
    onGeolocation,
    (error) => {
      if (error) console.debug("Geolocation watch error:", error.message);
      // Only a refusal is conclusive. Anything else is the watch still trying,
      // and taking the chip down on it would be a guess
      if (error?.code === error?.PERMISSION_DENIED) publishStatus("denied");
    },
    {
      enableHighAccuracy: true, // GPS only, see the note above
      // No timeout: on a watch it does not stop anything, it only delivers an
      // error every time the deadline passes while the fix is still coming
      maximumAge: 0, // Always get fresh GPS for watchPosition
    }
  );
};

/**
 * Ask the device where it is. Called from the my-location button, which is the
 * one moment the visitor has said they want this.
 *
 * Nothing else starts the prompt. A permission sheet on page load, before
 * anybody asked for anything, is the version people dismiss: over 90 days the
 * locate button reported "no fix" 76 times across 11 visits — the same handful
 * of people tapping a button that could not answer, seven times each.
 */
export const requestUserPosition = (): void => startWatching();

/**
 * Start the watch without prompting, for a visitor who has already granted
 * location to this site. Their fix is what centres the map on arrival, and
 * asking again would be asking a question already answered.
 */
const startIfAlreadyGranted = () => {
  if (watching || !supported || !navigator.permissions?.query) return;
  navigator.permissions
    .query({ name: "geolocation" as PermissionName })
    .then((result) => {
      if (result.state === "granted") startWatching();
      else if (result.state === "denied") publishStatus("denied");
    })
    // Safari before 16 has no geolocation entry in the permissions registry
    // and rejects. Nothing to do: the button still works
    .catch(() => {});
};

export const useUserPosition = (): { position: LatLng } => {
  const [position, setPosition] = useState<LatLng>(currentPosition);

  useEffect(() => {
    listeners.add(setPosition);
    startIfAlreadyGranted();
    // Catch up with a position that arrived before this component subscribed
    setPosition(currentPosition);

    return () => {
      listeners.delete(setPosition);
    };
  }, []);

  return { position };
};

/**
 * Whether the device has answered yet, for the chip that says so. Shares the
 * one geolocation subscription with useUserPosition; either hook starts it.
 */
export const useGpsStatus = (): GpsStatus => {
  const [status, setStatus] = useState<GpsStatus>(currentStatus);

  useEffect(() => {
    statusListeners.add(setStatus);
    startIfAlreadyGranted();
    setStatus(currentStatus);

    return () => {
      statusListeners.delete(setStatus);
    };
  }, []);

  return status;
};
