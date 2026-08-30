import { CATEGORIES } from "../constants";
import { categoryCopy, commonFaqFor, getLocale, resolve, ui } from "../copy";
import { en } from "../copy/en";
import type { CategoryCopy, Locale } from "../copy";
import { formatCount } from "./format";

/**
 * The SEO half of a category: the URL slug it lives under and the copy that
 * makes its page worth landing on. The Overpass filters stay in constants.ts,
 * this module only adds what a page needs on top of them.
 */
export type FaqEntry = { q: string; a: string };

/**
 * What can enclose a point and lend it a name.
 *
 * "building" is a building outline, which is what a toilet in a shopping
 * centre or a station stands in. "area" is an open air place drawn as a
 * polygon — a park, a garden, a recreation ground — which is what a picnic
 * table or a drinking fountain stands in. They are separate because they are
 * looked up at different distances: a building is small enough that its
 * boundary is metres from anything inside it, and a park is not.
 */
export type EnclosureKind = "building" | "area";

/**
 * What identifies a category, as against what it says about itself.
 *
 * The words moved to copy/en.ts — the nouns, the intro, the questions — so a
 * second language is a deck rather than a second copy of this list. What stays
 * here is identity and behaviour, which are the same in every language: the
 * slug a page lives at, the slugs it used to live at, the schema.org type it
 * declares, and which enclosing places can lend a name to its unnamed points.
 */
export type CategorySeo = {
  category: CATEGORIES;
  /** URL segment, plural and hyphenated */
  slug: string;
  /** Slugs from earlier sitemaps that must keep resolving */
  aliases?: string[];
  /**
   * Which kinds of enclosing place can name this category's unnamed points.
   *
   * Most of the small fixtures this site maps carry no name at all — 246 of
   * the 279 toilets inside Helsinki's radius, all 224 post boxes — and a list
   * of twenty five rows reading "Public toilet" is the thin content the
   * indexing gate below exists to keep out. What a person needs is not a name
   * OpenStreetMap does not have but the place they would use to say where the
   * thing is, and that place is a separate object: the building around it, or
   * the park it stands in.
   *
   * Measured on Helsinki before this was built: 85 of 246 unnamed toilets are
   * inside a named building, 114 of 516 picnic tables inside a named park, 18
   * of 57 drinking water points likewise. Only 12 of 224 post boxes are inside
   * anything, which is why street furniture is not in this list and no amount
   * of lookup will make a page of post boxes worth indexing.
   *
   * The list is deliberately short and matches the categories that earn clicks
   * rather than the ones that earn impressions — see PAUSED_CATEGORIES in
   * pageMeta.ts for the same reasoning applied from the other end.
   */
  enclosedBy?: readonly EnclosureKind[];
  /**
   * Whether the street a point stands on may name it.
   *
   * The other half of the problem `enclosedBy` solves, for the points it
   * cannot help. A post box stands at a kerb: it is inside no building and no
   * park, so containment has nothing to offer it and the comment above says as
   * much — 12 of Helsinki's 224 post boxes are inside anything at all. But
   * nobody looking for one thinks of it as being inside something. They think
   * of it as being on Mannerheimintie, and that is a named object too, lying
   * beside the point rather than around it.
   *
   * So the same rule with a different geometry: the nearest named highway
   * within STREET_RADIUS names the row, and the page says "on" rather than
   * "in". It is a weaker claim than containment and deliberately so — a street
   * name places a thing to within a block, which is what a person walking to
   * it needs and rather more than the twenty five identical rows it replaces.
   *
   * Dedupe does the rest of the work. Identity in selectPois is the proper
   * noun whichever field it came from, so one street names one row however
   * many post boxes stand along it, and a city earns its five listable rows
   * only by having post boxes on five different streets. That is a much
   * easier bar than five named parks and a much harder one than five points.
   *
   * Set on street furniture only. A toilet is in a building and a picnic table
   * is in a park; naming either by the road outside would be a worse answer
   * than the one containment already gives, which is why this is consulted
   * only after `enclosedBy` has had its turn.
   */
  placedByStreet?: boolean;
  /** schema.org type of a single point, Place when nothing fits better */
  schemaType: string;
};

