import React from "react";
import { findCity } from "../seo/cities";
import { findCategorySeo } from "../seo/categories";
import type { PageData } from "../seo/pageData";
import CitiesPageSection from "./CitiesPageSection";
import CountryPageSection from "./CountryPageSection";
import CityPageSection from "./CityPageSection";
import HomePageSection from "./HomePageSection";
import PoiPageSection from "./PoiPageSection";

/**
 * Renders whichever page the build time payload describes.
 *
 * The prerender and the running app both go through here, which is what makes
 * the static HTML and the sheet the same content by construction rather than
 * by two implementations happening to agree.
 */
const PrerenderedPage: React.FC<{ data: PageData }> = ({ data }) => {
  if (data.kind === "home") {
    return <HomePageSection data={data} />;
  }

  if (data.kind === "cities") {
    return <CitiesPageSection data={data} />;
  }

  // Before the city lookup below: a country hub belongs to no city
  if (data.kind === "country") {
    return <CountryPageSection data={data} />;
  }

  const city = findCity(data.citySlug);
  if (!city) return null;

  if (data.kind === "city") {
    return <CityPageSection city={city} data={data} />;
  }

  const categorySeo = findCategorySeo(data.categorySlug);
  if (!categorySeo) return null;
  return <PoiPageSection route={{ city, categorySeo }} data={data} />;
};

export default PrerenderedPage;
