import { useEffect, useState } from "react";
import { geocodeLocation } from "../api/nominatim";

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
    const loc = await geocodeLocation(query);
    if (loc) setLocation(loc);
    return loc;
  };

  return [location, search];
}
