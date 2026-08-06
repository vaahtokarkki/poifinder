import React from "react";
import { findCity } from "../seo/cities";
import type { City } from "../seo/cities";
import { findCategorySeo } from "../seo/categories";
import { formatCount } from "../seo/format";
import type { CityPageData } from "../seo/pageData";

/**
 * The content of a prerendered city hub page: every category that has enough
 * points in this city, plus the neighbours. It gives the category pages a
 * parent to be linked from, and catches the searches that name a city without
 * naming one category.
 */
type CityPageSectionProps = {
  city: City;
  data: CityPageData;
};

const CityPageSection: React.FC<CityPageSectionProps> = ({ city, data }) => {
  const entries = data.entries
    .map((entry) => ({ categorySeo: findCategorySeo(entry.categorySlug), count: entry.count }))
    .filter((entry): entry is { categorySeo: NonNullable<typeof entry.categorySeo>; count: number } =>
      Boolean(entry.categorySeo)
    );
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  // Only the neighbours that have a hub page of their own, worked out at build time
  const neighbours = data.nearbyCities.map(findCity).filter((entry) => entry !== undefined);

  return (
    <>
      <h1 className="info-sheet-title">Points of interest in {city.name}</h1>
      <p className="info-sheet-summary">
        {formatCount(total)} mapped points across {entries.length}{" "}
        {entries.length === 1 ? "category" : "categories"} in {city.name}, {city.country}.
        These are the small fixtures that are hard to look up anywhere else. Pick one to
        see it on the map.
      </p>

      <section className="info-sheet-section">
        <h2 className="info-sheet-heading">Categories in {city.name}</h2>
        <ul className="poi-links">
          {entries.map((entry) => (
            <li key={entry.categorySeo.slug}>
              <a href={`/${city.slug}/${entry.categorySeo.slug}`}>
                {entry.categorySeo.heading} in {city.name}
              </a>
              <span className="poi-meta">{formatCount(entry.count)} mapped</span>
            </li>
          ))}
        </ul>
      </section>

      {neighbours.length > 0 && (
        <section className="info-sheet-section">
          <h2 className="info-sheet-heading">Nearby cities</h2>
          <ul className="poi-links">
            {neighbours.map((neighbour) => (
              <li key={neighbour.slug}>
                <a href={`/${neighbour.slug}`}>{neighbour.name}</a>
                <span className="poi-meta">{neighbour.country}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="info-sheet-footer">
        Points come from{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{" "}
        contributors, last refreshed{" "}
        <time dateTime={data.updatedAt}>{data.updatedAt}</time>.
      </p>
    </>
  );
};

export default CityPageSection;
