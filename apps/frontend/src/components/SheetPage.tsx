import React from "react";
import { findCity } from "../seo/cities";
import { findCategorySeo } from "../seo/categories";
import { headingFor } from "../seo/pageMeta";
import type { PageData } from "../seo/pageData";
import { InfoSheetCredits, InfoSheetGuide, InfoSheetSummary } from "./AppInfoPanel";
import CityPageSection from "./CityPageSection";
import PoiPageSection from "./PoiPageSection";
import PrerenderedPage from "./PrerenderedPage";

/**
 * What the sheet shows once React is running, on a route the prerender wrote.
 *
 * The prerendered page is written for someone who has not arrived yet: a
 * crawler, or a browser that has not run the bundle. Someone who has arrived
 * is looking at the map, where the same points are already drawn, in the right
 * place, live rather than from a build time extract. Reading their names in a
 * list underneath is the one thing they do not need, and it is what the sheet
 * used to open on. So the sheet leads with what the map root leads with —
 * what Wayside is, and how to work it — and the page content moves into a
 * disclosure below it.
 *
 * It moves rather than goes. Google indexes the rendered DOM, so anything
 * React drops here is dropped from the page as far as the index is concerned,
 * the internal links included; the list, the questions and the neighbour links
 * are all still rendered, still crawlable, and content inside a closed
 * <details> is indexed normally. What changes is the order and the emphasis,
 * which is a layout decision and not a claim about the page.
 *
 * The heading stays the page's own. It is what the title, the canonical and
 * the h1 of the static HTML all say, and it is also the honest answer to why
 * this visitor is here: they searched for toilets in Helsinki.
 */
type Disclosure = { heading: string; label: string; body: React.ReactNode };

const SheetPage: React.FC<{ data: PageData }> = ({ data }) => {
  // The map root already is this sheet, and /cities is a directory whose list
  // is the whole point of visiting it. Neither has anything to fold away
  if (data.kind === "home" || data.kind === "cities") {
    return <PrerenderedPage data={data} />;
  }

  const city = findCity(data.citySlug);
  if (!city) return null;

  let disclosure: Disclosure | null = null;

  if (data.kind === "city") {
    disclosure = {
      heading: `Points of interest in ${city.name}`,
      label: `Categories and nearby cities in ${city.name}`,
      body: <CityPageSection city={city} data={data} variant="sheet" />,
    };
  } else {
    const categorySeo = findCategorySeo(data.categorySlug);
    if (!categorySeo) return null;
    const route = { city, categorySeo };
    disclosure = {
      heading: headingFor(route),
      label: `List of ${categorySeo.plural} in ${city.name}`,
      body: <PoiPageSection route={route} data={data} variant="sheet" />,
    };
  }

  return (
    <>
      <h1 className="info-sheet-title">{disclosure.heading}</h1>
      <InfoSheetSummary />

      <InfoSheetGuide />

      <details className="info-sheet-disclosure">
        <summary>{disclosure.label}</summary>
        <div className="info-sheet-disclosure-body">{disclosure.body}</div>
      </details>

      <InfoSheetCredits />
    </>
  );
};

export default SheetPage;
