import React from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import CircleIcon from "@mui/icons-material/Circle";
import { renderToString } from "react-dom/server";

type UserPositionMarkerProps = {
  position: [number, number];
  isVisible?: boolean;
};

const UserPositionMarker: React.FC<UserPositionMarkerProps> = ({ position, isVisible = true }) => {
  if (!isVisible) return null;

  return (
    <Marker
      position={position}
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
