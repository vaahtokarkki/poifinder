import React from "react";
import { CITIES_PATH } from "../seo/pageMeta";
import { formatCount } from "../seo/format";
import type { HomePageData } from "../seo/pageData";
import { InfoSheetSummary } from "./AppInfoPanel";

/**
 * The content of the map root.
 *
 * The city index used to be here, on the grounds that the root is the one URL
 * linked from outside and the hub pages have to be reachable from it. That is
 * still true and it is why the link below is not optional — it is the only
 * thing standing between 87 hub pages and being orphans — but the index itself
 * is /cities now. Someone opening a map wants the map, not a directory, and a
 * crawler follows one link as readily as a hundred.
 */
const HomePageSection: React.FC<{ data: HomePageData }> = ({ data }) => (
  <>
    <h1 className="info-sheet-title">Find the small things, anywhere</h1>
    {/* The same sentence every other route shows in the sheet. Someone who
        lands on the map root and someone who follows a shared link should be
        told the same thing about what this is */}
    <InfoSheetSummary />

    {/* Small print, and it has to stay in *this* component to be small print
        safely. The rest of the sheet's footer lives in InfoSheetContent, which
        the prerender never renders — it is added by the app after React mounts.
        A link moved there would be absent from the static HTML, and the static
        HTML is the only version of the root that a crawler is guaranteed to
        read. Footer position costs a link very little; being rendered by
        JavaScript is what costs it everything.

        The anchor text carries the word "cities" for the same reason: it is
        the only text anywhere on the root that says what is on the other end */}
    {data.cityCount > 0 && (
      <p className="info-sheet-footer">
        <a href={CITIES_PATH}>
          Browse {formatCount(data.cityCount)}{" "}
          {data.cityCount === 1 ? "city" : "cities"} with a page of their own
        </a>
      </p>
    )}
  </>
);

export default HomePageSection;