const CATEGORY_SEO_LIST: CategorySeo[] = [
  {
    category: CATEGORIES.Toilets,
    slug: "toilets",
    enclosedBy: ["building", "area"],
    schemaType: "PublicToilet",
  },
  {
    category: CATEGORIES.DrinkingWater,
    slug: "drinking-water",
    enclosedBy: ["area"],
    schemaType: "Place",
  },
  {
    category: CATEGORIES.Playgrounds,
    slug: "playgrounds",
    schemaType: "Playground",
  },
  {
    category: CATEGORIES.Parking,
    slug: "parking",
    schemaType: "ParkingFacility",
  },
  {
    category: CATEGORIES.ChargingStation,
    slug: "charging-stations",
    schemaType: "Place",
  },
  {
    category: CATEGORIES.GasStation,
    slug: "gas-stations",
    schemaType: "GasStation",
  },
  {
    category: CATEGORIES.Icecream,
    slug: "ice-cream",
    schemaType: "IceCreamShop",
  },
  {
    category: CATEGORIES.DogPark,
    slug: "dog-parks",
    aliases: ["dog-park"],
    schemaType: "Park",
  },
  {
    category: CATEGORIES.Picnic,
    slug: "picnic-spots",
    enclosedBy: ["area"],
    schemaType: "Place",
  },
  {
    category: CATEGORIES.Viewpoint,
    slug: "viewpoints",
    schemaType: "TouristAttraction",
  },
  {
    category: CATEGORIES.Beach,
    slug: "beaches",
    schemaType: "Beach",
  },
  {
    category: CATEGORIES.Atm,
    slug: "atms",
    schemaType: "AutomatedTeller",
  },
  {
    category: CATEGORIES.PostBoxes,
    slug: "post-boxes",
    placedByStreet: true,
    schemaType: "Place",
  },
  {
    category: CATEGORIES.Recycling,
    slug: "recycling",
    enclosedBy: ["building", "area"],
    placedByStreet: true,
    schemaType: "RecyclingCenter",
  },
  {
    category: CATEGORIES.LuggageStorage,
    slug: "luggage-storage",
    schemaType: "Place",
  },
  {
    category: CATEGORIES.Library,
    slug: "libraries",
    schemaType: "Library",
  },
  {
    category: CATEGORIES.OutdoorGym,
    slug: "outdoor-gyms",
    enclosedBy: ["area"],
    schemaType: "ExerciseGym",
  },
  {
    category: CATEGORIES.TentSite,
    slug: "camp-sites",
    schemaType: "Campground",
  },
  {
    category: CATEGORIES.Shelter,
    slug: "shelters",
    enclosedBy: ["area"],
    placedByStreet: true,
    schemaType: "Place",
  },
  {
    category: CATEGORIES.RestArea,
    slug: "rest-areas",
    schemaType: "Place",
  },
  {
    category: CATEGORIES.SanitaryDumpStation,
    slug: "dump-stations",
    schemaType: "Place",
  },
  {
    category: CATEGORIES.PostOffice,
    slug: "post-offices",
    schemaType: "PostOffice",
  },
  {
    category: CATEGORIES.Shower,
    slug: "showers",
    schemaType: "Place",
  },
  {
    category: CATEGORIES.Fireplace,
    slug: "fireplaces",
    schemaType: "Place",
  },
  {
    category: CATEGORIES.BicycleRepair,
    slug: "bicycle-repair",
    // The slug this category had while it was petrol station air. Nothing ever
    // indexed under it — it cleared the gate in no city — but the URLs were
    // prerendered and are cheap to keep resolving
    aliases: ["compressed-air"],
    // Repair stands cluster in parks, on campuses and outside stations, and
    // otherwise stand at a kerb like any other piece of street furniture, so
    // both lookups earn their query here. Almost none carry a name: 0 of 79 in
    // London, 0 of 41 in Stockholm, 2 of 36 in Helsinki
    enclosedBy: ["area"],
    placedByStreet: true,
    schemaType: "Place",
  },
  {
    category: CATEGORIES.Bench,
    slug: "benches",
    schemaType: "Place",
  },
];

/**
 * Which English a page is written in.
 *
 * The copy in this file was written in international English throughout, and
 * for most of the list that is simply the neutral choice. For a handful of
 * categories it is the wrong word: the largest single block of cities here is
 * American, and "Petrol stations in Dallas" is not a British spelling of an
 * American page, it is a page about something Dallas does not have. Search
 * bears this out — "gas station" outdraws "petrol station" on this site by
 * more than twenty to one, and every one of those impressions lands on a page
 * that never says the word.
 *
 * Two variants rather than one per country, split along the Americas. Canada
 * is on the American side because "petrol station in Toronto" and "car park in
 * Vancouver" are both wrong there, even though a Canadian would say washroom
 * before restroom. Mexico and South America are there for the same reason
 * twice over: American English is the English taught across Latin America, and
 * the English speaker reading a page about Mexico City is usually North
 * American. Everywhere else says petrol and toilet, and so does the English
 * that non-anglophone European and Asian cities are read in.
 *
 * The genuinely arguable cases are in Asia and none of them are here: Japan,
 * Korea, Taiwan and Thailand teach American English while Hong Kong, Singapore
 * and Malaysia inherited British. That is a real split and a small one — the
 * English search demand for those cities is a fraction of the American — so it
 * is left alone deliberately rather than guessed at.
 */
