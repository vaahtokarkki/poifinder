import React from "react";
import type { CategoryPageData, PoiEntry } from "../seo/pageData";
import {
  capitalizeFirst,
  citiesPath,
  countryNames,
  countryPath,
  MAX_LISTED_POIS,
  cityPath,
  hasPlacedPois,
  headingFor,
  internalLinksFor,
  summaryFor,
  pluralFor,
  poiTitle,
  cityNames,
  homePath,
  sightList,
} from "../seo/pageMeta";
import { LANDMARK_RADIUS, directionOf, roundDistance } from "../seo/landmarks";
import type { LandmarkEntry } from "../seo/landmarks";
import { categoryHeading, categorySearchHeading, vocabFor } from "../seo/categories";
import { formatCount } from "../seo/format";
import LocaleLinks from "./LocaleLinks";
import { interpolate, resolve, getLocale, ui } from "../copy";
import type { Route } from "../seo/pageMeta";

/**
 * The content of a prerendered city and category page.
 *
 * The prerender renders this same component to static markup, so what a
 * crawler reads in the HTML and what a visitor reads in the sheet are the same
 * words. Keep it free of hooks and browser APIs, it has to run in Node.
 *
 * Two variants of the same words, not two sets of them. "page" is the whole
 * page, which is what the prerender writes. "sheet" is the same content minus
 * the parts the sheet says around it: the heading, which SheetPage puts in the
 * disclosure it wraps this in, and the credits, which sit below that
 * disclosure for every route alike. Nothing is dropped that a crawler reads,
 * because the rendered DOM is what gets indexed.
 */
type PoiPageSectionProps = {
  route: Route;
  data: CategoryPageData;
  variant?: "page" | "sheet";
};

/** The tags worth showing next to a name, in the order they matter */
function poiMeta(poi: PoiEntry): string[] {
  const meta: string[] = [];
  if (poi.address) meta.push(poi.address);
  if (poi.openingHours) meta.push(poi.openingHours);
  if (poi.wheelchair === "yes") meta.push(ui().poi.stepFree);
  if (poi.wheelchair === "limited") meta.push(ui().poi.partlyStepFree);
  if (poi.fee === "no") meta.push(ui().poi.free);
  if (poi.fee === "yes") meta.push(ui().poi.fee);
  return meta;
}

/**
 * The link from a sight's row to its nearest point: the map, opened on that
 * point's popup, which is the share link the app already understands. In the
 * page's own language, so a German reader lands on the German map.
 *
 * nofollow, because each is a query string on the root rather than a page and
 * the root's canonical folds all of them into it anyway — there is nothing
 * for a crawler to learn by following six per page across the whole site.
 */
function landmarkHref(landmark: LandmarkEntry, route: Route): string {
  const params = new URLSearchParams({
    poi: landmark.poi,
    lat: landmark.lat.toFixed(6),
    lon: landmark.lon.toFixed(6),
    categories: String(route.categorySeo.category),
  });
  return `${homePath()}?${params}`;
}

/** "4 within 500 m", or "none within 500 m" */
function landmarkWithin(landmark: LandmarkEntry): string {
  const deck = ui().page;
  const params = { count: formatCount(landmark.within), radius: LANDMARK_RADIUS };
  return landmark.within === 0
    ? interpolate(deck.landmarkNoneWithin, params)
    : resolve(deck.landmarkWithin, getLocale(), params, landmark.within);
}

