import { useEffect, useState } from "react";
import {
  noiseBandAt,
  noiseBandOverArea,
  noiseTilesConfigured,
  onGlMapChange,
  getGlMap,
} from "../map/noiseTiles";
import type { NoiseBand } from "../map/noiseTiles";

/**
 * The modelled noise band for a place, once the tiles that carry it arrive.
 *
 * One sample point is read as a point. Several are read as an area — see
 * noiseBandOverArea — which is what a park, a beach or a playground is.
 *
 * Nothing here blocks anything. The popup renders without it, and the row this
 * feeds appears later if it appears at all — a tile server that is down, slow,
 * or has never been built simply leaves the popup as it was.
 *
 * Which is also why this listens rather than polls. Two things can make the
 * first query come back null and the second succeed: the noise layer is not
 * installed yet, because it waits for the basemap to finish before asking for
 * anything, and the tile for this area may still be in flight. `idle` fires
 * whenever MapLibre has finished loading and drawing what it was given, which
 * covers both. Once there is an answer the listeners come off, because the
 * answer for a fixed position cannot change.
 */
export function useNoiseBand(points: [number, number][] | null): NoiseBand | null {
  const [band, setBand] = useState<NoiseBand | null>(null);
  /**
   * The points as one string, because the array is rebuilt on every render of
   * the popup and depending on its identity would restart the query on each of
   * them. What the answer depends on is where the samples are.
   */
  const key = points ? points.map(([lat, lng]) => `${lat},${lng}`).join(";") : "";

  useEffect(() => {
    if (!noiseTilesConfigured || !points || points.length === 0) {
      setBand(null);
      return;
    }

    let cancelled = false;
    let map = getGlMap();

    const attempt = () => {
      if (cancelled) return true;
      // One point is a point; several are an area, and an area is answered by
      // what covers most of it rather than by whichever sample came first
      const found =
        points.length === 1 ? noiseBandAt(points[0]) : noiseBandOverArea(points);
      if (found === null) return false;
      setBand(found);
      return true;
    };

    const detach: (() => void)[] = [];

    const listen = () => {
      map = getGlMap();
      if (!map) return;
      // `idle` rather than `sourcedata`: sourcedata fires per tile and would
      // run the query a dozen times for one pan, where idle fires once when
      // there is nothing left to load or draw
      const onIdle = () => {
        if (attempt()) {
          map?.off("idle", onIdle);
        }
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
    // The samples are a fresh array on every render of the parent, so depend
    // on where they are rather than on the array's identity
  }, [key]);

  return band;
}