export type Vocab = "us" | "intl";

const US_VOCAB_COUNTRIES: ReadonlySet<string> = new Set(["US", "CA", "MX", "BR", "AR", "CL"]);

/** The English a city's pages are written in, from its ISO country code */
export function vocabFor(countryCode: string): Vocab {
  return US_VOCAB_COUNTRIES.has(countryCode.toUpperCase()) ? "us" : "intl";
}

/**
 * International to American, as a closed dictionary rather than per-entry
 * overrides.
 *
 * Every one of these is a word the copy above actually uses — the list was
 * built by grepping the file, not by importing a general en-GB/en-US table —
 * which is what keeps a blind string replacement honest. Applied only to copy:
 * slugs, schema.org types and the CATEGORIES enum never pass through here, so
 * `PublicToilet` stays `PublicToilet` and /helsinki/toilets/ keeps its URL.
 *
 * Order is longest match first where two rules could overlap. No replacement
 * contains a word a later rule matches, so a single pass is enough.
 */
const US_TERMS: readonly (readonly [RegExp, string])[] = [
  [/\boff the lead\b/gi, "off leash"],
  [/\bcash machines\b/gi, "ATMs"],
  [/\bcash machine\b/gi, "ATM"],
  [/\bpetrol stations\b/gi, "gas stations"],
  [/\bpetrol station\b/gi, "gas station"],
  [/\bcar parks\b/gi, "parking lots"],
  [/\bcar park\b/gi, "parking lot"],
  [/\bpost boxes\b/gi, "mailboxes"],
  [/\bpost box\b/gi, "mailbox"],
  [/\bletter boxes\b/gi, "mailboxes"],
  [/\bletter box\b/gi, "mailbox"],
  [/\bcamp sites\b/gi, "campgrounds"],
  [/\bcamp site\b/gi, "campground"],
  [/\bcaravans\b/gi, "RVs"],
  [/\bcaravan\b/gi, "RV"],
  [/\btoilets\b/gi, "restrooms"],
  [/\btoilet\b/gi, "restroom"],
  [/\bcentres\b/gi, "centers"],
  [/\bcentre\b/gi, "center"],
  [/\bkerbside\b/gi, "curbside"],
  [/\bkerb\b/gi, "curb"],
  [/\bneighbourhoods\b/gi, "neighborhoods"],
  [/\bneighbourhood\b/gi, "neighborhood"],
  [/\bmulti storey\b/gi, "multi story"],
  [/\btyres\b/gi, "tires"],
  [/\btyre\b/gi, "tire"],
];

/**
 * Carry the source's capitalisation onto the replacement, so a heading keeps
 * its initial capital: "Petrol stations" becomes "Gas stations" and not
 * "gas stations" sitting where an h1 should be. Only the first letter is
 * considered, which is all the copy here ever varies.
 */
