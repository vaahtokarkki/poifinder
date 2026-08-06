const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;

export async function fetchRouteGeoJSON({
  start,
  end,
  apiKey = ORS_API_KEY,
}: {
  start: [number, number];
  end: [number, number];
  apiKey?: string;
}): Promise<GeoJSON.FeatureCollection> {
  if (!apiKey) {
    throw new Error("OpenRouteService API key is missing.");
  }
  const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;
  const body = {
    coordinates: [start, end],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OpenRouteService error: ${res.statusText}`);
  }

  return await res.json();
}
