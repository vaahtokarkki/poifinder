/**
 * Split the current URL path into segments,
 * e.g. "/helsinki/toilets" -> ["helsinki", "toilets"].
 */
function pathSegments(): string[] {
  return window.location.pathname.replace(/^\/+|\/+$/g, "").split("/");
}

/**
 * Parse city from a URL path.
 * Returns a lowercased city string (only a-z), or "" if not present.
 */
export function parseCityFromPath(): string {
  const [cityRaw] = pathSegments();
  return cityRaw && cityRaw.match(/^[a-zA-Z]+$/) ? cityRaw.toLowerCase() : "";
}

/**
 * Parse category from a URL path.
 * Returns a lowercased category string (a-z and dashes allowed, dashes become spaces), or "" if not present.
 */
export function parseCategoryFromPath(): string {
  const [, categoryRaw] = pathSegments();
  return categoryRaw && categoryRaw.match(/^[a-zA-Z\-]+$/)
    ? categoryRaw.toLowerCase().replace(/-/g, " ")
    : "";
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
