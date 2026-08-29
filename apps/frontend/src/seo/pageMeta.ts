import { findCity, nearbyCities } from "./cities";
import type { City } from "./cities";
import {
  CATEGORY_SEO,
  categoryFaq,
  categoryHeading,
  categoryIntro,
  categoryNoun,
  categoryPlural,
  categorySingular,
  commonFaq,
  findCategorySeo,
  localize,
  vocabFor,
} from "./categories";
import type { CityNames, CategorySeo, FaqEntry, Vocab } from "./categories";
import type { CategoryPageData, PoiEntry } from "./pageData";
import { formatCount } from "./format";
import { DEFAULT_LOCALE, getLocale, interpolate, ui } from "../copy";
import type { Locale } from "../copy";
import { CITIES_SLUG } from "../utils";

export const SITE_URL = "https://wayside.cc";
export const SITE_NAME = "Wayside";

/**
 * The social card, shared by every page.
 *
 * One image for the whole site rather than one per route. A card is read at a
 * glance in a feed, where what it has to answer is "what is this thing", and
 * the answer is the same on all 1,705 pages: a map, dense with the small
 * points nothing else plots. A per-route card would be a different crop of the
 * same screenshot, which is a build step and a megabyte apiece to say the same
 * sentence.
 *
 * JPEG rather than PNG. It is a photographic raster — a map screenshot with
 * thousands of distinct colours — so the palette PNG is good at does not
 * exist here: the same crop is 1.25 MB as a PNG and 180 kB at quality 86,
 * with nothing visible between them at the size a card is ever rendered.
 *
 * 1200x630 is the size Twitter's summary_large_image and Facebook both want,
 * and the source screenshot was 2049x1084 — near enough the same 1.9 ratio
 * that fitting it cost five pixels of height off the middle.
 */
export const OG_IMAGE = {
  url: `${SITE_URL}/og.jpg`,
  type: "image/jpeg",
  width: 1200,
  height: 630,
  alt: `A ${SITE_NAME} map of central Berlin with every playground and public toilet marked`,
} as const;

/**
 * What a route needs before it is worth putting in the index.
 *
 * Two thresholds rather than one, because they measure different things. The
 * count is how much the map has to show; the named points are the only part of
 * the page that is not a template. Everything else — the intro, all seven FAQ
 * answers, the link groups — is generated from the city name and a number, so a
 * route with a large count and no named points renders three hundred words that
 * differ from another city's only in the proper nouns. One of those is a page.
 * Three thousand is a thin-content pattern, and the risk is not that they fail
 * to rank but that they set how the whole directory is classified.
 *
 * Helsinki post boxes is the case that prompted this: 224 mapped points, none
 * of them named, published on the strength of the count alone.
 *
 * "Named" is a shorthand the second threshold has outgrown. What it counts is
 * rows the list can tell apart, which since the enclosing place lookup means
 * points with a name of their own plus points a named building or park can
 * place — "Public toilet in Tennispalatsi" is as much this page's own content
 * as a name in OpenStreetMap would have been, and rather more use. The measure
 * is unchanged: how much of the page is not a template. See PoiEntry in
 * pageData.ts, and `enclosedBy` in categories.ts.
 *
 * Post boxes still fail it, and should: 12 of Helsinki's 224 stand inside
 * anything at all.
 *
 * A route that clears neither is still written as a real page — see the
 * prerender — it is simply marked noindex and kept out of the sitemap and the
 * internal links.
 */
export const MIN_POIS_FOR_PAGE = 8;

/** Distinguishable rows a route needs before the list is substantive enough to index */
export const MIN_NAMED_POIS_FOR_PAGE = 5;

