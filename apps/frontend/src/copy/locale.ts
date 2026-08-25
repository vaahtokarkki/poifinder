/**
 * The locale the app is currently reading, as a tiny store outside React.
 *
 * A store rather than a context because `ui()` is called from places that are
 * not components at all — the marker popups are rendered to a string and
 * handed to Leaflet, and the error paths in App are callbacks. Threading a
 * context through those means changing how they are called; a module the
 * whole app can ask keeps every existing `ui()` call site as it is.
 *
 * It has to stay free of `window`: the prerender loads this in Node, where
 * `current` never moves off English and every page is written in it. Reading
 * and writing storage is the caller's job, in utils/localeStorage.ts.
 *
 * This is a stated preference only. Nothing here reads `navigator.languages`,
 * and nothing here changes the URL: the language a page lives at is a property
 * of that page, and swapping the words under a visitor is a different thing
 * from moving them to another one.
 */
import { DEFAULT_LOCALE } from "./types";
import type { Locale } from "./types";

let current: Locale = DEFAULT_LOCALE;

const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

/** What the server always renders, and what a hook falls back to before hydration */
export function getServerLocale(): Locale {
  return DEFAULT_LOCALE;
}

export function setLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  for (const listener of listeners) listener();
}

/** Subscribe to changes, in the shape `useSyncExternalStore` wants */
export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
