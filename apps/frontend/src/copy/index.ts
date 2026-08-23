/**
 * The copy registry: the one place that turns a locale and a key into words.
 *
 * A missing key falls through to English rather than throwing or rendering a
 * blank. A page with one English sentence in it is a bug worth fixing at
 * leisure; a page with a hole in it, or a build that dies on a half finished
 * translation, is one that has to be fixed before anything ships.
 */
import { en } from "./en";
import { DEFAULT_LOCALE } from "./types";
import type { CategoryCopy, CopyDeck, Locale, UiCopy } from "./types";

const DECKS: Record<Locale, CopyDeck> = { en };

/** The deck for a locale, or English when that locale has none */
export function deckFor(locale: Locale = DEFAULT_LOCALE): CopyDeck {
  return DECKS[locale] ?? DECKS[DEFAULT_LOCALE];
}

/**
 * The copy of one category, by the slug that identifies it.
 *
 * Falls back key by key rather than deck by deck: a locale that has translated
 * twenty of the twenty six categories should serve twenty translated pages,
 * not none.
 */
export function categoryCopy(
  slug: string,
  locale: Locale = DEFAULT_LOCALE
): CategoryCopy | undefined {
  return deckFor(locale).categories[slug] ?? deckFor(DEFAULT_LOCALE).categories[slug];
}

/**
 * The strings that are not about one category.
 *
 * Whole section at a time rather than key by key, which is the one place this
 * registry does not fall back gracefully. It is deliberate while there is a
 * single deck: a half translated `ui` is a screen in two languages, and that
 * is a worse thing to ship silently than an English one. Revisit when a second
 * deck lands and the shape of a partial translation is a real question.
 */
export function ui(locale: Locale = DEFAULT_LOCALE): UiCopy {
  return deckFor(locale).ui;
}

export { DEFAULT_LOCALE } from "./types";
export type { UiCopy } from "./types";
export type { CategoryCopy, CopyDeck, FaqMessage, Locale, Message, PluralMessage } from "./types";
export { interpolate, resolve, selectPlural } from "./format";
export type { Params } from "./format";
