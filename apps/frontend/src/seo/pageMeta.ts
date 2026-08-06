import { findCity, nearbyCities } from "./cities";
import type { City } from "./cities";
import { CATEGORY_SEO, commonFaq, findCategorySeo } from "./categories";
import type { CategorySeo, FaqEntry } from "./categories";
import type { CategoryPageData } from "./pageData";
import { formatCount } from "./format";

export const SITE_URL = "https://wayside.cc";
export const SITE_NAME = "Wayside";

/**
 * Below this many points a page has nothing to say, and publishing it would
 * only add a thin duplicate to the index. The prerender skips those routes and
 * the sitemap never lists them.
 */
export const MIN_POIS_FOR_PAGE = 8;

/** How many named points the list renders. Enough to be substantive, not a dump */
export const MAX_LISTED_POIS = 25;

export type Route = {
  city: City;
  categorySeo: CategorySeo;
};

export function categoryUrl(citySlug: string, categorySlug: string): string {
  return `${SITE_URL}/${citySlug}/${categorySlug}`;
}

export function cityUrl(citySlug: string): string {
  return `${SITE_URL}/${citySlug}`;
}

export function titleFor(route: Route, count: number): string {
  const { city, categorySeo } = route;
  const noun = capitalizeFirst(categorySeo.plural);
  return `${noun} in ${city.name} — ${formatCount(count)} on the map | ${SITE_NAME}`;
}

export function descriptionFor(route: Route, count: number): string {
  const { city, categorySeo } = route;
  return (
    `${formatCount(count)} ${categorySeo.plural} in ${city.name} on one map, with opening hours, ` +
    `fees and accessibility where OpenStreetMap has them. Free to use, no signup, ` +
    `works on your phone.`
  );
}

export function headingFor(route: Route): string {
  return `${route.categorySeo.heading} in ${route.city.name}`;
}

/**
 * Naming the categories a city actually has, rather than a fixed list. A hub
 * that promises luggage lockers it has no page for is a bounced visitor
 */
export function cityTitleFor(city: City, categories: CategorySeo[]): string {
  const named = categories.slice(0, 3).map((entry) => entry.plural);
  const more = categories.length > named.length ? " and more" : "";
  return `${city.name}: ${named.join(", ")}${more} | ${SITE_NAME}`;
}

export function cityDescriptionFor(
  city: City,
  categories: CategorySeo[],
  totalPoints: number
): string {
  const named = categories.slice(0, 4).map((entry) => entry.plural);
  const rest = categories.length - named.length;
  return (
    `${formatCount(totalPoints)} mapped points in ${city.name}: ${named.join(", ")}` +
    `${rest > 0 ? ` and ${rest} more categories` : ""}, on one map built from ` +
    `OpenStreetMap. The small things that are hard to look up anywhere else.`
  );
}


/** The full question set of a category page: the specific ones, then the shared ones */
export function faqFor(route: Route, count: number): FaqEntry[] {
  return [
    ...route.categorySeo.faq(route.city.name, formatCount(count)),
    ...commonFaq(route.city.name, route.categorySeo.plural),
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

  const otherCategories = data.siblingCategories.flatMap((slug) => {
    const other = findCategorySeo(slug);
    if (!other || other.slug === categorySeo.slug) return [];
    return [{ href: `/${city.slug}/${other.slug}`, label: `${other.heading} in ${city.name}` }];
  });

  const sameCategoryElsewhere = data.nearbyCities.flatMap((slug) => {
    const other = findCity(slug);
    if (!other) return [];
    return [
      {
        href: `/${other.slug}/${categorySeo.slug}`,
        label: `${categorySeo.heading} in ${other.name}`,
      },
    ];
  });

  const groups: LinkGroup[] = [];
  if (otherCategories.length > 0) {
    groups.push({ heading: `More in ${city.name}`, links: otherCategories });
  }
  if (sameCategoryElsewhere.length > 0) {
    groups.push({
      heading: `${capitalizeFirst(categorySeo.plural)} nearby`,
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

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
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
        name: poi.name,
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

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: city.name, item: cityUrl(city.slug) },
      { "@type": "ListItem", position: 3, name: categorySeo.heading, item: url },
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

  return [itemList, breadcrumbs, faq];
}

/** Structured data of a city hub page */
export function buildCityJsonLd(
  city: City,
  categories: CategorySeo[],
  totalPoints: number
): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Points of interest in ${city.name}`,
      description: cityDescriptionFor(city, categories, totalPoints),
      url: cityUrl(city.slug),
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
        name: `${entry.heading} in ${city.name}`,
        url: categoryUrl(city.slug, entry.slug),
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: city.name, item: cityUrl(city.slug) },
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
      url: SITE_URL,
      description:
        "A map of the small points of interest that are hard to find elsewhere: " +
        "public toilets, drinking water, playgrounds, shelters and more, from OpenStreetMap.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "TravelApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ];
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
