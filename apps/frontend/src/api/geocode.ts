
export type Suggestion = {
  label: string;
  coords: [number, number];
  /**
   * How much ground the place covers, as [south, west, north, east], where the
   * geocoder says. A city has one and a doorway does not, which is the whole
   * use of it: it is what lets a search for Helsinki open the city and a
   * search for an address open the street.
   */
  extent?: [number, number, number, number];
};

type LatLng = {
  lat?: number;
  lng?: number;
  initialized: boolean;
};

type PhotonFeature = {
  properties?: {
    label?: string;
    name?: string;
    city?: string;
    country?: string;
    /** Photon's own bounding box, for the results that have one */
    extent?: number[];
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

/**
 * Photon writes its extent as [west, north, east, south], which is one corner
 * and then the other rather than a pair of mins and a pair of maxes.
 *
 * Read as min/max per axis rather than by position, because getting that order
 * wrong produces a box that is inside out — and an inside out box does not
 * fail, it silently fits the map to nothing. The four numbers are two
 * longitudes and two latitudes whichever way round they arrive.
 */
const toExtent = (
  extent: number[] | undefined
): [number, number, number, number] | undefined => {
  if (!extent || extent.length !== 4 || extent.some(n => typeof n !== "number")) {
    return undefined;
  }
  const [west, north, east, south] = extent;
  return [
    Math.min(north, south),
    Math.min(west, east),
    Math.max(north, south),
    Math.max(west, east),
  ];
};

export async function fetchSuggestions(
  query: string,
  userPosition?: LatLng
): Promise<Suggestion[]> {
  if (!query.trim()) return [];
  let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`;
  if (
    userPosition &&
    typeof userPosition.lat === "number" &&
    typeof userPosition.lng === "number"
  ) {
    url += `&lat=${userPosition.lat}&lon=${userPosition.lng}`;
  }
  const res = await fetch(url);
  const data: { features?: PhotonFeature[] } = await res.json();

  return (data.features || [])
    .map((item: PhotonFeature) => {
      const label =
        item.properties &&
        (item.properties.label ||
          item.properties.name ||
          item.properties.city ||
          item.properties.country);
      const coords =
        item.geometry &&
        Array.isArray(item.geometry.coordinates)
          ? [item.geometry.coordinates[1], item.geometry.coordinates[0]]
          : undefined;
      return label && coords
        ? { label, coords, extent: toExtent(item.properties?.extent) }
        : null;
    })
    .filter(Boolean) as Suggestion[];
}
