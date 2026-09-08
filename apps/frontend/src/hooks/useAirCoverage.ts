import { useEffect, useState } from "react";
import { airCoverageAtCenter, airTilesConfigured } from "../map/airTiles";
import type { AirCoverage } from "../map/airTiles";
import { getGlMap, onGlMapChange } from "../map/glMap";

/**
 * Whether the air tiles cover where the view is looking, for as long as
 * something is asking.
 *
 * Mounting is the subscription, and there are two callers now: the layers
 * panel, which is open only while somebody is looking at it, and the marker
 * layer, which uses it to decide whether a plain point has anything to say in
 * a popup.
 *
 * `idle` rather than the `moveend` this used, and dropping the station fetch
 * with it, because the question changed — see airCoverageAtCenter. Coverage is
 * now read out of the rendered tiles rather than out of the snapshot, so a
 * tile arriving changes the answer and `idle` is the event for that. It also
 * makes this free: no reader downloads a few hundred kilobytes of stations to
 * find out whether a layer they have not opened has anything in it.
 */
export function useAirCoverage(): AirCoverage {
  const [coverage, setCoverage] = useState<AirCoverage>("unknown");

  useEffect(() => {
    if (!airTilesConfigured) return;

    let cancelled = false;
    const detach: (() => void)[] = [];

    const read = () => {
      if (!cancelled) setCoverage(airCoverageAtCenter());
    };

    const listen = () => {
      const map = getGlMap();
      if (!map) return;
      map.on("idle", read);
      detach.push(() => map.off("idle", read));
    };

    // The tiles are usually already in by the time anybody asks, in which case
    // this is the whole of it
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
