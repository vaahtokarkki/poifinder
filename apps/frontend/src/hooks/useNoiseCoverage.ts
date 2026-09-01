import { useEffect, useState } from "react";
import {
  getGlMap,
  noiseCoverageAtCenter,
  noiseTilesConfigured,
  onGlMapChange,
} from "../map/noiseTiles";
import type { NoiseCoverage } from "../map/noiseTiles";

/**
 * Whether the noise tiles cover where the map is looking, for as long as
 * something is asking.
 *
 * Mounting is the subscription: the layers panel is the only caller, it exists
 * only while it is open, and there is no reason to keep answering a question
 * nobody is looking at.
 *
 * `idle` rather than `moveend`, and for the same reason useNoiseBand uses it:
 * a tile that arrives after the pan has stopped changes the answer, and idle
 * is the event that fires once when there is nothing left to load or draw. The
 * listener stays on rather than coming off at the first answer — unlike a
 * band under a fixed point, this one changes as the map moves.
 */
export function useNoiseCoverage(): NoiseCoverage {
  const [coverage, setCoverage] = useState<NoiseCoverage>("unknown");

  useEffect(() => {
    if (!noiseTilesConfigured) return;

    let cancelled = false;
    const detach: (() => void)[] = [];

    const read = () => {
      if (!cancelled) setCoverage(noiseCoverageAtCenter());
    };

    const listen = () => {
      const map = getGlMap();
      if (!map) return;
      map.on("idle", read);
      detach.push(() => map.off("idle", read));
    };

    // The tiles are usually already in by the time anybody opens the panel, in
    // which case this is the whole of it
    read();
    listen();
    // And if the GL map is replaced under us — a style reload rebuilds it —
    // the new one has to be listened to and asked again
    detach.push(
      onGlMapChange(() => {
        read();
        listen();
      })
    );

    return () => {
      cancelled = true;
      for (const off of detach) off();
    };
  }, []);

  return coverage;
}
