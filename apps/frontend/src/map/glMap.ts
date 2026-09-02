/**
 * The one MapLibre map on the page, so that anything can reach it.
 *
 * The GL map lives inside BasemapLayer's effect and the things that need it —
 * a popup reading the air quality, a panel asking what the view is over — are
 * rendered somewhere else entirely, so one of them has to publish it. A module
 * holding a single instance is the smallest thing that works: there is exactly
 * one map on the page, and a context would thread a provider through every
 * component in between to say so.
 *
 * This used to live in map/noiseTiles.ts, which was right while noise was the
 * only overlay and wrong the moment there were two. An air quality layer
 * importing the map registry from the noise layer would say the two are
 * related, and they are not — they share a map, the way every layer does.
 */
import type { Map as MaplibreMap } from "maplibre-gl";

let currentMap: MaplibreMap | null = null;
const listeners = new Set<() => void>();

export function setGlMap(map: MaplibreMap | null): void {
  currentMap = map;
  for (const listener of listeners) listener();
}

export function getGlMap(): MaplibreMap | null {
  return currentMap;
}

/**
 * Called whenever the map is replaced, which a style reload does. Returns the
 * unsubscribe, so an effect can hand it straight back.
 */
export function onGlMapChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
