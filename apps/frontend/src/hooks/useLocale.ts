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
import { DEFAULT_LOCALE, getLocale, getServerLocale, setLocale, subscribeLocale } from "../copy";
import type { Locale } from "../copy";
import { loadLocale, saveLocale } from "../utils/localeStorage";
import { parseCategorySlugFromPath, parseCitySlugFromPath, parseLocaleFromPath } from "../utils";
import { findCity } from "../seo/cities";
import { categoryPath, cityPath, linkLocaleFor, linkLocaleForRoute } from "../seo/pageMeta";

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

  // The URL wins over the stored preference, and both are applied after mount
  // rather than at import, so the first render matches the prerendered markup.
  //
  // The URL has to win: /de/berlin/toilets is a German page, it was written as
  // one, its canonical and hreflang say so, and a stored preference for English
  // must not leave the markup saying `lang="de"` while the words are English.
  // A visitor who follows a German link is reading German whatever they picked
  // somewhere else — and picking again from the selector still moves them.
  useEffect(() => {
    const fromPath = parseLocaleFromPath();
    if (fromPath !== DEFAULT_LOCALE) {
      setLocale(fromPath);

      // Arriving is the same rule as switching: the city decides which tree a
      // URL belongs in. /de/helsinki/toilets is not a page — Helsinki has no
      // German tree — and on Cloudflare it is a 404 whose body still boots
      // this app. Rather than render a German Helsinki at a URL nothing points
      // at and nothing canonicalises, move to the page that does exist and
      // keep the language, which is the in-place swap sitting on English.
      //
      // Remembered on the way, because arriving at /de/ is as clear a stated
      // preference as picking German from the menu.
      const citySlug = parseCitySlugFromPath();
      const city = citySlug ? findCity(citySlug) : undefined;
      const categorySlug = parseCategorySlugFromPath();
      // The route's locales, not the city's. Berlin has a French toilets page
      // and no French benches page, so /fr/berlin/benches/ has to redirect
      // even though Berlin does carry a French tree
      const available = city
        ? categorySlug
          ? linkLocaleForRoute(city, categorySlug, fromPath)
          : linkLocaleFor(city, fromPath)
        : fromPath;
      if (city && available !== fromPath) {
        saveLocale(fromPath);
        // replace, not assign: the URL we are leaving was never a page, so it
        // has no business in the visitor's back button
        window.location.replace(
          categorySlug
            ? categoryPath(city.slug, categorySlug, DEFAULT_LOCALE)
            : cityPath(city.slug, DEFAULT_LOCALE)
        );
      }
      return;
    }
    const stored = loadLocale();
    if (stored) setLocale(stored);
  }, []);

  /**
   * Keep the document's own language claim on the visible words.
   *
   * On a /de/ page this is already right and stays. What it is for is the
   * in-place swap: German words under an English canonical, where without it a
   * screen reader reads German with an English voice and the browser hyphenates
   * for the wrong language. The canonical is deliberately left alone — the page
   * still *is* the English one, it is being read in German by one visitor.
   *
   * Googlebot renders as en-US and never triggers a swap, so what it sees is
   * the served markup either way.
   */
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const choose = useCallback((next: Locale) => {
    setLocale(next);
    saveLocale(next);
  }, []);

  return [locale, choose];
}
