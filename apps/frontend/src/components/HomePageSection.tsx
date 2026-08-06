import React from "react";
import { findCity } from "../seo/cities";
import type { HomePageData } from "../seo/pageData";
import { InfoSheetSummary } from "./AppInfoPanel";

/**
 * The content of the map root. Its job is the city index: the one URL that
 * gets linked from outside has to be the door to every hub page, otherwise the
 * long tail cities are orphans no crawler ever reaches.
 */
const HomePageSection: React.FC<{ data: HomePageData }> = ({ data }) => {
  const cities = data.citySlugs.map(findCity).filter((city) => city !== undefined);

  return (
    <>
      <h1 className="info-sheet-title">Find the small things, anywhere</h1>
      {/* The same sentence every other route shows in the sheet. Someone who
          lands on the map root and someone who follows a shared link should be
          told the same thing about what this is */}
      <InfoSheetSummary />
    </>
  );
};

export default HomePageSection;
