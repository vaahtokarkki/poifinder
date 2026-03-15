import { useEffect, useState } from "react";
import { saveGPSLocation } from "../utils/gpsLocationStorage";

type LatLng = {
  lat?: number;
  lng?: number;
  initialized: boolean;
  isFromCache?: boolean;
};

export const useUserPosition = (): { position: LatLng } => {
  const [position, setPosition] = useState<LatLng>({ initialized: false });

  useEffect(() => {
    let watchId: number | null = null;

    // Get cached position immediately if available (up to 5 minutes old)
    // This ensures fast initial response, especially on repeat visits
    navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => {
        const isFromCache = Date.now() - timestamp > 5000; // Assume cached if older than 5s
        const newPosition: LatLng = {
          lat: coords.latitude,
          lng: coords.longitude,
          initialized: true,
          isFromCache,
        };
        setPosition(newPosition);
        // Save GPS location to localStorage
        saveGPSLocation({
          lat: coords.latitude,
          lng: coords.longitude,
          timestamp: Date.now(),
        });
      },
      (error) => {
        if (error) console.debug("Geolocation error (cached):", error.message);
      },
      {
        maximumAge: 5 * 60 * 1000, // Accept cached position up to 5 minutes old
        timeout: 5000, // Don't wait more than 5 seconds for GPS
      }
    );

    // Watch for fresh position updates in the background
    // This silently updates position as fresh GPS becomes available
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        ({ coords }) => {
          const newPosition: LatLng = {
            lat: coords.latitude,
            lng: coords.longitude,
            initialized: true,
            isFromCache: false,
          };
          setPosition(newPosition);
          // Save GPS location to localStorage
          saveGPSLocation({
            lat: coords.latitude,
            lng: coords.longitude,
            timestamp: Date.now(),
          });
        },
        (error) => {
          if (error) console.debug("Geolocation watch error:", error.message);
        },
        {
          enableHighAccuracy: false, // Use standard accuracy for speed
          timeout: 10000, // Wait up to 10s for fresh GPS
          maximumAge: 0, // Always get fresh GPS for watchPosition
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
