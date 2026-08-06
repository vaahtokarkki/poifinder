import React from "react";
import { Marker } from "react-leaflet";
import { divIcon } from "leaflet";
import CircleIcon from "@mui/icons-material/Circle";
import { renderToString } from "react-dom/server";
import type { LatLng } from "../hooks";

type UserPositionMarkerProps = {
  position: LatLng;
};

// Grey while the position still comes from the cache, blue once GPS has locked
const NO_GPS_LOCK_COLOR = "#9e9e9e";
const GPS_LOCK_COLOR = "#1976d2";

const UserPositionMarker: React.FC<UserPositionMarkerProps> = ({ position }) => {
  if (!position.initialized || typeof position.lat !== "number" || typeof position.lng !== "number") {
    return null;
  }

  const color = position.hasGpsLock ? GPS_LOCK_COLOR : NO_GPS_LOCK_COLOR;

  return (
    <Marker
      position={[position.lat, position.lng]}
      opacity={position.hasGpsLock ? 1 : 0.75}
      icon={divIcon({
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
            ${renderToString(<CircleIcon style={{ color, fontSize: 20 }} />)}
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
