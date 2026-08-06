import React from "react";
import { findCity } from "../seo/cities";
import type { HomePageData } from "../seo/pageData";

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
      <p className="info-sheet-summary">
        Wayside maps what other maps skip: public toilets, drinking water, playgrounds,
        post boxes, luggage lockers and many more categories, from
        OpenStreetMap. Search any area of the map, or start from a city below.
      </p>

      <p className="info-sheet-footer">
        Points come from{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{" "}
        contributors. Something missing? Add it there and it shows up here.
      </p>
    </>
  );
};

export default HomePageSection;