/**
 * Categories written as real pages but deliberately kept out of the index.
 *
 * Not a quality judgement about the data — these pages are as accurate as any
 * other. It is a judgement about who answers the query. Search Console, over
 * the first week the prerendered pages were live (14–20 August 2026):
 *
 *   parking      148 pages    103 impressions   0 clicks
 *   libraries    147 pages    137 impressions   0 clicks
 *   playgrounds  141 pages     29 impressions   0 clicks
 *   ice-cream    139 pages    178 impressions   0 clicks
 *   viewpoints   108 pages     49 impressions   0 clicks
 *
 * 683 pages, 40% of everything indexable, 496 impressions and no clicks at all
 * between them. Every one of these is a category Google Maps and the chains
 * themselves already answer well, and a directory page is not going to take
 * that query off them. Meanwhile 280 URLs sat in "Crawled — currently not
 * indexed", which is the crawler saying it has read more of this site than it
 * wants to keep.
 *
 * So the point is not to punish the pages, it is to spend the crawl somewhere
 * it converts: drinking water at 2.7% CTR, recycling at 1.4%, shelters at
 * 5.9%, against gas stations at 0.01% on 9,556 impressions. The categories
 * that earn clicks are the ones nothing else bothers to map.
 *
 * This is an experiment with a date on it. Paused categories keep their URLs
 * and their content — a visitor who lands on one gets the whole page, and the
 * app still renders the sheet — they are simply noindex, absent from every
 * sitemap, and unlinked from the hubs and the neighbour blocks, which falls
 * out of routing them through isIndexable below. Emptying this set puts all
 * 683 back, and the only cost of having been wrong is the time they spend
 * being recrawled.
 *
 * Started 2026-08-22. Read the numbers again in October: what to look for is
 * whether the categories left in the index get crawled and indexed faster than
 * they were, not whether total impressions went up — they will fall, because
 * the paused categories were carrying impressions that never became visits.
 *
 * The second wave below landed a week into that, before the first had been
 * read, so October cannot separate them. That is a deliberate trade: both
 * waves push the same direction, the crawl budget they free is worth more
 * spent now than the clean attribution is worth in six weeks, and either is
 * undone by deleting a line. What October can still answer is the question
 * that matters — whether the categories left behind index faster.
 *
 * Second wave, 2026-08-29, on nine days of data from the 923 pages that were
 * indexed on the 18th: 49,003 impressions, 64 clicks, 0.13% CTR.
 *
 * gas-stations was the bet named above, and the fuller numbers settle it. 92
 * pages, 30,152 impressions — 61% of everything the site was shown for — and
 * six clicks, at an average position of 7.8. That is not a page that failed to
 * rank, it is a page that ranked and was never the answer: "gas station near
 * me" alone is 22,509 impressions at position 7.4 for three clicks, because
 * position 7 on a near-me query is below the map pack, below the ads and below
 * the fold. No amount of position fixes it. The same shape, weaker, is why
 * dog-parks and atms stay on the watch list rather than in this set — 0.09%
 * and 0.18%, but 4 and 5 clicks are not nothing on 42 and 52 pages.
 *
 * The other three are the opposite failure. charging-stations averages
 * position 65 over 78 pages, luggage-storage 62 over 12 — "luggage storage
 * barcelona" is position 81 — and picnic-spots draws 41 impressions a page for
 * zero clicks across 28 of them. They do not rank at all, and the queries they
 * are aimed at belong to booking sites and charger networks.
 *
 * What is left is the categories nothing else maps, and they are the ones that
 * convert: drinking water 2.08% CTR, recycling 1.22%, post boxes 1.04%,
 * toilets 0.43%, shelters 7.14% on a small base. Measured per page, which is
 * the only way to compare a category of 92 against one of 9, drinking water
 * earns six times what gas stations do while ranking ten positions worse.
 *
 * The dividing line is not how well a category is mapped, it is whether the
 * thing has a Google Maps profile. A petrol station, a dog park, an ATM and an
 * ice cream shop are destinations Google already answers with a map pack. A
 * drinking fountain, a recycling container, a bus shelter and a post box are
 * street furniture nobody has bothered to list, which is exactly where a page
 * built from OpenStreetMap is the best answer on the results page.
 *
 * This wave removes 318 of the 1,216 indexable routes, gas-stations 148 of
 * them. Expect total impressions to fall by roughly two thirds and clicks by
 * under a tenth.
 */
export const PAUSED_CATEGORIES: ReadonlySet<string> = new Set([
  "parking",
  "libraries",
  "playgrounds",
  "ice-cream",
  "viewpoints",
  // Second wave, 2026-08-29 — see above
  "gas-stations",
  "charging-stations",
  "luggage-storage",
  "picnic-spots",
]);

/**
 * Whether a route has enough behind it to be worth indexing.
 *
 * `namedCount` is the number of rows the list can show, which since the
 * enclosing place lookup means named points plus points a building or a park
 * can place — one row per distinct identity either way, so it still measures
 * what it always did: how much of this page is not a template.
 */
