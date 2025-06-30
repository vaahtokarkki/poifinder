/**
 * Parse city from a URL path.
 * Returns a lowercased city string (only a-z), or "" if not present.
 */
export function parseCityFromPath(pathname: string): string {
  let path = pathname.replace(/^\/+|\/+$/g, "");
  path = path.replace(/^poifinder\/?/i, "");
  const [cityRaw] = path.split("/");
  return cityRaw && cityRaw.match(/^[a-zA-Z]+$/) ? cityRaw.toLowerCase() : "";
}

/**
 * Parse category from a URL path.
 * Returns a lowercased category string (a-z and dashes allowed, dashes become spaces), or "" if not present.
 */
export function parseCategoryFromPath(pathname: string): string {
  let path = pathname.replace(/^\/+|\/+$/g, "");
  path = path.replace(/^poifinder\/?/i, "");
  const [, categoryRaw] = path.split("/");
  return categoryRaw && categoryRaw.match(/^[a-zA-Z\-]+$/)
    ? categoryRaw.toLowerCase().replace(/-/g, " ")
    : "";
}