function matchCase(source: string, replacement: string): string {
  const first = source.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** Any piece of category copy, in the English the city reads it in */
export function localize(text: string, vocab: Vocab): string {
  if (vocab !== "us") return text;
  return US_TERMS.reduce(
    (out, [pattern, replacement]) =>
      out.replace(pattern, (match) => matchCase(match, replacement)),
    text
  );
}

/**
 * US_TERMS, but only ever over English.
 *
 * `localize` gates on the vocabulary alone, which was complete while English
 * was the only deck. It is not any more: a German reader looking at Miami has
 * vocab "us" and a German string, and running an en-GB to en-US table over
 * German is at best a no-op and at worst a word replaced for the wrong reason.
 * The transform is a fact about English spelling, so it is gated on English.
 */
function localizeFor(text: string, vocab: Vocab, locale: Locale): string {
  return locale === "en" ? localize(text, vocab) : text;
}

/**
 * The copy of a category, in a locale, or English where that locale has not
 * translated it yet.
 *
 * Throws when no deck has it at all, English included. That is a category
 * added to the list above and never written about, which is a mistake to catch
 * in the build rather than serve as a page with a hole in it.
 */
function copyOf(entry: CategorySeo, locale: Locale): CategoryCopy {
  const copy = categoryCopy(entry.slug, locale);
  if (!copy) throw new Error(`No copy deck entry for category "${entry.slug}"`);
  return copy;
}

/** The plural noun as it reads mid sentence, in the city's English */
export function categoryPlural(
  entry: CategorySeo,
  vocab: Vocab,
  locale: Locale = getLocale()
): string {
  return localizeFor(copyOf(entry, locale).plural, vocab, locale);
}

/** The sentence case heading noun, in the city's English */
export function categoryHeading(
  entry: CategorySeo,
  vocab: Vocab,
  locale: Locale = getLocale()
): string {
  return localizeFor(copyOf(entry, locale).heading, vocab, locale);
}

/**
 * The singular noun, in the city's English.
 *
 * Every category has one now, because the meta description needs one whenever
 * a route holds a single point — "1 public shower in Adelaide", not "1 public
 * showers". US_TERMS carries both numbers of every word it replaces, so
 * "public toilet" localises as cleanly as "public toilets" does.
 */
export function categorySingular(
  entry: CategorySeo,
  vocab: Vocab,
  locale: Locale = getLocale()
): string {
  return localizeFor(copyOf(entry, locale).singular, vocab, locale);
}

/** The noun for a count: singular at one, plural at everything else */
export function categoryNoun(
  entry: CategorySeo,
  count: number,
  vocab: Vocab,
  locale: Locale = getLocale()
): string {
  return count === 1
    ? categorySingular(entry, vocab, locale)
    : categoryPlural(entry, vocab, locale);
}

/** The paragraph above the list, with the count and city filled in */
/**
 * The city as a template can ask for it: named on its own, or in the form that
 * means "in this city". English and German only ever want the first; Finnish
 * wants the second nearly everywhere. Both are always supplied, and the
 * template picks — which is what keeps the deck in charge of its own grammar.
 */
export type CityNames = { city: string; cityIn: string };

export function categoryIntro(
  entry: CategorySeo,
  names: CityNames,
  count: number,
  vocab: Vocab,
  locale: Locale = getLocale()
): string {
  const text = resolve(
    copyOf(entry, locale).intro,
    locale,
    { ...names, count: formatCount(count) },
    count
  );
  return localizeFor(text, vocab, locale);
}

/** The category's own questions, with the count and city filled in */
export function categoryFaq(
  entry: CategorySeo,
  names: CityNames,
  count: number,
  vocab: Vocab,
  locale: Locale = getLocale()
): FaqEntry[] {
  const params = { ...names, count: formatCount(count) };
  return copyOf(entry, locale).faq.map(({ q, a }) => ({
    q: localizeFor(resolve(q, locale, params, count), vocab, locale),
    a: localizeFor(resolve(a, locale, params, count), vocab, locale),
  }));
}

/**
 * The name the map's own controls use for a category.
 *
 * Comes from the `ui` deck rather than the category's own copy, because it is
 * chrome: it shows in the picker, on the preset chips and in a marker popup,
 * never in a prerendered paragraph. That is what lets a locale translate the
 * app without translating 3,800 words of page copy first.
 *
 * Takes the enum rather than a CategorySeo because every caller is map side
 * and holds the enum, not the SEO entry.
 */
export function categoryDisplay(
  category: CATEGORIES,
  locale: Locale = getLocale()
): string {
  const entry = CATEGORY_SEO_BY_CATEGORY[category];
  if (!entry) return "";
  return ui(locale).categoryNames[entry.slug] ?? en.ui.categoryNames[entry.slug] ?? "";
}

export const CATEGORY_SEO: CategorySeo[] = CATEGORY_SEO_LIST;

/** Every category page slug, in the order the pages should be linked */
export const CATEGORY_SEO_BY_SLUG: Record<string, CategorySeo> = Object.fromEntries(
  CATEGORY_SEO_LIST.flatMap((entry) => [
    [entry.slug, entry] as const,
    ...(entry.aliases ?? []).map((alias) => [alias, entry] as const),
  ])
);

export const CATEGORY_SEO_BY_CATEGORY: Partial<Record<CATEGORIES, CategorySeo>> =
  Object.fromEntries(CATEGORY_SEO_LIST.map((entry) => [entry.category, entry]));

/**
 * The category of a URL slug. Accepts the aliases too, so links that were
 * indexed under the first sitemap keep working.
 */
export function findCategorySeo(slug: string): CategorySeo | undefined {
  return CATEGORY_SEO_BY_SLUG[slug.toLowerCase()];
}

/**
 * Questions that hold for every category, appended after the specific ones.
 * They carry the OpenStreetMap provenance, which is the honest answer to "how
 * do you know this" and also the reason the coverage is what it is.
 */
export function commonFaq(
  names: CityNames,
  plural: string,
  locale: Locale = getLocale()
): FaqEntry[] {
  const params = { ...names, plural };
  return commonFaqFor(locale).map(({ q, a }) => ({
    q: resolve(q, locale, params),
    a: resolve(a, locale, params),
  }));
}