export function isIndexable(
  categorySlug: string,
  count: number,
  namedCount: number
): boolean {
  if (PAUSED_CATEGORIES.has(categorySlug)) return false;
  return count >= MIN_POIS_FOR_PAGE && namedCount >= MIN_NAMED_POIS_FOR_PAGE;
}

/** How many named points the list renders. Enough to be substantive, not a dump */
export const MAX_LISTED_POIS = 25;

export type Route = {
  city: City;
  categorySeo: CategorySeo;
};

/**
 * Every URL this file builds ends in a slash, because that is the one Cloudflare
 * serves. A page written to `dist/helsinki/toilets/index.html` is served at
 * `/helsinki/toilets/`, and the un-slashed form is a 307 to it. Claiming the
 * un-slashed form as canonical therefore pointed every page's canonical, og:url,
 * breadcrumb and sitemap entry at a redirect: resolvable, but a wasted hop per
 * URL and a standing source of "Alternate page with proper canonical tag".
 *
 * The app is indifferent — `pathSegments` in utils.ts trims slashes off both
 * ends before reading the city and category out of the path.
 */
/**
 * The prefix a locale's tree lives under. English has none: it is the tree
 * every city has, and moving 1,216 indexed URLs under /en/ would cost the
 * whole index to gain a symmetry nobody searches for.
 */
export function localePrefix(locale: Locale = getLocale()): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

export function categoryPath(
  citySlug: string,
  categorySlug: string,
  locale: Locale = getLocale()
): string {
  return `${localePrefix(locale)}/${citySlug}/${categorySlug}/`;
}

export function cityPath(citySlug: string, locale: Locale = getLocale()): string {
  return `${localePrefix(locale)}/${citySlug}/`;
}

export function categoryUrl(
  citySlug: string,
  categorySlug: string,
  locale: Locale = getLocale()
): string {
  return `${SITE_URL}${categoryPath(citySlug, categorySlug, locale)}`;
}

export function cityUrl(citySlug: string, locale: Locale = getLocale()): string {
  return `${SITE_URL}${cityPath(citySlug, locale)}`;
}

/**
 * The city's name in the locale being written, falling back to the English
 * form. "Öffentliche Toiletten in München", never "in Munich".
 */
export function cityName(city: City, locale: Locale = getLocale()): string {
  const entry = city.names?.[locale];
  if (!entry) return city.name;
  return typeof entry === "string" ? entry : entry.name;
}

/**
 * The city in the form that means "in this city".
 *
 * Falls back to the plain name, which is right for every locale that does not
 * inflect place names: their templates spell the relation with a preposition
 * and never ask for this. A Finnish template asks for `{cityIn}` and gets
 * "Helsingissä"; an English one asks for `{city}` and gets "Helsinki".
 */
export function cityIn(city: City, locale: Locale = getLocale()): string {
  const entry = city.names?.[locale];
  if (!entry) return city.name;
  return typeof entry === "string" ? entry : entry.inCity;
}

/** Both forms of a city's name, for handing to a template */
export function cityNames(city: City, locale: Locale = getLocale()): CityNames {
  return { city: cityName(city, locale), cityIn: cityIn(city, locale) };
}

/**
 * The locales a city has a page in, English first.
 *
 * This is the hreflang cluster and it is deliberately tiny: a city's own
 * language and English, so two or three URLs rather than one per locale the
 * site supports. Alternates are the same content in another language, which
 * is why they never point across cities — /madrid/ and /mexico-city/ are both
 * Spanish-market pages and are not alternates of each other.
 */
export function localesForCity(city: City): Locale[] {
  return [DEFAULT_LOCALE, ...(city.langs ?? [])];
}

/**
 * The locale a link to another city should use.
 *
 * A page in German links to Berlin in German and to Aarhus in English,
 * because Aarhus has no German tree and `/de/aarhus/toilets/` is a file that
 * was never written. Cross-city links are the one place the current locale is
 * the wrong default: what decides the URL is what the city on the other end
 * actually has.
 */
export function linkLocaleFor(target: City, preferred: Locale = getLocale()): Locale {
  return localesForCity(target).includes(preferred) ? preferred : DEFAULT_LOCALE;
}

