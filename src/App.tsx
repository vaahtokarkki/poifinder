import { buffer } from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { Map, latLngBounds } from 'leaflet';
import { useCallback, useEffect, useRef, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMapEvent } from "react-leaflet";
import CategorySelect from "./components/CategorySelect";
import PoiMarkers from "./PoiMarkers";
import RoutesBar from "./components/RoutesBar";
import SearchBar from "./components/SearchBar";
import UserPositionMarker from "./components/UserPositionMarker";
import { fetchRouteGeoJSON } from "./api/ors.ts";
import { fetchOverpassMarkers, OverpassMarkerData } from "./api/overpass.ts";
import Loading from "./components/Loading";
import SearchPoisButton from "./components/SearchPoisButton";
import { useUserPosition } from "./hooks/index";
import { CATEGORIES } from "./constants";
import { fetchSuggestions } from "./api/geocode";
import { parseCityFromPath, parseCategoryFromPath, capitalize } from "./utils";
import { filterMarkersInBbox } from "./geo";
import JsonLdSeo from "./components/JsonLdSeo";
import { Alert, Snackbar } from '@mui/material';
import CategoryPresets from './components/CategoryPresets.tsx';
import BottomSheet from './components/BottomSheet.tsx';
import { InfoSheetContent, InfoSheetHeader } from './components/AppInfoPanel.tsx';
import SearchIconButton from './components/SearchIconButton.tsx';
import MyLocationIconButton from './components/MyLocationIconButton.tsx';
import DirectionsIconButton from './components/DirectionsIconButton.tsx';
import ShareIconButton from './components/ShareIconButton.tsx';
import { saveMapLocation, loadMapLocation } from "./utils/mapLocationStorage";
import { loadGPSLocation } from "./utils/gpsLocationStorage";
import { loadPois, savePois, poiCacheMatchesCategories, isPoiCacheUpToDate } from "./utils/poiStorage";
import { loadCategories, saveCategories, parseCategories, serializeCategories } from "./utils/categoryStorage";

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
  const [filteredMarkers, setFilteredMarkers] = useState<OverpassMarkerData[]>([]);
  const [map, setMap] = useState<Map | null>(null);
  const [routeGeoJson, setRouteGeoJson] = useState<FeatureCollection | null>(null);
  const [appInitialized, setAppInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);

  // Controls drawn on top of the map, their gestures are not map gestures
  const overlayRef = useRef<HTMLDivElement | null>(null);
  // The map must not be re-centered on GPS lock once the user has taken control
  const userMovedMapRef = useRef(false);
  // Timestamp of the latest setView we triggered ourselves, to tell our own
  // moves apart from the user zooming or dragging
  const programmaticMoveAtRef = useRef(0);
  const initialViewAppliedRef = useRef(false);
  const gpsLockCenteringDoneRef = useRef(false);
  // Bounding box the markers have been loaded or requested for
  const requestedBboxRef = useRef<[number, number, number, number] | null>(null);

  const setMapView = useCallback(
    (center: [number, number], zoom?: number) => {
      if (!map) return;
      programmaticMoveAtRef.current = Date.now();
      // Move without animating, so the new bounds are readable right away
      map.setView(center, zoom ?? map.getZoom(), { animate: false });
    },
    [map]
  );

  /** True while a move we triggered ourselves is being handled */
  const isProgrammaticMove = () => Date.now() - programmaticMoveAtRef.current <= 1000;

  const getBbox = (): [number, number, number, number] | null => {
    if (!map) return null;
    const bounds = map.getBounds();
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    return [southWest.lat, southWest.lng, northEast.lat, northEast.lng];
  };

  /**
   * Load the points of the current view. The categories can be given, so that
   * a selection made in the same event handler does not have to be in state yet
   */
  const fetchMarkers = async (categoriesOverride?: CATEGORIES[]) => {
    const bbox = getBbox();
    if (!map || !bbox) return;

    const categories = categoriesOverride ?? category;

    // Without categories there is nothing to query for, just empty the map
    if (categories.length === 0) {
      setMarkers([]);
      setFilteredMarkers([]);
      requestedBboxRef.current = null;
      setDisplaySearch(false);
      return;
    }

    setLoading(true);
    requestedBboxRef.current = bbox;

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
        null, // Don't use GPS-based around query, only bbox
        1000,
        categories,
        bbox,
        polygon,
        setLoadingStatus
      );
      setMarkers(data);
      setFilteredMarkers(filterMarkersInBbox(data, bbox));
      savePois({ markers: data, bbox, categories });
      setErrorMessage(null); // Clear error on success
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to fetch markers from Overpass API. Please try again.";
      console.error("Error fetching markers:", e);
      setErrorMessage(errorMsg);
    }
    setLoading(false);
    setLoadingStatus(null);
    setDisplaySearch(false);
  };

  useEffect(() => {
    // When user searches for a location, center the map and fetch markers from new bbox
    if (map && searchPosition) {
      // A search result is a deliberate choice, keep GPS lock from overriding it
      userMovedMapRef.current = true;
      setMapView(searchPosition);
      // Fetch markers after map centers on search result
      fetchMarkers();
    }
    setDisplaySearch(false);
  }, [searchPosition, map]);

  // Persist the current map center so it can be restored on the next visit
  const handleMapPan = () => {
    // Moves we made ourselves must not ask the user to search the area again
    if (!isProgrammaticMove()) {
      setDisplaySearch(true);
    }
    if (map) {
      const center = map.getCenter();
      const zoom = map.getZoom();
      saveMapLocation({ lat: center.lat, lng: center.lng, zoom });
    }
  };

  // Scrolling the preset row sideways or opening a select must not drag the map.
  // Leaflet's disableClickPropagation cannot be used here: it stops mousedown
  // at the overlay, and React listens for it further up on the root element, so
  // the controls inside would stop reacting altogether. Turning the map gesture
  // off for the duration of the press leaves the DOM events untouched.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !map) return;

    const pauseMapDrag = () => map.dragging.disable();
    const resumeMapDrag = () => map.dragging.enable();
    // The map has no business zooming while the pointer is over a control
    const stopMapZoom = (e: Event) => e.stopPropagation();

    overlay.addEventListener("pointerdown", pauseMapDrag);
    overlay.addEventListener("wheel", stopMapZoom);
    overlay.addEventListener("dblclick", stopMapZoom);
    // The press can end anywhere, e.g. over the menu a select just opened
    document.addEventListener("pointerup", resumeMapDrag);
    document.addEventListener("pointercancel", resumeMapDrag);

    return () => {
      overlay.removeEventListener("pointerdown", pauseMapDrag);
      overlay.removeEventListener("wheel", stopMapZoom);
      overlay.removeEventListener("dblclick", stopMapZoom);
      document.removeEventListener("pointerup", resumeMapDrag);
      document.removeEventListener("pointercancel", resumeMapDrag);
      map.dragging.enable();
    };
  }, [map]);

  // Track whether the user has moved the map themselves since initialization
  useEffect(() => {
    if (!map) return;
    const onDragStart = () => {
      userMovedMapRef.current = true;
    };
    const onZoomStart = () => {
      // Zooms right after one of our own setView calls are not user initiated
      if (!isProgrammaticMove()) {
        userMovedMapRef.current = true;
      }
    };
    map.on("dragstart", onDragStart);
    map.on("zoomstart", onZoomStart);
    return () => {
      map.off("dragstart", onDragStart);
      map.off("zoomstart", onZoomStart);
    };
  }, [map]);

  // On mount, center the map on the lat/lon query params, or on the last known
  // position (only if no city in path, which is resolved and centered below)
  useEffect(() => {
    if (map && !initialViewAppliedRef.current) {
      initialViewAppliedRef.current = true;
      const city = parseCityFromPath();

      // A city in the path is an explicit location, it wins over the GPS lock
      if (city) {
        userMovedMapRef.current = true;
      }

      // Only update the map center from the query params if no city in path
      if (!city) {
        const params = new URLSearchParams(window.location.search);
        const lat = params.get("lat");
        const lon = params.get("lon");
        const savedLocation = loadMapLocation();
        if (lat && lon && !isNaN(Number(lat)) && !isNaN(Number(lon))) {
          // Coordinates in the URL are explicit, they win over the GPS lock too
          userMovedMapRef.current = true;
          setMapView([parseFloat(lat), parseFloat(lon)], savedLocation?.zoom);
        } else {
          // Center on the last known position: GPS location from localStorage
          // first, then the last map location
          const gpsLocation = loadGPSLocation();
          if (gpsLocation) {
            setMapView([gpsLocation.lat, gpsLocation.lng], savedLocation?.zoom);
          } else if (savedLocation) {
            setMapView([savedLocation.lat, savedLocation.lng], savedLocation.zoom || 15);
          }
        }
      }
    }
  }, [map]);

  /**
   * Build a link to the current view: the map center and the selected
   * categories. The zoom level is not part of it, the app has no zoom param.
   */
  const buildShareUrl = (): string => {
    const url = new URL(import.meta.env.BASE_URL, window.location.origin);
    const center = map?.getCenter();
    if (center) {
      url.searchParams.set("lat", center.lat.toFixed(6));
      url.searchParams.set("lon", center.lng.toFixed(6));
    }
    if (category.length > 0) {
      url.searchParams.set("categories", serializeCategories(category));
    }
    return url.toString();
  };

  const handleShareClick = async () => {
    const shareUrl = buildShareUrl();
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("Link copied to clipboard");
    } catch (e) {
      // Dismissing the share sheet is not an error
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Error sharing the current view:", e);
      setErrorMessage("Could not copy the link to the clipboard.");
    }
  };

  const handleMyLocationClick = () => {
    if (map && typeof userPosition.lat === "number" && typeof userPosition.lng === "number") {
      setMapView([userPosition.lat, userPosition.lng]);
    }
  };

  // Center on the user once GPS locks, unless the map was moved since init
  useEffect(() => {
    if (
      !map ||
      !userPosition.hasGpsLock ||
      gpsLockCenteringDoneRef.current ||
      typeof userPosition.lat !== "number" ||
      typeof userPosition.lng !== "number"
    ) {
      return;
    }
    gpsLockCenteringDoneRef.current = true;
    if (userMovedMapRef.current) return;

    setMapView([userPosition.lat, userPosition.lng]);

    // The markers loaded so far can be from another area, e.g. when the user
    // has moved since the last visit, in which case fetch the new surroundings.
    // Without categories the app is still initializing, the initial load below
    // then takes care of the fetch.
    const loaded = requestedBboxRef.current;
    const isCovered =
      loaded &&
      userPosition.lat >= loaded[0] &&
      userPosition.lat <= loaded[2] &&
      userPosition.lng >= loaded[1] &&
      userPosition.lng <= loaded[3];
    if (!isCovered && category.length > 0) {
      fetchMarkers();
    }
  }, [map, userPosition, setMapView]);

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
        const bounds = latLngBounds(
          [minLat, minLon],
          [maxLat, maxLon]
        );
        userMovedMapRef.current = true;
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
      const bounds = latLngBounds(
        [minLat, minLon],
        [maxLat, maxLon]
      );
      userMovedMapRef.current = true;
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [displaySearchItem, routeGeoJson, map]);

  useEffect(() => {
    if (
      displaySearchItem === "routes" &&
      routeGeoJson &&
      markers.length === 0 // Only fetch if markers are empty
    ) {
      fetchMarkers();
    }

  }, [routeGeoJson, displaySearchItem]);

  // 1. Parse city/category/query params on mount (no fetchMarkers here)
  useEffect(() => {
    const parseAndSetFromUrl = async () => {
      const city = parseCityFromPath();
      const categoryStr = parseCategoryFromPath();

      if (city) {
        const results = await fetchSuggestions(city);
        if (results && results.length > 0) {
          setSearchPosition(results[0].coords);
        }
      }

      // Categories in the query params come from a shared link, they win
      const params = new URLSearchParams(window.location.search);
      const paramCategories = parseCategories(params.get("categories"));
      let categoriesSet = false;
      if (paramCategories.length > 0) {
        setCategory(paramCategories);
        categoriesSet = true;
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
          categoriesSet = true;
        } else {
          // Try to match by display string in CATEGORY_CONFIG
          const { CATEGORY_CONFIG } = await import("./constants");
          const found = Object.entries(CATEGORY_CONFIG).find(
            ([, config]) => config.display.toLowerCase() === categoryStr
          );
          if (found) {
            setCategory([parseInt(found[0], 10) as CATEGORIES]);
            categoriesSet = true;
          }
        }
      }

      // Nothing in the URL, fall back to the categories selected last time
      if (!categoriesSet) {
        const storedCategories = loadCategories();
        if (storedCategories.length > 0) {
          setCategory(storedCategories);
          categoriesSet = true;
        }
      }

      // If no category found from URL, storage or query, set Playgrounds and Toilets as default
      if (!categoriesSet) {
        setCategory([CATEGORIES.Playgrounds, CATEGORIES.Toilets]);
      }

      setAppInitialized(true); // <-- set initialized after parsing
    };
    parseAndSetFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. When map is ready and initialized, load the cached markers and fetch
  // fresh ones if the cache does not cover the current view (only once)
  useEffect(() => {
    if (!map || !appInitialized) return;
    setAppInitialized(false); // <-- prevent further runs

    const bbox = getBbox();
    const cache = loadPois();

    // Show cached markers right away, but only the ones of the active
    // categories, so the map is never empty while a fetch is running
    if (cache && bbox && poiCacheMatchesCategories(cache, category)) {
      setMarkers(cache.markers);
      setFilteredMarkers(filterMarkersInBbox(cache.markers, bbox));
      requestedBboxRef.current = cache.bbox;
    }

    // Only hit the network when the cache is stale or from another area
    if (!cache || !isPoiCacheUpToDate(cache, category, map.getCenter())) {
      fetchMarkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, appInitialized]);

  // Remember the selected categories, so they can be restored on the next visit
  useEffect(() => {
    if (category.length > 0) {
      saveCategories(category);
    }
  }, [category]);

  // Listen for user panning
  useEffect(() => {
    // moveend covers dragend and zoomend, and also our own setView calls
    const events = ["moveend", "resize"];
    if (!map) return;
    const onMove = () => {
      const bounds = map.getBounds();
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();
      const bbox: [number, number, number, number] = [southWest.lat, southWest.lng, northEast.lat, northEast.lng];
      setFilteredMarkers(filterMarkersInBbox(markers, bbox));
    };
    events.forEach(event => map.on(event, onMove));
    return () => {
      events.forEach(event => map.off(event, onMove));
    };
  }, [map, markers]);

  // A preset is a one tap selection, so search for its points right away
  const handlePresetSelect = (categories: CATEGORIES[]) => {
    setCategory(categories);
    fetchMarkers(categories);
  };

  // The heading of the info sheet, also the h1 of the page
  function getBrowsePointsTitle() {
    const city = parseCityFromPath();
    const category = parseCategoryFromPath();
    if (city) {
      return `${capitalize(category || "points of interest")} near ${capitalize(city)}`;
    }
    return "Find the useful places around you";
  }

  return (
    <>
      <JsonLdSeo markers={markers} />
      <MapContainer
        center={[60, 25]}
        zoom={15}
        scrollWheelZoom={true}
        className="map-root"
        zoomControl={false}
        ref={setMap}
      >
        <MapPanHandler onMove={handleMapPan} />
        <Loading active={loading} status={loadingStatus} />
        <div className="map-overlay-top" ref={overlayRef}>
          <SearchBar
            onSearch={(_, coords) => {
              if (coords && Array.isArray(coords) && coords.length === 2) {
                setSearchPosition(coords);
                setDisplaySearchItem(null);
              }
            }}
            visible={displaySearchItem === "search"}
            searchPosition={searchPosition}
            onClose={() => setDisplaySearchItem(null)}
          />
          {displaySearchItem === "routes" && (
            <div className="routes-card">
              <RoutesBar
                onSearch={handleRouteSearch}
                deleteRoute={() => {
                  setRouteGeoJson(null);
                  setMarkers([]); // Reset markers when route is deleted
                }}
                visible
                displayRouteInfo={!!routeGeoJson}
              />
            </div>
          )}
          <CategorySelect
            value={category}
            onChange={setCategory}
            // The search bar takes this slot while it is open
            visible={!displaySearchItem}
            onCommit={() => fetchMarkers()}
          />
          <CategoryPresets
            value={category}
            onSelect={handlePresetSelect}
            visible={displaySearchItem !== "routes"}
          />
        </div>
        <SearchPoisButton
          onClick={() => fetchMarkers()}
          visible={displaySearch && displaySearchItem !== "routes"}
        />
        <div className="map-controls">
          <ShareIconButton onClick={handleShareClick} />
          <DirectionsIconButton
            onClick={() => setDisplaySearchItem(displaySearchItem === "routes" ? null : "routes")}
            active={displaySearchItem === "routes"}
          />
          <SearchIconButton
            active={displaySearchItem === "search"}
            onClick={() => setDisplaySearchItem(displaySearchItem === "search" ? null : "search")} />
          <MyLocationIconButton
            onClick={handleMyLocationClick} />
        </div>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <UserPositionMarker position={userPosition} />
        <PoiMarkers
          markers={filteredMarkers}
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
      <BottomSheet>
        <InfoSheetHeader title={getBrowsePointsTitle()} />
        <InfoSheetContent />
      </BottomSheet>
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        // The sheet is drawn above the loading overlay, messages above both
        sx={{ zIndex: 2200 }}
      >
        <Alert
          onClose={() => setErrorMessage(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!shareMessage}
        autoHideDuration={4000}
        onClose={() => setShareMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ zIndex: 2200 }}
      >
        <Alert
          onClose={() => setShareMessage(null)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {shareMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default App;
