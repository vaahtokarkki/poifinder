/**
 * The active language, as React state.
 *
 * `useSyncExternalStore` rather than a context, because the store it reads
 * lives outside React and is asked from places that are not components — the
 * marker popups render to a string for Leaflet, and the error paths in App are
 * callbacks. See copy/locale.ts.
 *
 * Subscribing anywhere in the tree is enough to re-render that subtree. App
 * subscribes once at the top, which is what makes every plain `ui()` call
 * below it pick up the new language.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getLocale, getServerLocale, setLocale, subscribeLocale } from "../copy";
import type { Locale } from "../copy";
import { loadLocale, saveLocale } from "../utils/localeStorage";

/**
 * The language the app is reading. Read only, and safe to call from anywhere:
 * it subscribes and nothing else, so a component that merely renders words can
 * re-render on a change without owning the preference.
 */
export function useActiveLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getServerLocale);
}

/**
 * The language, plus a setter that remembers it. Call this once, at the top —
 * it also applies the stored preference on mount, and doing that in several
 * places would race.
 */
export function useLocale(): [Locale, (locale: Locale) => void] {
  const locale = useActiveLocale();

  // The stored preference is applied after mount rather than at import, so the
  // first render matches the prerendered markup and React has nothing to
  // complain about. A visitor who chose a language sees it a frame later,
  // which is the cost of not hydrating against markup we did not send
  useEffect(() => {
    const stored = loadLocale();
    if (stored) setLocale(stored);
  }, []);

  const choose = useCallback((next: Locale) => {
    setLocale(next);
    saveLocale(next);
  }, []);

  return [locale, choose];
}
