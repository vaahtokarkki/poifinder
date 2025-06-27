import { useEffect, useState } from "react";

type LatLng = {
  lat?: number;
  lng?: number;
  initialized: boolean;
};

export const useUserPosition = (): { position: LatLng } => {
  const [position, setPosition] = useState<LatLng>({ initialized: false });

  useEffect(() => {
    let watchId: number | null = null;

    // Initial position
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setPosition({ lat: coords.latitude, lng: coords.longitude, initialized: true }),
      (blocked) => {
        if (blocked) console.error("Geolocation permission denied");
      }
    );

    // Watch for changes
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        ({ coords }) =>
          setPosition({ lat: coords.latitude, lng: coords.longitude, initialized: true }),
        (blocked) => {
          if (blocked) console.error("Geolocation permission denied");
        }
      );
    }

    // Cleanup
    return () => {
      if (watchId !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return { position };
};
