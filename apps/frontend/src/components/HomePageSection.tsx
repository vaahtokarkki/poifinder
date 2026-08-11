import React from "react";
import { findCity } from "../seo/cities";
import { cityPath } from "../seo/pageMeta";
import type { HomePageData } from "../seo/pageData";
import { InfoSheetSummary } from "./AppInfoPanel";

/**
 * The content of the map root. Its job is the city index: the one URL that
 * gets linked from outside has to be the door to every hub page, otherwise the
 * long tail cities are orphans no crawler ever reaches.
 *
 * Grouped by country rather than listed flat, because a few hundred bare city
 * names is a wall a reader skips and a crawler reads as boilerplate.
 */
const HomePageSection: React.FC<{ data: HomePageData }> = ({ data }) => {
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
      <h1 className="info-sheet-title">Find the small things, anywhere</h1>
      {/* The same sentence every other route shows in the sheet. Someone who
          lands on the map root and someone who follows a shared link should be
          told the same thing about what this is */}
      <InfoSheetSummary />

      {cities.length > 0 && (
        <section className="info-sheet-section">
          <h2 className="info-sheet-heading">
            {cities.length} {cities.length === 1 ? "city" : "cities"} with a page of their own
          </h2>
          {countries.map(([country, group]) => (
            <section className="info-sheet-subsection" key={country}>
              <h3 className="info-sheet-subheading">{country}</h3>
              <ul className="poi-links poi-links-inline">
                {group.map((city) => (
                  <li key={city.slug}>
                    <a href={cityPath(city.slug)}>{city.name}</a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
      )}
    </>
  );
};

export default HomePageSection;
