/**
 * The shape of a copy deck.
 *
 * Every user facing string lives in a deck rather than inline at the point it
 * is rendered, so that adding a language is a data change and never a code
 * change. English is the only deck today; the types are written for the ones
 * that follow it.
 *
 * Copy only. Slugs, schema.org types and the CATEGORIES enum are identity, not
 * language, and stay where they are — the same line `localize()` already drew
 * and for the same reason: /helsinki/toilets keeps its URL in every language.
 *
 * Nothing here may touch `window` or `navigator`. The prerender loads these
 * modules in Node through ssrLoadModule, so a browser global would break the
 * build rather than a page.
 */

/** The locales with a deck of their own. English is the fallback for all of them */
export type Locale = "en";

export const DEFAULT_LOCALE: Locale = "en";

/**
 * The plural categories `Intl.PluralRules` selects between, spelled out rather
 * than taken from `Intl.LDMLPluralRule` so the deck does not depend on which
 * `lib` a consumer compiles with.
 *
 * English uses two of these, Finnish two, Polish three, Arabic six. A deck
 * supplies the ones its language actually has and `other` covers the rest.
 */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * A message whose wording changes with a count.
 *
 * The whole sentence is stored per plural category, not just the noun. English
 * alone needs it — "1 public shower is mapped" moves the verb as well as the
 * noun — and languages with case systems rewrite more of the sentence again.
 * `other` is required because every language has it and it is what an
 * unmatched count falls back to.
 */
export type PluralMessage = Partial<Record<PluralCategory, string>> & {
  other: string;
};

/** A message that is either fixed, or selected by a count */
export type Message = string | PluralMessage;

export type FaqMessage = { q: Message; a: Message };

/**
 * The copy of one category. `slug`, `aliases` and `schemaType` are deliberately
 * absent: they identify the category rather than describe it, and are keyed by
 * slug from CATEGORY_SEO instead.
 */
export type CategoryCopy = {
  /** Plural noun as it reads mid sentence: "public toilets in Helsinki" */
  plural: string;
  /** Singular noun, for the routes that hold exactly one point */
  singular: string;
  /** Sentence case heading noun */
  heading: string;
  /**
   * The name the map's own controls use, which is not always the heading: the
   * picker says "Toilets" where a page heading says "Public toilets", and
   * "Beach & swimming" where the page says "Beaches and swimming". Short
   * enough for a chip, in other words
   */
  display: string;
  /** The paragraph above the list */
  intro: PluralMessage;
  /** Questions people actually search for, answered specifically */
  faq: FaqMessage[];
};

/**
 * Everything the app says that is not about one category.
 *
 * Grouped by where it is read rather than by which component renders it: a
 * translator works through a screen at a time, and two components sharing a
 * sentence is exactly the case that should not produce two translations.
 *
 * Prose with a link in the middle of it is stored as the pieces either side,
 * because the anchor is markup and markup does not belong in a deck. The
 * component keeps the `<a>` and asks for the words around it.
 */
export type UiCopy = {
  /** Names of the category groups in the picker, keyed by group id */
  groups: Record<string, string>;
  /** Names of the presets, keyed by preset id */
  presets: Record<string, string>;
  /** The info sheet: what the app is, and how to work it */
  sheet: {
    summary: string;
    howItWorksHeading: string;
    steps: { title: string; text: string }[];
    presetsHeading: string;
    presetsNote: string;
    goodToKnowHeading: string;
    tips: string[];
    creditsSourceBefore: string;
    creditsSourceLink: string;
    creditsSourceAfter: string;
    creditsCodeBefore: string;
    creditsCodeLink: string;
    creditsCodeAfter: string;
  };
  /** The page sections, which the prerender writes as well as the sheet */
  page: {
    homeTitle: string;
    browseCitiesBefore: string;
    browseCitiesAfter: string;
    citiesTitle: string;
    cityUnit: PluralMessage;
    countryUnit: PluralMessage;
    citiesSummaryAfter: string;
    cityTitle: string;
    cityCategoriesHeading: string;
    categoryUnit: PluralMessage;
    citySummaryAfter: string;
    mapped: string;
    namedHeading: string;
    individualHeading: string;
    showingSome: string;
    mapHasAll: string;
    includingUnplaced: string;
    questionsHeading: string;
    allPointsIn: string;
    allCities: string;
    sheetFreshnessBefore: string;
    sheetFreshnessAfter: string;
    pageFreshnessBefore: string;
    pageFreshnessLink: string;
    pageFreshnessMiddle: string;
    pageFreshnessAfter: string;
  };
  /** Labels on a point, from the tags a survey recorded */
  poi: {
    stepFree: string;
    partlyStepFree: string;
    free: string;
    fee: string;
    unnamedPlace: string;
  };
  /** The map's controls, and what a screen reader is told about them */
  controls: {
    about: string;
    closeSearch: string;
    selectCategories: string;
    zoomInHint: string;
    routeStart: string;
    routeEnd: string;
    chooseCategories: string;
    clearAll: string;
    presetTitle: string;
  };
  /** What the app says when something has happened */
  notices: {
    fetchFailed: string;
    linkCopied: string;
    copyFailed: string;
    shareRouteMissing: string;
    routeFailed: string;
    fallbackTitle: string;
    fallbackSubtitle: string;
  };
};

export type CopyDeck = {
  /** Keyed by the category's URL slug, which is its stable identity */
  categories: Record<string, CategoryCopy>;
  /** Questions that hold for every category, appended after the specific ones */
  commonFaq: FaqMessage[];
  ui: UiCopy;
};
