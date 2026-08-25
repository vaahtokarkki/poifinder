/**
 * The copy registry: the one place that turns a locale and a key into words.
 *
 * A missing key falls through to English rather than throwing or rendering a
 * blank. A page with one English sentence in it is a bug worth fixing at
 * leisure; a page with a hole in it, or a build that dies on a half finished
 * translation, is one that has to be fixed before anything ships.
 *
 * Every accessor defaults to the locale the app is currently reading, so the
 * call sites stay `ui().controls.share` and do not each have to be handed one.
 * In Node that is always English — see locale.ts — so the prerender writes the
 * same pages it always did.
 */
import { en } from "./en";
import { de } from "./de";
import { fi } from "./fi";
import { getLocale } from "./locale";
import type { CategoryCopy, Locale, LocaleDeck, UiCopy } from "./types";

/**
 * English is the complete deck and is typed as such; everything else is
 * partial. That asymmetry is the fallback: there is always somewhere to land.
 */
const DECKS: Record<Locale, LocaleDeck> = { en, de, fi };

/** The deck for a locale, or English when that locale has none */
export function deckFor(locale: Locale = getLocale()): LocaleDeck {
  return DECKS[locale] ?? en;
}

/**
 * The copy of one category, by the slug that identifies it.
 *
 * Falls back key by key rather than deck by deck: a locale that has translated
 * twenty of the twenty six categories should serve twenty translated pages,
 * not none. A `ui` only deck — which is how both non English locales ship
 * today — therefore leaves every page reading English, with no special case.
 */
export function categoryCopy(
  slug: string,
  locale: Locale = getLocale()
): CategoryCopy | undefined {
  return deckFor(locale).categories?.[slug] ?? en.categories[slug];
}

/**
 * The strings that are not about one category.
 *
 * Whole section at a time rather than key by key, which is the one place this
 * registry does not fall back gracefully. It is deliberate: a half translated
 * `ui` is a screen in two languages, and that is a worse thing to ship
 * silently than an English one. A deck either owns the chrome or it does not.
 */
export function ui(locale: Locale = getLocale()): UiCopy {
  return deckFor(locale).ui ?? en.ui;
}

/** The complete English deck, for the places that need a total lookup */
export const commonFaqFor = (locale: Locale = getLocale()) =>
  deckFor(locale).commonFaq ?? en.commonFaq;

export { DEFAULT_LOCALE } from "./types";
export type { CategoryCopy, CopyDeck, FaqMessage, Locale, LocaleDeck, Message, PluralMessage, UiCopy } from "./types";
export { interpolate, resolve, selectPlural } from "./format";
export type { Params } from "./format";
export { getLocale, getServerLocale, setLocale, subscribeLocale } from "./locale";
export { LOCALES, isLocale } from "./locales";
export type { LocaleInfo } from "./locales";
