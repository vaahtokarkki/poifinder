import React from "react";
import { findCity } from "../seo/cities";
import { cityPath } from "../seo/pageMeta";
import { formatCount } from "../seo/format";
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
      <h1 className="info-sheet-title">Cities on Wayside</h1>
      <p className="info-sheet-summary">
        {formatCount(cities.length)} {cities.length === 1 ? "city" : "cities"} in{" "}
        {formatCount(countries.length)}{" "}
        {countries.length === 1 ? "country" : "countries"} have a page of their own,
        listing what is mapped there: public toilets, drinking water, playgrounds and 17
        more categories. Everywhere else still works on the map, it just has no page yet.
      </p>

      {countries.map(([country, group]) => (
        <section className="info-sheet-subsection" key={country}>
          <h2 className="info-sheet-subheading">{country}</h2>
          <ul className="poi-links poi-links-inline">
            {group.map((city) => (
              <li key={city.slug}>
                <a href={cityPath(city.slug)}>{city.name}</a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
};

export default CitiesPageSection;
