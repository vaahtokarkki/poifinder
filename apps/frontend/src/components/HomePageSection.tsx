import React from "react";
import { CITIES_PATH } from "../seo/pageMeta";
import { formatCount } from "../seo/format";
import { getLocale, resolve, ui } from "../copy";
import type { HomePageData } from "../seo/pageData";
import { InfoSheetCredits, InfoSheetGuide, InfoSheetSummary } from "./AppInfoPanel";

/**
 * The content of the map root, which is the whole of the sheet on this one
 * route: the summary, the guide, the link to the city index, the credits.
 *
 * It renders the guide itself rather than leaving App to append it, because
 * the two used to be rendered in sequence by App and the order was then only
 * true at runtime. The prerendered markup is deleted the moment React mounts,
 * so anything App adds after it lands below it for a visitor and nowhere at
 * all for a crawler. Owning both here is what lets one line sit between the
 * guide and the credits and be in the same place in both.
 *
 * The city index used to be here in full, on the grounds that the root is the
 * one URL linked from outside and the hub pages have to be reachable from it.
 * That is still true and it is why the link below is not optional — it is the
 * only thing standing between 51 hub pages and being orphans — but the index
 * itself is /cities now. Someone opening a map wants the map, not a directory,
 * and a crawler follows one link as readily as a hundred.
 */
const HomePageSection: React.FC<{ data: HomePageData }> = ({ data }) => (
  <>
    <h1 className="info-sheet-title">{ui().page.homeTitle}</h1>
    {/* The same sentence every other route shows in the sheet. Someone who
        lands on the map root and someone who follows a shared link should be
        told the same thing about what this is */}
    <InfoSheetSummary />

    <InfoSheetGuide />

    {/* Small print, and it has to stay in a prerendered component to be small
        print safely: footer position costs a link very little, but being
        rendered only after React mounts would cost it everything. The anchor
        text carries the word "cities" because it is the only text on the root
        that says what is on the other end */}
    {data.cityCount > 0 && (
      <p className="info-sheet-footer">
        <a href={CITIES_PATH}>
          {ui().page.browseCitiesBefore} {formatCount(data.cityCount)}{" "}
          {resolve(ui().page.cityUnit, getLocale(), {}, data.cityCount)}{" "}
          {ui().page.browseCitiesAfter}
        </a>
      </p>
    )}

    <InfoSheetCredits />
  </>
);

export default HomePageSection;
