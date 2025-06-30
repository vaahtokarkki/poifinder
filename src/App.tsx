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
import { fetchRouteGeoJSON } from "./api/ors";
import { fetchOverpassMarkers, OverpassMarkerData } from "./api/overpass";
import Loading from "./components/Loading";
import SearchPoisButton from "./components/SearchPoisButton";
import { useUserPosition } from "./hooks/index";
import { CATEGORIES } from "./constants";
import { fetchSuggestions } from "./api/geocode";
import { parseCityFromPath, parseCategoryFromPath } from "./utils";
import JsonLdSeo from "./components/JsonLdSeo";

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
  const [category, setCategory] = useState<CATEGORIES[]>([]);
  const [loading, setLoading] = useState(false);
  const [displaySearch, setDisplaySearch] = useState(false);
  const [displaySearchItem, setDisplaySearchItem] = useState<string | null>(null); // "search" | "routes" | null
  const [markers, setMarkers] = useState<OverpassMarkerData[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  const [routeGeoJson, setRouteGeoJson] = useState<FeatureCollection | null>(null);
  const [appInitialized, setAppInitialized] = useState(false); // <-- add this line

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
  }, [searchPosition]); // Remove fetchMarkers from deps

  // Update URL with current map center on pan
  const handleMapPan = () => {
    setDisplaySearch(true);
    if (map) {
      const center = map.getCenter();
      const url = new URL(window.location.href);
      url.searchParams.set("lat", center.lat.toFixed(6));
      url.searchParams.set("lon", center.lng.toFixed(6));
      window.history.replaceState({}, "", url.toString());
    }
  };

  // On mount, if lat/lon or categories query params exist, set map center and categories (only if no city in path)
  useEffect(() => {
    if (map) {
      const city = parseCityFromPath(window.location.pathname);

      // Only update map center and categories from query params if no city in path
      if (!city) {
        const params = new URLSearchParams(window.location.search);
        const lat = params.get("lat");
        const lon = params.get("lon");
        if (lat && lon && !isNaN(Number(lat)) && !isNaN(Number(lon))) {
          map.setView([parseFloat(lat), parseFloat(lon)]);
        }

        // Parse categories from query params
        const categoriesParam = params.get("categories");
        if (categoriesParam) {
          const catArr = categoriesParam
            .split(",")
            .map((v) => parseInt(v, 10))
            .filter((v) => !isNaN(v) && Object.values(CATEGORIES).includes(v));
          if (catArr.length > 0) {
            setCategory(catArr as CATEGORIES[]);
          }
        }
      }
    }
  }, [map]);

  const handleMyLocationClick = () => {
    if (map && userPosition && userPosition.initialized) {
      map.setView([userPosition.lat, userPosition.lng], map.getZoom());
    }
  };

  const handleRouteSearch = async (
    start: [number, number] | null,
    end: [number, number]
  ) => {
    try {
      setLoading(true); // Start loading

      // Use user position if start is not provided or invalid
      let startCoords: [number, number] | undefined = start ?? undefined;
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
     
  }, [routeGeoJson, displaySearchItem]);

  // 1. Parse city/category/query params on mount (no fetchMarkers here)
  useEffect(() => {
    const parseAndSetFromUrl = async () => {
      const city = parseCityFromPath(window.location.pathname);
      const categoryStr = parseCategoryFromPath(window.location.pathname);

      // Set city position
      let citySet = false;
      if (city) {
        const results = await fetchSuggestions(city);
        if (results && results.length > 0) {
          setSearchPosition(results[0].coords);
          citySet = true;
        }
      }

      // Check for categories in query params first
      const params = new URLSearchParams(window.location.search);
      const categoriesParam = params.get("categories");
      let categoriesSet = false;
      if (categoriesParam) {
        const catArr = categoriesParam
          .split(",")
          .map((v) => parseInt(v, 10))
          .filter((v) => !isNaN(v) && Object.values(CATEGORIES).includes(v));
        if (catArr.length > 0) {
          setCategory(catArr as CATEGORIES[]);
          categoriesSet = true;
        }
      }

      // Set category if found in CATEGORIES enum (case-insensitive match to display string)
      if (!categoriesSet && categoryStr) {
        const categoryEntry = Object.entries(CATEGORIES).find(
          ([key, val]) =>
            typeof val === "number" &&
            key.toLowerCase() === categoryStr.replace(/ /g, "")
        );
        if (categoryEntry) {
          setCategory([categoryEntry[1] as CATEGORIES]);
        } else {
          // Try to match by display string in CATEGORY_CONFIG
          const { CATEGORY_CONFIG } = await import("./constants");
          const found = Object.entries(CATEGORY_CONFIG).find(
            ([, config]) => config.display.toLowerCase() === categoryStr
          );
          if (found) {
            setCategory([parseInt(found[0], 10) as CATEGORIES]);
          }
        }
      }
      setAppInitialized(true); // <-- set initialized after parsing
    };
    parseAndSetFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. When map and either searchPosition or lat/lon in query are ready, fetch markers (only once)
  useEffect(() => {
    if (!map || !appInitialized) return;
    const params = new URLSearchParams(window.location.search);
    const lat = params.get("lat");
    const lon = params.get("lon");
    // If lat/lon in query or searchPosition set by city, fetch markers
    if (
      (lat && lon && !isNaN(Number(lat)) && !isNaN(Number(lon))) ||
      searchPosition
    ) {
      fetchMarkers(false);
      setAppInitialized(false); // <-- prevent further runs
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, searchPosition, appInitialized]);

  // Update categories in URL query params when category changes (if no city in path)
  useEffect(() => {
    const city = parseCityFromPath(window.location.pathname);
    if (!city) {
      const url = new URL(window.location.href);
      if (category && category.length > 0) {
        url.searchParams.set("categories", category.join(","));
      } else {
        url.searchParams.delete("categories");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, [category, map]);

  return (
    <>
      <JsonLdSeo markers={markers} />
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
        <UserPositionMarker />
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
    </>
  );
};

export default App;
