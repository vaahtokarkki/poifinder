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
import type { CategorySeo, FaqEntry, Vocab } from "./categories";
import type { CategoryPageData, PoiEntry } from "./pageData";
import { formatCount } from "./format";
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
 * gas-stations, dog-parks and atms are the obvious next candidates: 12,269
 * impressions and 3 clicks between them. They are left in for now because they
 * demonstrably rank, and losing that is a bigger bet than losing five
 * categories nothing ever clicked.
 */
export const PAUSED_CATEGORIES: ReadonlySet<string> = new Set([
  "parking",
  "libraries",
  "playgrounds",
  "ice-cream",
  "viewpoints",
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
export function categoryPath(citySlug: string, categorySlug: string): string {
  return `/${citySlug}/${categorySlug}/`;
}

export function cityPath(citySlug: string): string {
  return `/${citySlug}/`;
}

export function categoryUrl(citySlug: string, categorySlug: string): string {
  return `${SITE_URL}${categoryPath(citySlug, categorySlug)}`;
}

export function cityUrl(citySlug: string): string {
  return `${SITE_URL}${cityPath(citySlug)}`;
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
          name: city.name,
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
  return `${noun} in ${city.name} — ${formatCount(count)} on the map | ${SITE_NAME}`;
}

export function descriptionFor(route: Route, count: number): string {
  const { city, categorySeo } = route;
  // The noun has to agree with the count: 163 routes hold a single point, and
  // "1 public showers in Adelaide" was what every one of their descriptions said
  const noun = categoryNoun(categorySeo, count, vocabForRoute(route));
  return (
    `${formatCount(count)} ${noun} in ${city.name} on one map, with opening hours, ` +
    `fees and accessibility where OpenStreetMap has them. Free to use, no signup, ` +
    `works on your phone.`
  );
}

export function headingFor(route: Route): string {
  return `${categoryHeading(route.categorySeo, vocabForRoute(route))} in ${route.city.name}`;
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
  return poi.context ? `${capitalizeFirst(singular)} in ${poi.context}` : capitalizeFirst(singular);
}

/** Whether any row on this page is titled by its surroundings rather than named */
export function hasPlacedPois(pois: PoiEntry[]): boolean {
  return pois.some((poi) => !poi.name && poi.context);
}

/**
 * The paragraph above the list. The deck writes it in international English
 * and it is translated on the way out, which is why the intro is assembled
 * here rather than called straight from the component
 */
export function introFor(route: Route, count: number): string {
  const { city, categorySeo } = route;
  return categoryIntro(categorySeo, city.name, count, vocabForRoute(route));
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
    return `Points of interest in ${city.name} | ${SITE_NAME}`;
  }
  const vocab = vocabFor(city.countryCode);
  const named = categories.slice(0, 3).map((entry) => categoryPlural(entry, vocab));
  const more = categories.length > named.length ? " and more" : "";
  return `${city.name}: ${named.join(", ")}${more} | ${SITE_NAME}`;
}

export function cityDescriptionFor(
  city: City,
  categories: CategorySeo[],
  totalPoints: number
): string {
  const vocab = vocabFor(city.countryCode);
  if (categories.length === 0) {
    return localize(
      `The map of ${city.name}: public toilets, drinking water, playgrounds and more, ` +
        `from OpenStreetMap. Not enough is mapped here yet for a page of its own.`,
      vocab
    );
  }
  const named = categories.slice(0, 4).map((entry) => categoryPlural(entry, vocab));
  const rest = categories.length - named.length;
  return (
    `${formatCount(totalPoints)} mapped points in ${city.name}: ${named.join(", ")}` +
    `${rest > 0 ? ` and ${rest} more categories` : ""}, on one map built from ` +
    `OpenStreetMap. The small things that are hard to look up anywhere else.`
  );
}


/** The full question set of a category page: the specific ones, then the shared ones */
export function faqFor(route: Route, count: number): FaqEntry[] {
  const vocab = vocabForRoute(route);
  // categoryFaq localises its own output, because it is the half that has to
  // pick a plural form first. The shared questions still go through here
  return [
    ...categoryFaq(route.categorySeo, route.city.name, count, vocab),
    ...commonFaq(route.city.name, categoryPlural(route.categorySeo, vocab)).map(({ q, a }) => ({
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
        label: `${categoryHeading(other, vocab)} in ${city.name}`,
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
        href: categoryPath(other.slug, categorySeo.slug),
        label: `${categoryHeading(categorySeo, vocabFor(other.countryCode))} in ${other.name}`,
      },
    ];
  });

  const groups: LinkGroup[] = [];
  if (otherCategories.length > 0) {
    groups.push({ heading: `More in ${city.name}`, links: otherCategories });
  }
  if (sameCategoryElsewhere.length > 0) {
    groups.push({
      heading: `${capitalizeFirst(categoryPlural(categorySeo, vocab))} nearby`,
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
function postalAddress(city: City, poi: { address?: string }) {
  return {
    "@type": "PostalAddress",
    ...(poi.address ? { streetAddress: poi.address } : {}),
    addressLocality: city.name,
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
      { "@type": "ListItem", position: 3, name: city.name, item: cityUrl(city.slug) },
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
      name: `Points of interest in ${city.name}`,
      description: cityDescriptionFor(city, categories, totalPoints),
      url: cityUrl(city.slug),
      // A CollectionPage is a CreativeWork, so unlike the category page's
      // ItemList this one can carry the date itself
      dateModified: updatedAt,
      about: {
        "@type": "City",
        name: city.name,
        address: {
          "@type": "PostalAddress",
          addressLocality: city.name,
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
        name: `${categoryHeading(entry, vocabFor(city.countryCode))} in ${city.name}`,
        url: categoryUrl(city.slug, entry.slug),
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: HOME_URL },
        { "@type": "ListItem", position: 2, name: "Cities", item: CITIES_URL },
        { "@type": "ListItem", position: 3, name: city.name, item: cityUrl(city.slug) },
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
