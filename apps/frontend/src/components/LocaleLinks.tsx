import React from "react";
import { getLocale, ui } from "../copy";
import type { Locale } from "../copy";
import type { City } from "../seo/cities";
import { categoryPath, cityPath, localesForCity, localesForRoute } from "../seo/pageMeta";

/**
 * Links to this same page in the other languages it exists in.
 *
 * The reason is half crawl graph and half reader. Before this, nothing linked
 * into /de/ or /fi/ at all: the trees were reachable only through their
 * sitemaps and through hreflang, which is a hint rather than a path, and they
 * pointed 2,992 links back at the English tree while receiving none. A hub
 * with nothing pointing at it is the failure the city index already exists to
 * prevent, one level up.
 *
 * Each offer is written in the language it leads to — "Diese Seite auf
 * Deutsch", not "This page in German" — for the same reason the selector shows
 * endonyms: somebody hunting for their own language often cannot read the page
 * they are standing on. `hreflang` and `lang` say the same thing to a crawler
 * and to a screen reader respectively.
 *
 * Renders nothing when the city has no other tree, which is most of them. No
 * hooks: this is rendered to static markup by the prerender.
 */
type LocaleLinksProps = {
  city: City;
  /** Omitted on a city hub, which is the page for the city itself */
  categorySlug?: string;
};

const LocaleLinks: React.FC<LocaleLinksProps> = ({ city, categorySlug }) => {
  const current = getLocale();
  // A category page offers the locales that category has, which is narrower
  // than the city's: Berlin has a French toilets page and no French benches
  const available = categorySlug ? localesForRoute(city, categorySlug) : localesForCity(city);
  const others = available.filter((locale) => locale !== current);
  if (others.length === 0) return null;

  const hrefFor = (locale: Locale) =>
    categorySlug ? categoryPath(city.slug, categorySlug, locale) : cityPath(city.slug, locale);

  return (
    <p className="info-sheet-footer info-sheet-locales">
      {others.map((locale, index) => (
        <React.Fragment key={locale}>
          {index > 0 && " · "}
          <a href={hrefFor(locale)} lang={locale}>
            {ui(locale).page.viewInThisLanguage}
          </a>
        </React.Fragment>
      ))}
    </p>
  );
};

export default LocaleLinks;
