import { DEFAULT_LOCALE, LOCALES, isLocale } from "./copy";
import type { Locale } from "./copy";

/**
 * Split the current URL path into segments,
 * e.g. "/new-york/dog-parks" -> ["new-york", "dog-parks"].
 */
function pathSegments(pathname?: string): string[] {
  const path = pathname ?? (typeof window === "undefined" ? "" : window.location.pathname);
  return path.replace(/^\/+|\/+$/g, "").split("/");
}

/** A URL slug is lowercase a-z, digits and single dashes between them */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toSlug(raw: string | undefined): string {
  if (!raw) return "";
  const slug = decodeURIComponent(raw).toLowerCase();
  return SLUG_PATTERN.test(slug) ? slug : "";
}

/**
 * First path segments that are pages of our own rather than a city. A city can
 * never be named one of these, and the parsers below have to say so: the app
 * reads an unknown first segment as a place name and sends it to the geocoder,
 * so without this /cities would pan the map to whatever Photon thinks "cities"
 * is and ignore the visitor's own position.
 *
 * The paths themselves are built in seo/pageMeta.ts from these same strings.
 */
export const CITIES_SLUG = "cities";

/**
 * Every locale code, reserved so none can be read as a city.
 *
 * English included, even though English lives at the root and `/en/...` is
 * never written: left unreserved it would be read as a place name and sent to
 * the geocoder, which is the same failure `/cities` had. An unwritten path
 * should 404, not pan the map to whatever Photon thinks "en" is.
 */
const LOCALE_SLUGS: ReadonlySet<string> = new Set(LOCALES.map((entry) => entry.code));

const RESERVED_SLUGS = new Set<string>([CITIES_SLUG, ...LOCALE_SLUGS]);

/**
 * Split a path into the locale it is in and the segments after it.
 *
 * `/de/berlin/toilets` is Berlin's toilets in German, not a city called "de".
 * English has no prefix — it lives at the root, because it is the tree every
 * city has and prefixing it would move 1,216 indexed URLs for nothing.
 */
function localeAwarePath(pathname?: string): { locale: Locale; rest: string[] } {
  const segments = pathSegments(pathname);
  const [first] = segments;
  if (first && isLocale(first)) {
    return { locale: first, rest: segments.slice(1) };
  }
  return { locale: DEFAULT_LOCALE, rest: segments };
}

/** The locale a URL is asking for, English when it carries no prefix */
export function parseLocaleFromPath(pathname?: string): Locale {
  return localeAwarePath(pathname).locale;
}

/**
 * The city slug of a URL path, e.g. "new-york", or "" when there is none.
 *
 * Dashes are part of a slug: an earlier version rejected them, which quietly
 * broke every multi word city in the sitemap.
 */
export function parseCitySlugFromPath(pathname?: string): string {
  const [city] = localeAwarePath(pathname).rest;
  const slug = toSlug(city);
  return RESERVED_SLUGS.has(slug) ? "" : slug;
}

/** The category slug of a URL path, e.g. "dog-parks", or "" when there is none */
export function parseCategorySlugFromPath(pathname?: string): string {
  const [, category] = localeAwarePath(pathname).rest;
  return toSlug(category);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "new-york" -> "New York", the fallback for a city we have no entry for */
export function slugToTitle(slug: string): string {
  return slug.split("-").map(capitalize).join(" ");
}
