import React from "react";
import { Marker, Popup } from "react-leaflet";

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

const RenderMarkerContents: React.FC<{ marker: MarkerData }> = ({ marker }) => {
  return (
    <div>
      <b>{marker.name || "No name"}</b>
      {marker.tags &&
        Object.entries(marker.tags).map(([key, value]) => {
          if (key === "access" && value === "yes") return null;
          if (key === "fee" && value === "yes") return null;
          if (["leisure", "type", "amenity"].includes(key)) return null;

          return (
            <table key={key} style={{ width: "100%", minWidth: "200px", tableLayout: "fixed" }}>
              <tbody>
                <tr>
                  <td colSpan={3}>{key}</td>
                  <td colSpan={3}>{value}</td>
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
        <Marker key={String(marker.position)} position={marker.position}>
          <Popup>
            <RenderMarkerContents marker={marker} />
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default PoiMarkers;