/** hreflang entries for one route, including the self reference and x-default */
export function alternatesForCategory(
  city: City,
  categorySlug: string
): { hreflang: string; href: string }[] {
  const locales = localesForCity(city);
  if (locales.length < 2) return [];
  return [
    ...locales.map((locale) => ({
      hreflang: locale,
      href: categoryUrl(city.slug, categorySlug, locale),
    })),
    { hreflang: "x-default", href: categoryUrl(city.slug, categorySlug, DEFAULT_LOCALE) },
  ];
}

/** The same, for a city hub */
export function alternatesForCity(city: City): { hreflang: string; href: string }[] {
  const locales = localesForCity(city);
  if (locales.length < 2) return [];
  return [
    ...locales.map((locale) => ({ hreflang: locale, href: cityUrl(city.slug, locale) })),
    { hreflang: "x-default", href: cityUrl(city.slug, DEFAULT_LOCALE) },
  ];
}

/** The root, which is the one page whose slash is the whole path */
export const HOME_URL = `${SITE_URL}/`;

/**
 * The city index.
 *
 * It is a page rather than a section of the root because the root is the map,
 * and a wall of city names is not what someone who opens a map wants to read.
 * The link graph still has to work: the root links here, here links to every
 * hub, and every hub links back. Cut this page out and the hubs are orphans
 * that only the sitemap knows about — discovered, but with nothing pointing at
 * them and no anchor text saying what they are.
 *
 * `CITIES_SLUG` lives in utils.ts, next to the parser that has to know this
 * segment is not a city.
 */
export const CITIES_PATH = `/${CITIES_SLUG}/`;
export const CITIES_URL = `${SITE_URL}${CITIES_PATH}`;

export function citiesTitle(cityCount: number): string {
  return `Cities on ${SITE_NAME} — ${formatCount(cityCount)} city maps`;
}

export function citiesDescription(cityCount: number, countryCount: number): string {
  return (
    `Every city with a map of its own on ${SITE_NAME}: ${formatCount(cityCount)} cities in ` +
    `${formatCount(countryCount)} countries, each with public toilets, drinking water, ` +
    `playgrounds and 17 more categories from OpenStreetMap. Free, and no signup.`
  );
}

