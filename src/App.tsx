import DirectionsIcon from '@mui/icons-material/Directions';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SearchIcon from '@mui/icons-material/Search';
import { buffer } from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import L from 'leaflet';
import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMapEvent, ZoomControl } from "react-leaflet";
import CategorySelect from "./components/CategorySelect";
import PoiMarkers from "./PoiMarkers";
import RoutesBar from "./components/RoutesBar";
import SearchBar from "./components/SearchBar";
import UserPositionMarker from "./components/UserPositionMarker";
import { geocodeLocation } from "./api/nominatim";
import { fetchRouteGeoJSON } from "./api/ors";
import { fetchOverpassMarkers, OverpassMarkerData } from "./api/overpass";
import Loading from "./components/Loading";
import SearchPoisButton from "./components/SearchPoisButton";
import { useUserPosition } from "./hooks/index";

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
  const [searchPosition, setSearchPosition] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState<string[]>(["leisure=playground"]);
  const [loading, setLoading] = useState(false);
  const [displaySearch, setDisplaySearch] = useState(false);
  const [displaySearchItem, setDisplaySearchItem] = useState<string | null>(null); // "search" | "routes" | null
  const [markers, setMarkers] = useState<OverpassMarkerData[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  const [hasCentered, setHasCentered] = useState(false);
  const [routeGeoJson, setRouteGeoJson] = useState<FeatureCollection | null>(null);

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

  const fetchMarkers = async (useSearchLocation: boolean = false) => {
    if (!map) return;
    setLoading(true);
    const bounds = map.getBounds();
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    const bbox: [number, number, number, number] = [southWest.lat, southWest.lng, northEast.lat, northEast.lng];

    let polygon: Feature<Polygon | MultiPolygon> | undefined = undefined;
    if (
      displaySearchItem === "routes" &&
      routeGeoJson
    ) {
      const feature = routeGeoJson.features[0]
      polygon = buffer(feature, 500, { units: 'meters' });
    }

    try {
      const data = await fetchOverpassMarkers(
        useSearchLocation ? searchPosition : null,
        1000,
        category,
        bbox,
        polygon
      );
      setMarkers(data);
    } catch (e) {
      console.error("Error fetching markers:", e);
    }
    setLoading(false);
    setDisplaySearch(false);
  };

  useEffect(() => {
    fetchMarkers(true);
    if (map && searchPosition) map.setView(searchPosition);
    setDisplaySearch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPosition]); // Remove fetchMarkers from deps

  const handleMapPan = () => {
    setDisplaySearch(true);
  };

  const handleMyLocationClick = () => {
    if (map && userPosition && userPosition.initialized) {
      map.setView([userPosition.lat, userPosition.lng], map.getZoom());
    }
  };

  const handleRouteSearch = async (
    start: [number, number],
    end: [number, number]
  ) => {
    try {
      setLoading(true); // Start loading

      // Use user position if start is not provided (should not happen with non-nullable)
      let startCoords: [number, number] = start;
      if (
        (!start || start.length !== 2) &&
        userPosition &&
        userPosition.initialized &&
        typeof userPosition.lat === "number" &&
        typeof userPosition.lng === "number"
      ) {
        startCoords = [userPosition.lat, userPosition.lng];
      }

      const endCoords: [number, number] = end;

      if (!startCoords || !endCoords) {
        alert("Could not get start or end location coordinates.");
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
      setLoading(false);
    } catch (err) {
      setLoading(false);
      alert("Failed to fetch route: " + err);
    }
  };

  useEffect(() => {
    if (
      displaySearchItem === "routes" &&
      routeGeoJson &&
      routeGeoJson.bbox &&
      map
    ) {
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
  }, [displaySearchItem, routeGeoJson, map]);

  useEffect(() => {
    if (
      displaySearchItem === "routes" &&
      routeGeoJson &&
      markers.length === 0 // Only fetch if markers are empty
    ) {
      fetchMarkers(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeGeoJson, displaySearchItem]);

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
        <SearchBar
          onSearch={(_, coords) => {
            if (coords && Array.isArray(coords) && coords.length === 2) {
              setSearchPosition(coords);
            }
          }}
          visible={displaySearchItem === "search"}
          searchPosition={searchPosition}
        />
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
      <SearchPoisButton
        onClick={() => fetchMarkers()}
        visible={displaySearch && displaySearchItem !== "routes"}
      />
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
      <UserPositionMarker
        position={
          typeof userPosition.lat === "number" && typeof userPosition.lng === "number"
            ? [userPosition.lat, userPosition.lng]
            : [0, 0]
        }
        isVisible={userPosition.initialized && typeof userPosition.lat === "number" && typeof userPosition.lng === "number"}
      />
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
