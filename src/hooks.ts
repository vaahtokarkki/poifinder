import { useState } from "react";

export function useSearchLocation(): [
  [number, number] | null,
  (query: string) => Promise<[number, number] | null>
] {
  const [location, setLocation] = useState<[number, number] | null>(null);

  const search = async (query: string) => {
    if (!query.trim()) {
      setLocation(null);
      return null;
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const json = await res.json();
    const data = Array.isArray(json) ? json as {lat: string; lon: string;}[] : [];
    if (data.length > 0) {
      const { lat, lon } = data[0];
      const loc: [number, number] = [parseFloat(lat), parseFloat(lon)];
      setLocation(loc);
      return loc;
    }
    return null;
  };

  return [location, search];
}
