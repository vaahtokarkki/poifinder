/**
 * A link that hands one point to whatever map app the reader already has.
 *
 * Android's `geo:` URI is the one that opens the chooser — Google Maps,
 * Organic Maps, whatever is installed — which is the whole point of the
 * button. iOS registers no handler for it and the tap would do nothing at
 * all, so Apple's own link goes there instead: it opens Maps when it is
 * installed and the web map when it is not. Everything else gets Google Maps
 * on the web, the one destination a desktop reliably has.
 *
 * Walking wherever a scheme lets us say so. Everything on this map — a
 * fountain, a bench, a public toilet — is somewhere you arrive on foot, and
 * driving directions to a park bench are the wrong answer.
 */
export function directionsUrl(lat: number, lng: number, label?: string): string {
  const coords = `${lat},${lng}`;
  const agent = typeof navigator === "undefined" ? "" : navigator.userAgent;

  if (/Android/i.test(agent)) {
    // The `q=` repeat is not redundant: `geo:lat,lng` alone opens the map at
    // that spot with nothing on it, and the query is what drops the pin the
    // chooser's app then offers to route to
    const named = label ? `(${encodeURIComponent(label)})` : "";
    return `geo:${coords}?q=${coords}${named}`;
  }

  if (/iPad|iPhone|iPod/.test(agent)) {
    return `https://maps.apple.com/?daddr=${coords}&dirflg=w`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${coords}&travelmode=walking`;
}
