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
import { CATEGORY_CONFIG, CATEGORIES, parseFilterString } from "./constants";

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


const getMarkerIcon = (marker: MarkerData) => {
  if (marker.tags) {
    // For each category, check if all keys in the parsed filter match the marker's tags
    for (const cat of Object.values(CATEGORIES).filter(v => typeof v === "number") as number[]) {
      const config = CATEGORY_CONFIG[cat as CATEGORIES];
      for (const filter of config.filters) {
        const filterObj = parseFilterString(filter);
        const isMatch = Object.entries(filterObj).every(
          ([k, v]) => marker.tags && marker.tags[k] === v
        );
        if (isMatch) {
          return RenderMarkerIcon(config.icon, config.color);
        }
      }
    }
  }
  // Default icon if no match
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
  console.log("Rendering POI markers:", markers);
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
