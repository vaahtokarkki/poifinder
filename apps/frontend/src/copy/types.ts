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
export type Locale = "en" | "de" | "fi";

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
  /**
   * What the map's controls call each category, keyed by category slug.
   *
   * In `ui` rather than in `categories` because these are chrome: they appear
   * in the picker, on the preset chips and in the marker popups, and never in
   * a prerendered paragraph. A locale that translates the app but not the
   * pages still needs them, and having them on the far side of that line left
   * a German picker reading "Playgrounds" next to "Familie".
   *
   * Not the same string as the page heading, either: the picker says "Toilets"
   * where a page says "Public toilets", and "Beach & swimming" where the page
   * says "Beaches and swimming". Short enough for a chip.
   */
  categoryNames: Record<string, string>;
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
    nearbyCities: string;
    /**
     * "This page in German", written in German — each deck supplies the line
     * for its own language, the way the selector shows endonyms. A reader
     * looking for their language has to be able to read the offer, and they
     * cannot necessarily read the page it sits on.
     */
    viewInThisLanguage: string;
    /**
     * The <title>, <meta description> and <h1> of a category page.
     *
     * Templates rather than assembled in pageMeta.ts, because the parts a
     * sentence is glued together from are not the same in every language and
     * the glue is words. `{noun}` arrives already agreeing with the count.
     */
    categoryTitle: string;
    categoryDescription: string;
    categoryHeading: string;
    /** Headings of the internal link blocks at the foot of a category page */
    moreInCity: string;
    nearbyHeading: string;
    /** The sheet's disclosure summary, which is the control a reader taps */
    cityDisclosure: string;
    categoryDisclosure: string;
    /** "Named public toilets in Helsinki" — the list section's own heading */
    listHeading: string;
    /** The hub summary sentence, and the hub title when it has nothing to list */
    citySummary: string;
    cityFallbackTitle: string;
    cityDescription: string;
    cityDescriptionMore: string;
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
    /** A row named by the building or park it stands in, not by itself */
    inPlace: string;
    /** A point named by the street it stands on rather than the place around it */
    onStreet: string;
    /** The line shown instead of a popup, when a point carries nothing to say */
    noExtraDetails: string;
    address: string;
    fromBuilding: string;
    lastChecked: string;
    lastEdited: string;
    /**
     * The link under those two dates, to the point open in OpenStreetMap's
     * editor. Names both the object and where it is being opened: a popup can
     * carry this and {@link editBuildingInOsm} at once, and a reader who has
     * never heard of OSM should learn from the words where they are being sent
     */
    editInOsm: string;
    /**
     * Modelled traffic noise, shown only when the tiles that carry it are
     * configured and loaded. See src/map/noiseTiles.ts and apps/noise.
     *
     * `modelled` is not a footnote to be trimmed. The three levels come from
     * road classes and distance, not from a microphone, and the words have to
     * carry that or the reader takes a guess for a measurement.
     */
    noise: {
      label: string;
      quiet: string;
      moderate: string;
      noisy: string;
      modelled: string;
      /** The link under the caption, which opens the explanation */
      about: string;
      /**
       * The explanation itself. It exists because three coloured words on a
       * map look like a measurement, and this one is not: `aboutLimit` is the
       * part that has to survive any edit, since it is the sentence that stops
       * a reader trusting a green polygon in a city centre.
       */
      aboutTitle: string;
      aboutIntro: string;
      aboutBandsHeading: string;
      aboutQuiet: string;
      aboutModerate: string;
      aboutNoisy: string;
      aboutLimit: string;
      aboutSource: string;
      aboutClose: string;
    };
    /**
     * Opening hours syntax rendered as words. Keys are the OpenStreetMap
     * codes, which are the same in every language; the values are not.
     */
    hours: {
      Mo: string;
      Tu: string;
      We: string;
      Th: string;
      Fr: string;
      Sa: string;
      Su: string;
      PH: string;
      SH: string;
      /** What `off` is written as */
      closed: string;
    };
    /**
     * How long ago a surveyor last confirmed the point. Plural forms, because
     * "2 months ago" and "1 month ago" do not share a sentence in most
     * languages and share even less in the ones with case systems.
     */
    age: {
      withinMonth: string;
      months: PluralMessage;
      years: PluralMessage;
    };
    /**
     * Labels for the OpenStreetMap keys whose tag name is not what a reader
     * would call the thing.
     *
     * Deliberately not every key. OSM has tens of thousands in use and no deck
     * can hold them; what this holds is the short list the popup already had
     * an opinion about, and anything absent falls through to the key itself
     * with its punctuation cleaned up. See labelFor in poiPopup.ts.
     */
    keyLabels: Record<string, string>;
    /**
     * The closed set of OpenStreetMap tag values, translated.
     *
     * Values matter more than keys and there are far fewer of them: `yes`,
     * `no` and `limited` answer most of what a popup is asked, and the same
     * dozen words serve every key. Anything absent falls through to the value
     * as written, cleaned of its underscores — which is the right answer for
     * the open half of the vocabulary (operators, brands, materials) and the
     * only possible one.
     *
     * Keys are the raw OSM value, lower case, as it arrives in the tag.
     */
    values: Record<string, string>;
    inThisBuilding: string;
    /** Reads "In {building}" when the building has a name of its own */
    inBuilding: string;
    buildingLastChecked: string;
    buildingLastEdited: string;
    /** As {@link editInOsm}, for the building rather than the point */
    editBuildingInOsm: string;
  };
  /** The translate action on a prose tag value, and what it says when it fails */
  translate: {
    action: string;
    pending: string;
    showOriginal: string;
    showTranslation: string;
    sameLanguage: string;
    quota: string;
    failed: string;
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
    showMapTools: string;
    hideMapTools: string;
    /**
     * The layers panel, and the button in the map's lower left corner that
     * opens it: which basemap is drawn, and what is drawn over it.
     *
     * The panel is only rendered when VITE_NOISE_TILES_URL is set — with no
     * overlay to switch there is nothing in it to choose — but the strings are
     * not optional, because the deck is not.
     */
    layers: {
      /** The button, which is all a screen reader has to go on before it opens */
      open: string;
      title: string;
      close: string;
      /** The upper section: which map is drawn underneath everything */
      mapType: string;
      /** The one basemap there is, named rather than left blank */
      basemapDefault: string;
      /** The lower section: overlays, which are drawn over that map */
      mapDetails: string;
      /** The modelled traffic noise wash. Off until it is asked for */
      trafficNoise: string;
      /**
       * Said under that tile when the tiles cover no part of where the map is
       * looking. Only when we know it — a layer still loading says nothing
       */
      noCoverage: string;
    };
    myLocation: string;
    share: string;
    toggleSearch: string;
    directions: string;
    /** The language selector itself, which has to be reachable in any language */
    language: string;
    searchPlaceholder: string;
    /** The route panel, which is its own small screen inside the map */
    routeHeading: string;
    routeSubmit: string;
    routeReset: string;
    /** Reads "Displaying points along route from {start} to {end}" */
    routeActive: string;
    /** Stands in for the start when the route begins where the visitor is */
    routeYourLocation: string;
    typeLocation: string;
    dragDownToClose: string;
    dragUpForMore: string;
    /** The indicator under the preset chips while a search is running */
    loading: string;
    /** The mirror being tried, as "2/4". Shown only once one has failed */
    loadingServer: string;
    /** What that counter means, for the title and for a screen reader */
    loadingFallback: string;
    /** The same pill, while the device has yet to report a position */
    gpsWaiting: string;
    /** What the wait is for, for the title and for a screen reader */
    gpsWaitingHint: string;
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

/**
 * A deck that is not English.
 *
 * Every section is optional, because the two halves of this site are
 * translated for different reasons and on different schedules. The app chrome
 * is ~500 words and pays off in every city at once; a `categories` deck is
 * ~3,800 words and only pays off in the cities that speak the language. A
 * locale is expected to arrive as `ui` alone and grow the page copy later, so
 * that has to be a deck that typechecks rather than a special case.
 *
 * `ui` is all or nothing — see the note on `ui()` in index.ts. `categories`
 * falls back key by key, so twenty translated categories serve twenty
 * translated pages and the other six read English.
 */
export type LocaleDeck = {
  /**
   * `Partial<CategoryCopy>` on purpose: a locale may translate a category's
   * nouns without its prose. The nouns are 78 short strings and they are what
   * shows in every title, heading and link — "Yleiset käymälät Helsingissä" —
   * while the intro and the FAQ are 3,700 words behind a disclosure. Falling
   * back field by field lets the visible half be translated first.
   */
  categories?: Record<string, Partial<CategoryCopy>>;
  commonFaq?: FaqMessage[];
  ui?: UiCopy;
};
