import { useEffect, useState } from "react";
import {
  airCoverageAtCenter,
  airTilesConfigured,
  loadStations,
} from "../map/airTiles";
import type { AirCoverage } from "../map/airTiles";
import { getGlMap, onGlMapChange } from "../map/glMap";

/**
 * Whether a monitor is near the middle of the view, for as long as something
 * is asking.
 *
 * Mounting is the subscription: the layers panel is the only caller, it exists
 * only while it is open, and there is no reason to keep answering a question
 * nobody is looking at. Opening the panel is also what pays for the station
 * snapshot, which is the other reason this is not asked earlier.
 *
 * `moveend` rather than the `idle` its noise counterpart uses, and that is the
 * whole difference between them. Noise coverage is read out of rendered tiles,
 * so it changes when a tile arrives and `idle` is the event for that. This is
 * read out of a snapshot already in memory, so the only thing that can change
 * the answer is the map moving — and `idle` fires far more often than the map
 * moves.
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
      map.on("moveend", read);
      detach.push(() => map.off("moveend", read));
    };

    // The snapshot is usually already in by the time anybody opens the panel,
    // in which case this resolves on a microtask and nothing is ever fetched
    loadStations().then(() => {
      if (!cancelled) read();
    });
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
