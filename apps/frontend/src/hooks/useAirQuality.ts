import { useEffect, useState } from "react";
import {
  airBandAt,
  airTilesConfigured,
  loadStations,
  nearestReading,
} from "../map/airTiles";
import type { AirBand, AirReading } from "../map/airTiles";
import { getGlMap, onGlMapChange } from "../map/glMap";

/**
 * The band the wash paints at a place, once the tile carrying it arrives.
 *
 * The same shape as useNoiseBand next door, and for the same reasons: the
 * layer is installed only after the basemap has finished, the tile for this
 * place may still be in flight, and `idle` is the one event that covers both.
 * Once there is an answer the listeners come off, because the band under a
 * fixed position cannot change.
 *
 * This is what the popup's coloured word is, and reading it from the rendered
 * tiles rather than from a station is what stops the popup disagreeing with
 * the map underneath it — see the head of airTiles.
 */
export function useAirBand(position: [number, number] | null): AirBand | null {
  const [band, setBand] = useState<AirBand | null>(null);

  // The position as a string, because the tuple is rebuilt on every render of
  // the popup and depending on its identity would restart the query on each of
  // them. What the answer depends on is where the point is
  const key = position ? `${position[0]},${position[1]}` : "";

  useEffect(() => {
    if (!airTilesConfigured || !position) {
      setBand(null);
      return;
    }

    let cancelled = false;
    let map = getGlMap();

    const attempt = () => {
      if (cancelled) return true;
      const found = airBandAt(position);
      if (found === null) return false;
      setBand(found);
      return true;
    };

    const detach: (() => void)[] = [];

    const listen = () => {
      map = getGlMap();
      if (!map) return;
      const onIdle = () => {
        if (attempt()) map?.off("idle", onIdle);
      };
      map.on("idle", onIdle);
      detach.push(() => map?.off("idle", onIdle));
    };

    // The style may already be loaded and the tile already in, in which case
    // this is the whole of it and no listener is ever attached
    if (!attempt()) {
      listen();
      // And if the GL map is not there yet — the very first render, before
      // BasemapLayer's style has resolved — wait for it to publish itself
      detach.push(
        onGlMapChange(() => {
          if (!attempt()) listen();
        })
      );
    }

    return () => {
      cancelled = true;
      for (const off of detach) off();
    };
    // The position is a fresh array on every render of the parent, so depend
    // on where it is rather than on the array's identity
  }, [key]);

  return band;
}

/**
 * The nearest sensor to a place, once the snapshot arrives.
 *
 * Support for the band above rather than the band itself: what the closest
 * instrument read, how far away it stands and how long ago. One fetch and some
 * arithmetic — no map, no tiles, no zoom, no listeners — so it settles
 * independently of the band, and the caption fills in a moment after the row
 * appears if the snapshot is not already in.
 *
 * Nothing here blocks anything. A tile server that is down, or a place with no
 * sensor within 75 km, leaves the row with its shorter caption.
 */
export function useAirReading(position: [number, number] | null): AirReading | null {
  const [reading, setReading] = useState<AirReading | null>(null);

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
  }, [key]);

  return reading;
}