const PoiPageSection: React.FC<PoiPageSectionProps> = ({ route, data, variant = "page" }) => {
  const { city } = route;
  const plural = pluralFor(route);
  const listed = data.pois.slice(0, MAX_LISTED_POIS);
  const unlisted = Math.max(0, data.count - data.pois.length);
  // Rows titled by the building or park they stand in rather than by a name of
  // their own. They change what the list can honestly be called
  const placed = hasPlacedPois(listed);
  const linkGroups = internalLinksFor(route, data);

  return (
    <>
      {variant === "page" && <h1 className="info-sheet-title">{headingFor(route)}</h1>}
      <p className="info-sheet-summary">{summaryFor(route, data)}</p>

      {/* Right under the summary, because it answers the question the page is
          most often reached with: not "how many are there" but "which one is
          closest to where I am standing". See src/seo/landmarks.ts */}
      {data.landmarks && data.landmarks.length > 0 && (
        <section className="info-sheet-section">
          <h2 className="info-sheet-heading">
            {interpolate(ui().page.landmarksHeading, {
              noun:
                categorySearchHeading(route.categorySeo, vocabFor(city.countryCode)) ??
                categoryHeading(route.categorySeo, vocabFor(city.countryCode)),
              sights: sightList(data.landmarks),
            })}
          </h2>
          <ol className="poi-list">
            {data.landmarks.map((landmark) => (
              <li key={landmark.poi + landmark.name}>
                <span className="poi-name">{landmark.name}</span>
                <span className="poi-meta">
                  {landmarkWithin(landmark)}
                  {" · "}
                  <a href={landmarkHref(landmark, route)} rel="nofollow">
                    {interpolate(ui().page.landmarkClosest, {
                      distance: formatCount(roundDistance(landmark.distance)),
                      // A point a few metres off is under the sight's own
                      // roof, and "to the north" of its centre is noise
                      direction:
                        landmark.distance < 25
                          ? ""
                          : ui().page.landmarkDirections[directionOf(landmark.bearing)],
                    }).trim()}
                  </a>
                </span>
              </li>
            ))}
          </ol>
          <p className="info-sheet-note">{ui().page.landmarksNote}</p>
        </section>
      )}

      {listed.length > 0 && (
        <section className="info-sheet-section">
          <h2 className="info-sheet-heading">
            {interpolate(ui().page.listHeading, {
              qualifier: placed ? ui().page.individualHeading : ui().page.namedHeading,
              noun: plural,
              ...cityNames(city),
            })}
          </h2>
          <ol className="poi-list">
            {listed.map((poi) => {
              const meta = poiMeta(poi);
              return (
                <li key={poi.id}>
                  <span className="poi-name">{poiTitle(route, poi)}</span>
                  {meta.length > 0 && <span className="poi-meta">{meta.join(" · ")}</span>}
                </li>
              );
            })}
          </ol>
          <p className="info-sheet-note">
            {data.pois.length > listed.length
              ? interpolate(ui().page.showingSome, {
                  listed: listed.length,
                  total: data.pois.length,
                }) + " "
              : ""}
            {interpolate(ui().page.mapHasAll, { count: formatCount(data.count) })}
            {unlisted > 0
              ? interpolate(ui().page.includingUnplaced, { unlisted: formatCount(unlisted) })
              : "."}
          </p>
        </section>
      )}

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
        <a href={cityPath(city.slug)}>{interpolate(ui().page.allPointsIn, cityNames(city))}</a>
        {" · "}
        {/* The country hub, where one exists. This is the only inbound link
            those pages get besides the sitemap, and it is what makes them
            reachable by a crawler walking the tree rather than reading XML */}
        {data.hasCountryHub && (
          <>
            <a href={countryPath(city.country, route.categorySeo.slug)}>
              {interpolate(ui().page.allInCountry, {
                // A link label opens a sentence, and the deck stores nouns in
                // the lower case form they take mid sentence
                noun: capitalizeFirst(pluralFor(route)),
                ...countryNames(city.countryCode, city.country),
              })}
            </a>
            {" · "}
          </>
        )}
        <a href={citiesPath()}>{ui().page.allCities}</a>
      </p>

      <LocaleLinks city={city} categorySlug={route.categorySeo.slug} />

      {/* The sheet says where the points come from once, under the disclosure
          this sits inside, so here it only carries the one thing the credits
          cannot know: when this city and category was last refreshed */}
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
          <time dateTime={data.updatedAt}>{data.updatedAt}</time>
          {ui().page.pageFreshnessAfter}
        </p>
      )}
    </>
  );
};

export default PoiPageSection;
