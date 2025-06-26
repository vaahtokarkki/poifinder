import React from "react";
import { Marker, Popup } from "react-leaflet";
import ParkIcon from '@mui/icons-material/Park';
import LocalPostOfficeIcon from '@mui/icons-material/LocalPostOffice';
import WcIcon from '@mui/icons-material/Wc';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import EvStationIcon from '@mui/icons-material/EvStation';
import { renderToString } from "react-dom/server";
import L from "leaflet";

type MarkerData = {
  position: [number, number];
  name?: string;
  tags?: Record<string, string>;
  type?: string;
};

type DynamicMarkersProps = {
  markers: MarkerData[];
  fetchMarkersRef?: React.MutableRefObject<(() => void) | null>;
  setLoading?: (active: boolean) => void;
  fetchMarkers: () => Promise<void>;
};

// Reusable icon rendering function
const RenderMarkerIcon = (
  iconElement: React.ReactElement,
  color: string = "black"
) => {
  const size = 25;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;">
      <span style="
        background:#fff6;
        border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,0.15);
        display:flex;
        align-items:center;
        justify-content:center;
        border: 3px solid #fff6;
        color: ${color};
      ">
        ${renderToString(React.cloneElement(iconElement))}
      </span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

// Map marker tag key-value to icon and color
const markerIconMap: Record<
  string,
  { icon: React.ReactElement; color: string }
> = {
  "leisure=playground": { icon: <ParkIcon />, color: "#1B5E20" },
  "amenity=toilets": { icon: <WcIcon />, color: "#1A237E" },
  "amenity=fuel": { icon: <LocalGasStationIcon />, color: "#1A237E" },
  "amenity=charging_station": { icon: <EvStationIcon />, color: "#1A237E" },
  "amenity=parking": { icon: <LocalParkingIcon />, color: "#1A237E" },
  "amenity=post_box": { icon: <LocalPostOfficeIcon />, color: "#3E2723" },
};

const getMarkerIcon = (marker: MarkerData) => {
  if (marker.tags) {
    for (const [key, value] of Object.entries(marker.tags)) {
      const mapKey = `${key}=${value}`;
      if (markerIconMap[mapKey]) {
        const { icon, color } = markerIconMap[mapKey];
        return RenderMarkerIcon(icon, color);
      }
    }
  }
  // Default icon
  return RenderMarkerIcon(<ParkIcon />);
};

const RenderMarkerContents: React.FC<{ marker: MarkerData }> = ({ marker }) => {
  return (
    <div>
      <b>{marker.name || "No name"}</b>
      {marker.tags &&
        Object.entries(marker.tags).map(([key, value]) => {
          if (key === "access" && value === "yes") return null;
          if (key === "fee" && value === "yes") return null;
          if (["leisure", "type", "amenity"].includes(key)) return null;

          const displayKey = key.replace(/:/g, " ");

          return (
            <table key={key} style={{ width: "100%", minWidth: "200px", tableLayout: "fixed" }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 500 }}>{displayKey}</td>
                  <td>{value}</td>
                </tr>
              </tbody>
            </table>
          );
        })}
    </div>
  );
};

const PoiMarkers: React.FC<DynamicMarkersProps> = ({
  markers,
}) => {
  return (
    <>
      {markers.map((marker) => (
        <Marker
          key={String(marker.position)}
          position={marker.position}
          icon={getMarkerIcon(marker)}
        >
          <Popup>
            <RenderMarkerContents marker={marker} />
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default PoiMarkers;
