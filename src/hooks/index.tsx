import { useEffect, useState } from "react";

type LatLng = {
  lat?: number;
  lng?: number;
  initialized: boolean;
};

export const useUserPosition = (): { position: LatLng} => {
  const [position, setPosition] = useState<LatLng>({initialized: false});
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPosition({ lat: coords.latitude, lng: coords.longitude, initialized: true }),
      (blocked) => {
        if (blocked) console.error("Geolocation permission denied");
      }
    );
  }, []);
  return { position };
};

export function useSearchLocation(): [
  [number, number] | null,
  (query: string) => Promise<[number, number] | null>
] {
  const [location, setLocation] = useState<[number, number] | null>(null);

  const search = async (query: string) => {
    if (!query.trim()) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.length > 0) {
      const { lat, lon } = data[0];
      const loc: [number, number] = [parseFloat(lat), parseFloat(lon)];
      setLocation(loc);
      return loc;
    }
    return null;
  };

  return [location, search];
}
