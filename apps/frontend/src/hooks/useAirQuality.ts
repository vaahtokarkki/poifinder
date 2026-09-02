import { useEffect, useState } from "react";
import {
  airTilesConfigured,
  loadStations,
  nearestReading,
} from "../map/airTiles";
import type { AirReading } from "../map/airTiles";

/**
 * The nearest air quality measurement to a place, once the snapshot arrives.
 *
 * Much simpler than useNoiseBand next door, and the difference is the point.
 * That hook has to wait for a vector tile to load, ask the rendered map what
 * is under a pixel, and listen for `idle` because the answer changes as tiles
 * arrive. This one fetches one JSON file and does arithmetic: no map, no
 * tiles, no zoom, no listeners. A popup can answer at z18 with the layer
 * switched off and the wash not drawn.
 *
 * Nothing here blocks anything. The popup renders without it and the row
 * appears later if it appears at all — a tile server that is down, or a point
 * with no monitor within 75 km, simply leaves the popup as it was.
 */
export function useAirReading(position: [number, number] | null): AirReading | null {
  const [reading, setReading] = useState<AirReading | null>(null);

  // The position as a string, because the tuple is rebuilt on every render of
  // the popup and depending on its identity would restart the lookup on each
  // of them. What the answer depends on is where the point is
  const key = position ? `${position[0]},${position[1]}` : "";

  useEffect(() => {
    if (!airTilesConfigured || !position) {
      setReading(null);
      return;
    }

    let cancelled = false;
    // Resolves immediately once the snapshot is in, so a second popup in the
    // same session costs a microtask rather than a request
    loadStations().then(stations => {
      if (cancelled || !stations) return;
      setReading(nearestReading(position));
    });

    return () => {
      cancelled = true;
    };
    // The position is a fresh array on every render of the parent, so depend
    // on where it is rather than on the array's identity
  }, [key]);

  return reading;
}
