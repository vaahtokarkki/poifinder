import React from "react";
import { Marker, Popup } from "react-leaflet";
import ParkIcon from '@mui/icons-material/Park';
import { renderToString } from "react-dom/server";
import { divIcon } from "leaflet";
import { CATEGORY_CONFIG, CATEGORIES, parseFilterString } from "./constants";
import { OverpassMarkerData } from "./api/overpass"; // <-- Import the type

type DynamicMarkersProps = {
  markers: OverpassMarkerData[]; // <-- Use OverpassMarkerData here
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
  return divIcon({
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

const getMarkerIcon = (marker: OverpassMarkerData) => {
  if (marker.tags) {
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
  return RenderMarkerIcon(<ParkIcon />);
};

const formatDisplay = (str: string) =>
  str.replace(/[:_]/g, " ").replace(/^\w/, c => c.toUpperCase());

const RenderMarkerContents: React.FC<{ marker: OverpassMarkerData }> = ({ marker }) => {
  const isUrl = (val: string) =>
    /^https?:\/\/|^www\./i.test(val);

  return (
    <div>
      <b>{marker.name || "No name"}</b>
      {marker.tags && (
        <table style={{ width: "100%", minWidth: "180px", marginTop: 6 }}>
          <tbody>
            {Object.entries(marker.tags).map(([key, value]) => {
              if (key === "access" && value === "yes") return null;
              if (key === "fee" && value === "yes") return null;
              if (["leisure", "type", "amenity"].includes(key)) return null;
              const excludePrefixes = ["ref", "addr", "building", "wiki", "roof"];
              if (excludePrefixes.some(prefix => key.startsWith(prefix))) return null;
              if (key.startsWith("name") && key !== "name") return null;

              const displayKey = formatDisplay(key);
              const valueStr = String(value);

              return (
                <tr key={`${marker.id}-${key}`}>
                  <td style={{ fontWeight: 500, paddingRight: 8, verticalAlign: "top" }}>{displayKey}</td>
                  <td style={{ verticalAlign: "top" }}>
                    {key === "website" || key === "url" || isUrl(valueStr) ? (
                      <a href={valueStr.startsWith("http") ? valueStr : `https://${valueStr}`} target="_blank" rel="noopener noreferrer">
                        Open website
                      </a>
                    ) : (
                      formatDisplay(valueStr)
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

const PoiMarkers: React.FC<DynamicMarkersProps> = ({
  markers,
}) => <>
  {markers.map((marker) => (
    <Marker
      key={String(marker.id)}
      position={marker.position}
      icon={getMarkerIcon(marker)}
    >
      <Popup>
        <RenderMarkerContents marker={marker} />
      </Popup>
    </Marker>
  ))}
</>

export default PoiMarkers;
