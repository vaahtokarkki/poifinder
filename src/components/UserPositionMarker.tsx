import React, { useEffect, useRef } from "react";
import { Marker, useMap } from "react-leaflet";
import L from "leaflet";
import CircleIcon from "@mui/icons-material/Circle";
import { renderToString } from "react-dom/server";
import { useUserPosition } from "../hooks";
import { parseCityFromPath } from "../utils";

const UserPositionMarker: React.FC = () => {
  const { position } = useUserPosition();
  const map = useMap();
  const hasPanned = useRef(false);

  // Listen for user panning
  useEffect(() => {
    const onMove = () => {
      hasPanned.current = true;
    };
    map.on("dragstart", onMove);
    return () => {
      map.off("dragstart", onMove);
    };
  }, [map]);

  // Center only if not panned yet, no city in path, and no lat/lon in query params
  useEffect(() => {
    const city = parseCityFromPath(window.location.pathname);
    const params = new URLSearchParams(window.location.search);
    const lat = params.get("lat");
    const lon = params.get("lon");
    const hasLatLon = lat && lon && !isNaN(Number(lat)) && !isNaN(Number(lon));

    if (
      !city &&
      !hasLatLon &&
      position.initialized &&
      typeof position.lat === "number" &&
      typeof position.lng === "number" &&
      !hasPanned.current
    ) {
      map.setView([position.lat, position.lng]);
    }
  }, [position, map]);

  if (!position.initialized || typeof position.lat !== "number" || typeof position.lng !== "number") {
    return null;
  }

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={L.divIcon({
        className: "",
        html: `<div style="display:flex;align-items:center;justify-content:center;">
          <span style="
            background:#fff;
            border-radius:50%;
            box-shadow:0 2px 8px rgba(0,0,0,0.15);
            display:flex;
            align-items:center;
            justify-content:center;
            border: 3px solid #fff;
          ">
            ${renderToString(<CircleIcon style={{ color: "#1976d2", fontSize: 20 }} />)}
          </span>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      })}
    />
  );
};

export default UserPositionMarker;
