import React from "react";
import { findCity } from "../seo/cities";
import { cityPath,
  cityName,
  linkLocaleFor,
} from "../seo/pageMeta";
import { formatCount } from "../seo/format";
import { getLocale, resolve, ui } from "../copy";
import type { CitiesPageData } from "../seo/pageData";

/**
 * The content of /cities: every city with a hub page, grouped by country.
 *
 * This is the door to every hub page. The root is a map and links here once;
 * everything below that is only reachable through this list or through a
 * neighbour link on a page a crawler already found, so a city missing from
 * here is a city with nothing pointing at it.
 *
 * Grouped by country rather than listed flat, because a few hundred bare city
 * names is a wall a reader skips and a crawler reads as boilerplate.
 */
const CitiesPageSection: React.FC<{ data: CitiesPageData }> = ({ data }) => {
  const cities = data.citySlugs.map(findCity).filter((city) => city !== undefined);

  const byCountry = new Map<string, typeof cities>();
  for (const city of cities) {
    const group = byCountry.get(city.country);
    if (group) group.push(city);
    else byCountry.set(city.country, [city]);
  }
  const countries = [...byCountry.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <>
      <h1 className="info-sheet-title">{ui().page.citiesTitle}</h1>
      <p className="info-sheet-summary">
        {formatCount(cities.length)}{" "}
        {resolve(ui().page.cityUnit, getLocale(), {}, cities.length)}{" "}
        {ui().page.citiesSummaryIn}{" "}
        {formatCount(countries.length)}{" "}
        {resolve(ui().page.countryUnit, getLocale(), {}, countries.length)}{" "}
        {ui().page.citiesSummaryAfter}
      </p>

      {countries.map(([country, group]) => (
        <section className="info-sheet-subsection" key={country}>
          <h2 className="info-sheet-subheading">{country}</h2>
          <ul className="poi-links poi-links-inline">
            {group.map((city) => (
              // A city with no tree in this language is linked in English:
              // /fi/aarhus/ is a file that was never written. Same rule the
              // neighbour blocks use, and the reason linkLocaleFor exists
              <li key={city.slug}>
                <a href={cityPath(city.slug, linkLocaleFor(city))}>
                  {cityName(city, linkLocaleFor(city))}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
};

export default CitiesPageSection;
