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
const RESERVED_SLUGS = new Set<string>([CITIES_SLUG]);

/**
 * The city slug of a URL path, e.g. "new-york", or "" when there is none.
 *
 * Dashes are part of a slug: an earlier version rejected them, which quietly
 * broke every multi word city in the sitemap.
 */
export function parseCitySlugFromPath(pathname?: string): string {
  const [city] = pathSegments(pathname);
  const slug = toSlug(city);
  return RESERVED_SLUGS.has(slug) ? "" : slug;
}

/** The category slug of a URL path, e.g. "dog-parks", or "" when there is none */
export function parseCategorySlugFromPath(pathname?: string): string {
  const [, category] = pathSegments(pathname);
  return toSlug(category);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "new-york" -> "New York", the fallback for a city we have no entry for */
export function slugToTitle(slug: string): string {
  return slug.split("-").map(capitalize).join(" ");
}