/** Structured data of the city index */
export function buildCitiesJsonLd(cities: City[], updatedAt: string): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Cities on ${SITE_NAME}`,
      description: citiesDescription(
        cities.length,
        new Set(cities.map((city) => city.country)).size
      ),
      url: CITIES_URL,
      // The content of this page is the list, so it is exactly as current as
      // the newest hub in it
      dateModified: updatedAt,
      // The list itself, in the order the page renders it. This is the one
      // page whose whole content is a set of links, so saying so in the
      // markup is worth the bytes
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: cities.length,
        itemListElement: cities.map((city, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: cityName(city),
          item: cityUrl(city.slug),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: HOME_URL },
        { "@type": "ListItem", position: 2, name: "Cities", item: CITIES_URL },
      ],
    },
  ];
}

/**
 * The English a route is written in. Every piece of copy below goes through
 * this rather than reading `plural` and `heading` off the entry directly, so a
 * US city gets gas stations and restrooms in its title, its h1, its list
 * heading, its FAQ and its neighbour links alike — the alternative is a page
 * headed one way and worded the other.
 */
export function vocabForRoute(route: Route): Vocab {
  return vocabFor(route.city.countryCode);
}

export function titleFor(route: Route, count: number): string {
  const { city, categorySeo } = route;
  const noun = capitalizeFirst(categoryPlural(categorySeo, vocabForRoute(route)));
  return interpolate(ui().page.categoryTitle, {
    noun,
    ...cityNames(city),
    count: formatCount(count),
    site: SITE_NAME,
  });
}

export function descriptionFor(route: Route, count: number): string {
  const { city, categorySeo } = route;
  // The noun has to agree with the count: 163 routes hold a single point, and
  // "1 public showers in Adelaide" was what every one of their descriptions said
  const noun = categoryNoun(categorySeo, count, vocabForRoute(route));
  // Sentence case on the finished string: English opens with the count and is
  // already fine, Finnish opens with the noun and the deck stores nouns in the
  // lower case form a sentence uses mid way through
  return capitalizeFirst(
    interpolate(ui().page.categoryDescription, {
      noun,
      ...cityNames(city),
      count: formatCount(count),
    })
  );
}

export function headingFor(route: Route): string {
  return interpolate(ui().page.categoryHeading, {
    noun: categoryHeading(route.categorySeo, vocabForRoute(route)),
    ...cityNames(route.city),
  });
}

/** The plural noun of a route, for the places that need only the noun */
export function pluralFor(route: Route): string {
  return categoryPlural(route.categorySeo, vocabForRoute(route));
}

/**
 * How one row in the list is titled.
 *
 * A point with a name is called by it, which is the only honest option: the
 * building around the Oodi library is not what anybody calls the library. A
 * point without one is called by where it stands — "Public toilet in
 * Tennispalatsi" — which is what a person would say out loud and, not
 * incidentally, a string somebody might type.
 *
 * The two are kept in separate fields all the way to here on purpose. Writing
 * the building's name into the point's `name` would put a name into the data
 * that no mapper wrote, and would leave every consumer of the payload unable
 * to tell the two apart. See PoiEntry
 */
export function poiTitle(route: Route, poi: PoiEntry): string {
  if (poi.name) return poi.name;
  const singular = categorySingular(route.categorySeo, vocabForRoute(route));
  // The list only ever holds rows with one or the other, so the last branch is
  // for a hand edited payload rather than anything the fetch can produce
  if (poi.context) {
    return capitalizeFirst(interpolate(ui().poi.inPlace, { noun: singular, place: poi.context }));
  }
  // "on" rather than "in", because a street runs past a post box rather than
  // containing it, and the weaker preposition is the honest one
  if (poi.street) {
    return capitalizeFirst(interpolate(ui().poi.onStreet, { noun: singular, street: poi.street }));
  }
  return capitalizeFirst(singular);
}

/** Whether any row on this page is titled by its surroundings rather than named */
export function hasPlacedPois(pois: PoiEntry[]): boolean {
  return pois.some((poi) => !poi.name && (poi.context || poi.street));
}

/**
 * The paragraph above the list. The deck writes it in international English
 * and it is translated on the way out, which is why the intro is assembled
 * here rather than called straight from the component
 */
export function introFor(route: Route, count: number): string {
  const { city, categorySeo } = route;
  return categoryIntro(categorySeo, cityNames(city), count, vocabForRoute(route));
}

/**
 * Naming the categories a city actually has, rather than a fixed list. A hub
 * that promises luggage lockers it has no page for is a bounced visitor
 */
export function cityTitleFor(city: City, categories: CategorySeo[]): string {
  // A hub with nothing to list is written anyway, as a noindex page, so that
  // the URL resolves for anyone who lands on it. It still needs a title that
  // reads like one
  if (categories.length === 0) {
    return interpolate(ui().page.cityFallbackTitle, { ...cityNames(city), site: SITE_NAME });
  }
  const vocab = vocabFor(city.countryCode);
  const named = categories.slice(0, 3).map((entry) => categoryPlural(entry, vocab));
  const more = categories.length > named.length ? " and more" : "";
  return `${cityName(city)}: ${named.join(", ")}${more} | ${SITE_NAME}`;
}

export function cityDescriptionFor(
  city: City,
  categories: CategorySeo[],
  totalPoints: number
): string {
  const vocab = vocabFor(city.countryCode);
  if (categories.length === 0) {
    return localize(
      `The map of ${cityName(city)}: public toilets, drinking water, playgrounds and more, ` +
        `from OpenStreetMap. Not enough is mapped here yet for a page of its own.`,
      vocab
    );
  }
  const named = categories.slice(0, 4).map((entry) => categoryPlural(entry, vocab));
  const rest = categories.length - named.length;
  return (
    interpolate(ui().page.cityDescription, {
      ...cityNames(city),
      count: formatCount(totalPoints),
      named: named.join(", "),
      more: rest > 0 ? interpolate(ui().page.cityDescriptionMore, { rest }) : "",
    })
  );
}


/** The full question set of a category page: the specific ones, then the shared ones */
export function faqFor(route: Route, count: number): FaqEntry[] {
  const vocab = vocabForRoute(route);
  // categoryFaq localises its own output, because it is the half that has to
  // pick a plural form first. The shared questions still go through here
  return [
    ...categoryFaq(route.categorySeo, cityNames(route.city), count, vocab),
    ...commonFaq(cityNames(route.city), categoryPlural(route.categorySeo, vocab)).map(({ q, a }) => ({
      q: localize(q, vocab),
      a: localize(a, vocab),
    })),
  ];
}

export type LinkGroup = {
  heading: string;
  links: { href: string; label: string }[];
};

/**
 * The internal links of a category page. Without these the page set is a few
 * thousand orphans; with them it is a graph a crawler can walk, which is the
 * whole reason the long tail cities ever get discovered.
 *
 * Both slug lists come from the build, which is the only place that knows
 * which routes cleared the threshold. Linking to a route that was skipped
 * would trade the orphan problem for a field of 404s.
 */
export function internalLinksFor(route: Route, data: CategoryPageData): LinkGroup[] {
  const { city, categorySeo } = route;
  const vocab = vocabForRoute(route);

  const otherCategories = data.siblingCategories.flatMap((slug) => {
    const other = findCategorySeo(slug);
    if (!other || other.slug === categorySeo.slug) return [];
    return [
      {
        href: categoryPath(city.slug, other.slug),
        label: interpolate(ui().page.categoryHeading, {
          noun: categoryHeading(other, vocab),
          ...cityNames(city),
        }),
      },
    ];
  });

  const sameCategoryElsewhere = data.nearbyCities.flatMap((slug) => {
    const other = findCity(slug);
    if (!other) return [];
    return [
      {
        // The label describes the page it points at, so it is written in that
        // city's English: a Dallas page links to "Petrol stations in London"
        // and to "Gas stations in Vancouver", and both anchors match the title
        // of the page on the other end
        href: categoryPath(other.slug, categorySeo.slug, linkLocaleFor(other)),
        label: interpolate(ui().page.categoryHeading, {
          noun: categoryHeading(categorySeo, vocabFor(other.countryCode)),
          ...cityNames(other, linkLocaleFor(other)),
        }),
      },
    ];
  });

  const groups: LinkGroup[] = [];
  if (otherCategories.length > 0) {
    groups.push({
      heading: interpolate(ui().page.moreInCity, cityNames(city)),
      links: otherCategories,
    });
  }
  if (sameCategoryElsewhere.length > 0) {
    groups.push({
      heading: interpolate(ui().page.nearbyHeading, {
        noun: capitalizeFirst(categoryPlural(categorySeo, vocab)),
      }),
      links: sameCategoryElsewhere,
    });
  }
  return groups;
}

/**
 * The neighbouring routes a page should link to, worked out at build time.
 * `hasPage` answers whether a given city and category pair got a page.
 */
export function neighbourLinksFor(
  city: City,
  categorySlug: string,
  hasPage: (citySlug: string, categorySlug: string) => boolean
): { siblingCategories: string[]; nearbyCities: string[] } {
  return {
    siblingCategories: CATEGORY_SEO.filter(
      (other) => other.slug !== categorySlug && hasPage(city.slug, other.slug)
    ).map((other) => other.slug),
    nearbyCities: nearbyCities(city, 12)
      .filter((other) => hasPage(other.slug, categorySlug))
      .slice(0, 6)
      .map((other) => other.slug),
  };
}

/** Nearby cities that have a hub page of their own */
export function neighbourCitiesFor(
  city: City,
  hasCityPage: (citySlug: string) => boolean
): string[] {
  return nearbyCities(city, 12)
    .filter((other) => hasCityPage(other.slug))
    .slice(0, 6)
    .map((other) => other.slug);
}

/** schema.org address of a point, which is only ever as good as the OSM tags */
function postalAddress(city: City, poi: { address?: string; street?: string }) {
  // The address tag when OpenStreetMap has one, and the street the point was
  // placed on when it does not. Both are a streetAddress; the second is simply
  // missing its housenumber, which is what the property allows
  const streetAddress = poi.address ?? poi.street;
  return {
    "@type": "PostalAddress",
    ...(streetAddress ? { streetAddress } : {}),
    addressLocality: cityName(city),
    addressCountry: city.countryCode,
  };
}

/**
 * The structured data of a category page: what the list is, where it sits in
 * the site, and the questions it answers. Emitted statically, so it does not
 * depend on the renderer getting as far as running our JavaScript.
 */
export function buildJsonLd(route: Route, data: CategoryPageData): object[] {
  const { city, categorySeo } = route;
  const url = categoryUrl(city.slug, categorySeo.slug);
  const heading = headingFor(route);

  /**
   * The page itself, which is the only node here that can carry a date.
   *
   * `dateModified` is a property of CreativeWork, and the ItemList below is an
   * Intangible — putting the date there validates against nothing and says
   * nothing. So the page gets a node of its own, the list keeps an `@id` for
   * it to point at, and the extract date lands on the thing it is actually
   * true of: this page was rebuilt when OpenStreetMap was last read.
   *
   * The same date is already in <lastmod> and in the visible footer. This is
   * the third place it appears and the least load bearing of them — Google
   * documents dateModified for Article types, not for a directory page — but
   * it is free, it is honest, and it closes the gap where a crawler reading
   * only the structured data had no idea how current any of this was.
   */
  const page = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    url,
    name: heading,
    description: descriptionFor(route, data.count),
    dateModified: data.updatedAt,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: HOME_URL },
    mainEntity: { "@id": `${url}#list` },
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${url}#list`,
    name: heading,
    description: descriptionFor(route, data.count),
    url,
    numberOfItems: data.count,
    itemListOrder: "https://schema.org/ItemListUnordered",
    // Only the points the page actually shows: structured data that describes
    // more than the visible content is a markup violation, not a bonus
    itemListElement: data.pois.slice(0, MAX_LISTED_POIS).map((poi, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": categorySeo.schemaType,
        name: poiTitle(route, poi),
        // Where the row's title came from its surroundings, say so in the one
        // property schema.org has for exactly this. It keeps `name` matching
        // the visible row while the markup still admits that the proper noun
        // in it belongs to the building rather than to the toilet
        ...(poi.context ? { containedInPlace: { "@type": "Place", name: poi.context } } : {}),
        address: postalAddress(city, poi),
        geo: {
          "@type": "GeoCoordinates",
          latitude: poi.lat,
          longitude: poi.lon,
        },
        ...(poi.openingHours ? { openingHours: poi.openingHours } : {}),
        ...(poi.wheelchair
          ? {
              additionalProperty: {
                "@type": "PropertyValue",
                name: "wheelchair",
                value: poi.wheelchair,
              },
            }
          : {}),
      },
    })),
  };

  // Site → Cities → City → Category, which is both the click path and the
  // link path a crawler walks. It named the city as a child of the root while
  // the index lived on the root; the index is /cities now and the trail says so
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: HOME_URL },
      { "@type": "ListItem", position: 2, name: "Cities", item: CITIES_URL },
      { "@type": "ListItem", position: 3, name: cityName(city), item: cityUrl(city.slug) },
      {
        "@type": "ListItem",
        position: 4,
        name: categoryHeading(categorySeo, vocabForRoute(route)),
        item: url,
      },
    ],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqFor(route, data.count).map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: { "@type": "Answer", text: entry.a },
    })),
  };

  return [page, itemList, breadcrumbs, faq];
}

