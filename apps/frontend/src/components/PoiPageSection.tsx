import React from "react";
import type { CategoryPageData, PoiEntry } from "../seo/pageData";
import {
  CITIES_PATH,
  MAX_LISTED_POIS,
  cityPath,
  faqFor,
  headingFor,
  internalLinksFor,
} from "../seo/pageMeta";
import { formatCount } from "../seo/format";
import type { Route } from "../seo/pageMeta";

/**
 * The content of a prerendered city and category page.
 *
 * The prerender renders this same component to static markup, so what a
 * crawler reads in the HTML and what a visitor reads in the sheet are the same
 * words. Keep it free of hooks and browser APIs, it has to run in Node.
 */
type PoiPageSectionProps = {
  route: Route;
  data: CategoryPageData;
};

/** The tags worth showing next to a name, in the order they matter */
function poiMeta(poi: PoiEntry): string[] {
  const meta: string[] = [];
  if (poi.address) meta.push(poi.address);
  if (poi.openingHours) meta.push(poi.openingHours);
  if (poi.wheelchair === "yes") meta.push("Step free");
  if (poi.wheelchair === "limited") meta.push("Partly step free");
  if (poi.fee === "no") meta.push("Free");
  if (poi.fee === "yes") meta.push("Fee");
  return meta;
}

const PoiPageSection: React.FC<PoiPageSectionProps> = ({ route, data }) => {
  const { city, categorySeo } = route;
  const listed = data.pois.slice(0, MAX_LISTED_POIS);
  const unnamed = Math.max(0, data.count - data.pois.length);
  const faq = faqFor(route, data.count);
  const linkGroups = internalLinksFor(route, data);

  return (
    <>
      <h1 className="info-sheet-title">{headingFor(route)}</h1>
      <p className="info-sheet-summary">{categorySeo.intro(city.name, formatCount(data.count))}</p>

      {listed.length > 0 && (
        <section className="info-sheet-section">
          <h2 className="info-sheet-heading">
            Named {categorySeo.plural} in {city.name}
          </h2>
          <ol className="poi-list">
            {listed.map((poi) => {
              const meta = poiMeta(poi);
              return (
                <li key={poi.id}>
                  <span className="poi-name">{poi.name}</span>
                  {meta.length > 0 && <span className="poi-meta">{meta.join(" · ")}</span>}
                </li>
              );
            })}
          </ol>
          <p className="info-sheet-note">
            {data.pois.length > listed.length
              ? `Showing ${listed.length} of the ${data.pois.length} named points. `
              : ""}
            The map has all {formatCount(data.count)}
            {unnamed > 0
              ? `, including the ${formatCount(unnamed)} that carry no name in OpenStreetMap.`
              : "."}
          </p>
        </section>
      )}

      <section className="info-sheet-section">
        <h2 className="info-sheet-heading">Questions</h2>
        <dl className="poi-faq">
          {faq.map((entry) => (
            <React.Fragment key={entry.q}>
              <dt>{entry.q}</dt>
              <dd>{entry.a}</dd>
            </React.Fragment>
          ))}
        </dl>
      </section>

      {linkGroups.map((group) => (
        <section className="info-sheet-section" key={group.heading}>
          <h2 className="info-sheet-heading">{group.heading}</h2>
          <ul className="poi-links">
            {group.links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* The trail back up, which the breadcrumb has always claimed and the
          page never actually had: the link groups above go sideways to
          neighbouring categories and cities, and none of them go up. A hub
          that every one of its category pages links to is also a stronger hub
          than one only the index points at */}
      <p className="info-sheet-summary">
        <a href={cityPath(city.slug)}>All points of interest in {city.name}</a>
        {" · "}
        <a href={CITIES_PATH}>All cities on Wayside</a>
      </p>

      <p className="info-sheet-footer">
        Points come from{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{" "}
        contributors, last refreshed{" "}
        <time dateTime={data.updatedAt}>{data.updatedAt}</time>. Something missing? Add it
        there and it shows up here on the next refresh.
      </p>
    </>
  );
};

export default PoiPageSection;
