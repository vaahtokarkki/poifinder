import React, { useCallback, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, ZoomControl, useMapEvent, GeoJSON } from "react-leaflet";
import PoiMarkers from "./PoiMarkers";
import SearchBar from "./SearchBar";
import CategorySelect from "./CategorySelect";
import Loading from "./components/Loading";
import { useSearchLocation, useUserPosition } from "./hooks/index";
import { Button } from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CircleIcon from '@mui/icons-material/Circle';
import DirectionsIcon from '@mui/icons-material/Directions';
import { fetchOverpassMarkers } from "./api/overpass";
import L from 'leaflet';
import { renderToString } from "react-dom/server";
import RoutesBar from "./RoutesBar";
import { fetchRouteGeoJSON } from "./api/ors";
import { geocodeLocation } from "./api/nominatim";

const MapPanHandler = ({ onMove }: { onMove: (center: [number, number]) => void }) => {
  useMapEvent("moveend", (e) => {
    const map = e.target;
    const center = map.getCenter();
    onMove([center.lat, center.lng]);
  });
  return null;
};

const App = () => {
  const { position: userPosition } = useUserPosition();
  const [searchPosition, search] = useSearchLocation();
  const [category, setCategory] = useState<string[]>(["leisure=playground"]);
  const [loading, setLoading] = useState(false);
  const [displaySearch, setDisplaySearch] = useState(false);
  const [displaySearchItem, setDisplaySearchItem] = useState<string | null>(null); // "search" | "routes" | null
  const [markers, setMarkers] = useState<any[]>([]);
  const [map, setMap] = useState<any>(null);
  const [hasCentered, setHasCentered] = useState(false);
  const [routeGeoJson, setRouteGeoJson] = useState<any | null>(null);

  // Only center the map to user position once, when it becomes available
  useEffect(() => {
    if (
      userPosition &&
      typeof userPosition.lat === "number" &&
      typeof userPosition.lng === "number"
    ) {
      if (!hasCentered) {
        setHasCentered(true);
        if(map) map.setView([userPosition.lat, userPosition.lng]);
      }
    }
  }, [userPosition, hasCentered, map]);

  const fetchMarkers = useCallback(async (useSearchLocation: boolean = false) => {
    if (!map) return;
    setLoading(true);
    const bounds = map.getBounds();
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    const bbox: [number, number, number, number] = [southWest.lat, southWest.lng, northEast.lat, northEast.lng];
    try {
      const data = await fetchOverpassMarkers(
        useSearchLocation ? searchPosition : null,
        1000,
        category,
        bbox
      );
      setMarkers(data);
    } catch (e) {
      console.error("Error fetching markers:", e);
    }
    setLoading(false);
    setDisplaySearch(false);
  }, [map, category, searchPosition]);

  useEffect(() => {
    fetchMarkers(true);
    if (map && searchPosition) map.setView(searchPosition);
    setDisplaySearch(false);
  }, [searchPosition]);

  const handleSearch = async (query: string) => {
    setDisplaySearch(false);
    if (query.trim() === "" ) return;
    await search(query);
  };

  const handleMapPan = () => {
    setDisplaySearch(true);
  };

  const handleMyLocationClick = () => {
    if (map && userPosition && userPosition.initialized) {
      map.setView([userPosition.lat, userPosition.lng], map.getZoom());
    }
  };

  const handleRouteSearch = async (start: string, end: string) => {
    try {
      setLoading(true); // Start loading
      // Geocode start and end locations
      const startCoords = await geocodeLocation(start);
      const endCoords = await geocodeLocation(end);

      if (!startCoords || !endCoords) {
        alert("Could not geocode start or end location.");
        setLoading(false);
        return;
      }

      // Call OpenRouteService API (API key is now read from env in fetchRouteGeoJSON)
      const routeGeoJson = await fetchRouteGeoJSON({
        start: [startCoords[1], startCoords[0]], // ORS expects [lng, lat]
        end: [endCoords[1], endCoords[0]], // ORS expects [lng, lat]
      });

      // Store route in state and display on map
      setRouteGeoJson(routeGeoJson);
      setMarkers([]); // Reset markers after successful route search

      // Zoom map to bbox of the route
      if (routeGeoJson && routeGeoJson.bbox && map) {
        // bbox: [minLon, minLat, maxLon, maxLat]
        const [[minLat, minLon], [maxLat, maxLon]] = [
          [routeGeoJson.bbox[1], routeGeoJson.bbox[0]],
          [routeGeoJson.bbox[3], routeGeoJson.bbox[2]],
        ];
        const bounds = L.latLngBounds(
          [minLat, minLon],
          [maxLat, maxLon]
        );
        map.fitBounds(bounds, { padding: [40, 40] });
      }
      setLoading(false); // End loading
    } catch (err) {
      setLoading(false);
      alert("Failed to fetch route: " + err);
    }
  };

  return (
    <MapContainer
      center={[60, 25]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ minHeight: "100vh", minWidth: "100vw" }}
      zoomControl={false}
      ref={setMap} 
    >
      <MapPanHandler onMove={handleMapPan} />
      <Loading active={loading} />
      <div style={{ display: "flex", flexWrap: "wrap", flexDirection: "column" }}>
        <SearchBar onSearch={handleSearch} visible={displaySearchItem === "search"} />
        <RoutesBar
          onSearch={handleRouteSearch}
          deleteRoute={() => {
            setRouteGeoJson(null);
            setMarkers([]); // Reset markers when route is deleted
          }}
          visible={displaySearchItem === "routes"}
          displayRouteInfo={!!routeGeoJson}
        />
        <CategorySelect
          value={category}
          onChange={setCategory}
          onClose={() => fetchMarkers(false)}
        />
      </div>
      <div
        style={{
          zIndex: 1000,
          margin: "1em 0 0 1.5em",
          display: displaySearch ? "flex" : "none",
          justifyContent: "center"
        }}
      >
        <Button
          variant="contained"
          endIcon={<SearchIcon />}
          style={{
            borderRadius: "1em",
            textTransform: "none",
            zIndex: 1000,
            background: "#fff",
            color: "black",
          }}
          onClick={() => fetchMarkers()}
        >
          Search from this area
        </Button>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 100,
          right: 24,
          zIndex: 1200,
          background: displaySearchItem === "search" ? "#1976d2" : "white",
          borderRadius: "50%",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          padding: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginBottom: 8,
        }}
        onClick={() => displaySearchItem === "search" ? setDisplaySearchItem(null) :setDisplaySearchItem("search")}
        title="Show/hide search bar"
      >
        <SearchIcon
          fontSize="medium"
          style={{ color: displaySearchItem === "search" ? "white" : "black" }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 50,
          right: 24,
          zIndex: 1200,
          background: "#fff",
          borderRadius: "50%",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          padding: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        onClick={handleMyLocationClick}
        title="Center map to your location"
      >
        <MyLocationIcon fontSize="medium" style={{ color: "black" }} />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 160,
          right: 24,
          zIndex: 1200,
          background: displaySearchItem === "routes" ? "#1976d2" : "white",
          color: displaySearchItem === "routes" ? "white" : "black",
          borderRadius: "50%",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          padding: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginBottom: 8,
        }}
        title="Directions"
        onClick={() => displaySearchItem === "routes" ? setDisplaySearchItem(null) : setDisplaySearchItem("routes")} 
      >
        <DirectionsIcon fontSize="medium" />
      </div>
      <ZoomControl position="bottomleft" />
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {userPosition.initialized && (
        <Marker
          position={[userPosition.lat, userPosition.lng]}
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
      )}
      <PoiMarkers
        markers={markers}
        setLoading={setLoading}
        fetchMarkers={fetchMarkers}
      />
      {routeGeoJson && displaySearchItem === "routes" && (
        <GeoJSON
          data={routeGeoJson}
          style={{
            color: "#1976d2",
            weight: 5,
            opacity: 0.8,
          }}
        />
      )}
    </MapContainer>
  );
};

export default App;
