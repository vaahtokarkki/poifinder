
export type Suggestion = {
  label: string;
  coords: [number, number];
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
  };
  geometry?: {
    coordinates?: [number, number];
  };
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
      return label && coords ? { label, coords } : null;
    })
    .filter(Boolean) as Suggestion[];
}
