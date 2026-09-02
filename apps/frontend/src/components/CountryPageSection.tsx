import React from "react";
import { findCity } from "../seo/cities";
import { findCategorySeo } from "../seo/categories";
import { formatCount } from "../seo/format";
import { getLocale, resolve, ui } from "../copy";
import {
  categoryPath,
  citiesPath,
  cityName,
  countryHeadingFor,
  countryNames,
  linkLocaleForRoute,
} from "../seo/pageMeta";
import type { CountryPageData } from "../seo/pageData";

/**
 * One category across one country: the answer to a query with no town in it.
 *
 * "vessat kartalla", "drinkwaterkaart nederland", "öffentliche toiletten
 * schweden karte" — every language tested asks this, and until this page
 * existed the site had nothing to give it. The city index is the wrong answer:
 * it lists every city in the world and says nothing about a category.
 *
 * The content is the list of city pages, ordered by how much each has. That is
 * deliberate — this page's job is to hand the visitor to the city page that
 * actually holds the points, and to give those pages a second parent in the
 * link graph besides the city hub. It does not repeat the points themselves; a
 * country's worth of drinking fountains is not a list anybody reads, and it
 * would compete with the pages it is supposed to feed.
 *
 * No hooks: the prerender renders this to static markup in Node.
 */
const CountryPageSection: React.FC<{ data: CountryPageData }> = ({ data }) => {
  const categorySeo = findCategorySeo(data.categorySlug);
  if (!categorySeo) return null;

  const names = countryNames(data.countryCode, data.country);
  const cities = data.entries.flatMap((entry) => {
    const city = findCity(entry.citySlug);
    return city ? [{ city, count: entry.count }] : [];
  });

  return (
    <>
      <h1 className="info-sheet-title">{countryHeadingFor(data)}</h1>
      <p className="info-sheet-summary">
        {resolve(ui().page.countrySummary, getLocale(), {
          ...names,
          count: formatCount(data.total),
          cities: formatCount(cities.length),
          cityUnit: resolve(ui().page.cityUnit, getLocale(), {}, cities.length),
        })}
      </p>

      <section className="info-sheet-section">
        <h2 className="info-sheet-heading">
          {resolve(ui().page.countryCitiesHeading, getLocale(), names)}
        </h2>
        <ul className="poi-links">
          {cities.map(({ city, count }) => {
            // The locale the city's page for *this category* exists in, which
            // is not always this page's own: a French country hub for France
            // links to French pages, but the same rule keeps a hub honest
            // wherever the traveller tree is narrower than the hub
            const locale = linkLocaleForRoute(city, data.categorySlug);
            return (
              <li key={city.slug}>
                <a href={categoryPath(city.slug, data.categorySlug, locale)}>
                  {cityName(city, locale)}
                </a>
                <span className="poi-meta">
                  {formatCount(count)} {ui().page.mapped}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* The way back up, the same one the city hubs carry. Without it this
          page is a leaf that only the sitemap and one link per city reach */}
      <p className="info-sheet-summary">
        <a href={citiesPath()}>{ui().page.allCities}</a>
      </p>
    </>
  );
};

export default CountryPageSection;
