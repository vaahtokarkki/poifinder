import React from "react";
import { findCity } from "../seo/cities";
import type { City } from "../seo/cities";
import { categoryHeading, findCategorySeo, vocabFor } from "../seo/categories";
import { formatCount } from "../seo/format";
import LocaleLinks from "./LocaleLinks";
import { getLocale, interpolate, resolve, ui } from "../copy";
import { citiesPath, categoryPath, cityPath,
  cityName,
  linkLocaleFor, cityNames } from "../seo/pageMeta";
import type { CityPageData } from "../seo/pageData";

/**
 * The content of a prerendered city hub page: every category that has enough
 * points in this city, plus the neighbours. It gives the category pages a
 * parent to be linked from, and catches the searches that name a city without
 * naming one category.
 *
 * See PoiPageSection for what the two variants mean: the same content, with
 * the heading and the credits left to SheetPage when it is the sheet.
 */
type CityPageSectionProps = {
  city: City;
  data: CityPageData;
  variant?: "page" | "sheet";
};

const CityPageSection: React.FC<CityPageSectionProps> = ({ city, data, variant = "page" }) => {
  const entries = data.entries
    .map((entry) => ({ categorySeo: findCategorySeo(entry.categorySlug), count: entry.count }))
    .filter((entry): entry is { categorySeo: NonNullable<typeof entry.categorySeo>; count: number } =>
      Boolean(entry.categorySeo)
    );
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  const vocab = vocabFor(city.countryCode);
  // Only the neighbours that have a hub page of their own, worked out at build time
  const neighbours = data.nearbyCities.map(findCity).filter((entry) => entry !== undefined);

  return (
    <>
      {variant === "page" && (
        <h1 className="info-sheet-title">{interpolate(ui().page.cityTitle, cityNames(city))}</h1>
      )}
      <p className="info-sheet-summary">
        {interpolate(ui().page.citySummary, {
          count: formatCount(total),
          categories: entries.length,
          unit: resolve(ui().page.categoryUnit, getLocale(), {}, entries.length),
          ...cityNames(city),
          country: city.country,
        })}{" "}
        {ui().page.citySummaryAfter}
      </p>

      <section className="info-sheet-section">
        <h2 className="info-sheet-heading">
          {interpolate(ui().page.cityCategoriesHeading, cityNames(city))}
        </h2>
        <ul className="poi-links">
          {entries.map((entry) => (
            <li key={entry.categorySeo.slug}>
              <a href={categoryPath(city.slug, entry.categorySeo.slug)}>
                {interpolate(ui().page.categoryHeading, {
                  noun: categoryHeading(entry.categorySeo, vocab),
                  ...cityNames(city),
                })}
              </a>
              <span className="poi-meta">
                {formatCount(entry.count)} {ui().page.mapped}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {neighbours.length > 0 && (
        <section className="info-sheet-section">
          <h2 className="info-sheet-heading">{ui().page.nearbyCities}</h2>
          <ul className="poi-links">
            {neighbours.map((neighbour) => (
              <li key={neighbour.slug}>
                <a href={cityPath(neighbour.slug, linkLocaleFor(neighbour))}>
                  {cityName(neighbour, linkLocaleFor(neighbour))}
                </a>
                <span className="poi-meta">{neighbour.country}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The way back up. Neighbour links only ever reach the cities nearest
          this one, so without this a crawler that lands on a hub can walk the
          region it is in and never find the other continents */}
      <p className="info-sheet-summary">
        <a href={citiesPath()}>{ui().page.allCities}</a>
      </p>

      <LocaleLinks city={city} />

      {variant === "sheet" ? (
        <p className="info-sheet-footer">
          {ui().page.sheetFreshnessBefore}{" "}
          <time dateTime={data.updatedAt}>{data.updatedAt}</time>
          {ui().page.sheetFreshnessAfter}
        </p>
      ) : (
        <p className="info-sheet-footer">
          {ui().page.pageFreshnessBefore}{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            {ui().page.pageFreshnessLink}
          </a>{" "}
          {ui().page.pageFreshnessMiddle}{" "}
          <time dateTime={data.updatedAt}>{data.updatedAt}</time>.
        </p>
      )}
    </>
  );
};

export default CityPageSection;
