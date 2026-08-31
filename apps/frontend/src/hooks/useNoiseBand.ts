import { useEffect, useState } from "react";
import {
  noiseBandAt,
  noiseTilesConfigured,
  onGlMapChange,
  getGlMap,
} from "../map/noiseTiles";
import type { NoiseBand } from "../map/noiseTiles";

/**
 * The modelled noise band under a point, once the tiles that carry it arrive.
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
export function useNoiseBand(position: [number, number] | null): NoiseBand | null {
  const [band, setBand] = useState<NoiseBand | null>(null);

  useEffect(() => {
    if (!noiseTilesConfigured || !position) {
      setBand(null);
      return;
    }

    let cancelled = false;
    let map = getGlMap();

    const attempt = () => {
      if (cancelled) return true;
      const found = noiseBandAt(position);
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
    // Position is a fresh array on every render of the parent, so depend on
    // its contents rather than its identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.[0], position?.[1]]);

  return band;
}