/** Structured data of a city hub page */
export function buildCityJsonLd(
  city: City,
  categories: CategorySeo[],
  totalPoints: number,
  /** ISO date of the newest extract behind any category on the hub */
  updatedAt: string
): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: interpolate(ui().page.cityTitle, cityNames(city)),
      description: cityDescriptionFor(city, categories, totalPoints),
      url: cityUrl(city.slug),
      // A CollectionPage is a CreativeWork, so unlike the category page's
      // ItemList this one can carry the date itself
      dateModified: updatedAt,
      about: {
        "@type": "City",
        name: cityName(city),
        address: {
          "@type": "PostalAddress",
          addressLocality: cityName(city),
          addressCountry: city.countryCode,
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: city.lat,
          longitude: city.lon,
        },
      },
      hasPart: categories.map((entry) => ({
        "@type": "WebPage",
        name: interpolate(ui().page.categoryHeading, {
          noun: categoryHeading(entry, vocabFor(city.countryCode)),
          ...cityNames(city),
        }),
        url: categoryUrl(city.slug, entry.slug),
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: HOME_URL },
        { "@type": "ListItem", position: 2, name: "Cities", item: CITIES_URL },
        { "@type": "ListItem", position: 3, name: cityName(city), item: cityUrl(city.slug) },
      ],
    },
  ];
}

/** Structured data of the map root */
export function buildHomeJsonLd(): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: HOME_URL,
      description:
        "A map of the small points of interest that are hard to find elsewhere: " +
        "public toilets, drinking water, playgrounds, shelters and more, from OpenStreetMap.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_NAME,
      url: HOME_URL,
      applicationCategory: "TravelApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ];
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
