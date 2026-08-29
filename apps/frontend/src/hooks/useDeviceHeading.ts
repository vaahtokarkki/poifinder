import { useEffect, useState } from "react";

/**
 * Which way the phone is pointing, for the compass cone on the location dot.
 *
 * Two sources, neither of them universal. iOS hands us a compass heading
 * directly on the event as `webkitCompassHeading`, already measured clockwise
 * from true north. Everywhere else we get `alpha` from the absolute
 * orientation event, which counts counter-clockwise from north, so it has to
 * be flipped, and is only a compass at all when `absolute` is set — a relative
 * reading is measured from wherever the device happened to be when it started
 * listening, which points nowhere in particular.
 *
 * A desktop, or a phone with no magnetometer, simply never fires either, and
 * the cone stays off. That is the intended outcome: a compass that points at a
 * guess is worse than no compass.
 */

type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };

type PermissionCapableEventConstructor = {
  requestPermission?: () => Promise<PermissionState | "granted" | "denied">;
};

let currentHeading: number | null = null;
const listeners = new Set<(heading: number | null) => void>();
let listening = false;
/** Set once iOS has been asked, so a second tap does not ask again */
let permissionRequested = false;

/** Below this the reading is noise, and the cone would jitter for nothing */
const MIN_DEGREES_MOVED = 1;
/** The sensor fires far faster than a compass needs to be redrawn */
const MIN_MS_BETWEEN_UPDATES = 100;

let lastPublishedAt = 0;

const publish = (heading: number | null) => {
  currentHeading = heading;
  listeners.forEach((listener) => listener(heading));
};

/**
 * How far apart two bearings are, the short way round: 359° and 1° are two
 * degrees apart, not 358.
 */
const angleBetween = (a: number, b: number) => {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
};

/**
 * Set once the dedicated absolute event has fired. Chrome delivers both events
 * and only the absolute one is measured from north; taking whichever arrived
 * last had the cone alternating between two reference frames, which looks
 * exactly like a compass that cannot make its mind up.
 */
let absoluteEventSeen = false;

const onOrientation = (event: CompassEvent) => {
  let heading: number | null = null;

  if (typeof event.webkitCompassHeading === "number") {
    heading = event.webkitCompassHeading;
  } else if (event.absolute && typeof event.alpha === "number") {
    // Counter-clockwise from north, and read against the screen rather than
    // the device, so a phone held sideways does not point 90° off
    heading = 360 - event.alpha + (screen.orientation?.angle ?? 0);
  }

  if (heading === null || !Number.isFinite(heading)) return;
  heading = ((heading % 360) + 360) % 360;

  const now = Date.now();
  if (now - lastPublishedAt < MIN_MS_BETWEEN_UPDATES) return;
  if (currentHeading !== null && angleBetween(currentHeading, heading) < MIN_DEGREES_MOVED) {
    return;
  }

  lastPublishedAt = now;
  publish(heading);
};

const startListening = () => {
  if (listening || typeof window === "undefined") return;
  listening = true;

  // Chrome fires the absolute event and leaves `absolute` unset on the plain
  // one; Safari fires only the plain one, with webkitCompassHeading on it.
  // Listening to both and letting onOrientation reject what it cannot use is
  // simpler than feature detection that both browsers lie about
  window.addEventListener("deviceorientationabsolute", ((event: CompassEvent) => {
    absoluteEventSeen = true;
    onOrientation(event);
  }) as EventListener);

  window.addEventListener("deviceorientation", ((event: CompassEvent) => {
    // Safari's only orientation event, and the one carrying the iOS compass
    // heading. On a browser that has an absolute event of its own this one is
    // the relative reading, and is not a compass
    if (absoluteEventSeen) return;
    onOrientation(event);
  }) as EventListener);
};

/**
 * iOS will not deliver orientation events until it has been asked from inside
 * a user gesture, so this is called from the my-location button rather than on
 * mount. A no-op everywhere else.
 */
export const requestDeviceHeadingPermission = async (): Promise<void> => {
  const ctor = (typeof DeviceOrientationEvent !== "undefined"
    ? DeviceOrientationEvent
    : undefined) as unknown as PermissionCapableEventConstructor | undefined;

  if (permissionRequested || typeof ctor?.requestPermission !== "function") return;
  permissionRequested = true;

  try {
    if ((await ctor.requestPermission()) === "granted") startListening();
  } catch (error) {
    console.debug("Device orientation permission request failed:", error);
  }
};

export const useDeviceHeading = (): number | null => {
  const [heading, setHeading] = useState<number | null>(currentHeading);

  useEffect(() => {
    listeners.add(setHeading);
    startListening();
    setHeading(currentHeading);

    return () => {
      listeners.delete(setHeading);
    };
  }, []);

  return heading;
};
