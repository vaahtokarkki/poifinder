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
import ZoomInHint from "./components/ZoomInHint";
import { useUserPosition } from "./hooks/index";
import { CATEGORIES } from "./constants";
import { fetchSuggestions } from "./api/geocode";
import { parseCitySlugFromPath, parseCategorySlugFromPath, slugToTitle } from "./utils";
import { filterMarkersInBbox } from "./geo";
import { findCity } from "./seo/cities";
import { findCategorySeo } from "./seo/categories";
import { readPageData } from "./seo/pageData";
import PrerenderedPage from "./components/PrerenderedPage";
import { Alert, Snackbar } from '@mui/material';
import CategoryPresets from './components/CategoryPresets.tsx';
import BottomSheet, { type BottomSheetHandle } from './components/BottomSheet.tsx';
import MapNotices, { type MapNotice } from './components/MapNotices.tsx';
import { InfoSheetContent, InfoSheetHeader } from './components/AppInfoPanel.tsx';
import SearchIconButton from './components/SearchIconButton.tsx';
import MyLocationIconButton from './components/MyLocationIconButton.tsx';
import DirectionsIconButton from './components/DirectionsIconButton.tsx';
import ShareIconButton from './components/ShareIconButton.tsx';
import MoreControlsIconButton from './components/MoreControlsIconButton.tsx';
import InfoIconButton from './components/InfoIconButton.tsx';
import { saveMapLocation, loadMapLocation } from "./utils/mapLocationStorage";
import { loadGPSLocation } from "./utils/gpsLocationStorage";
import { loadPois, savePois, poiCacheMatchesCategories, isPoiCacheUpToDate } from "./utils/poiStorage";
import { loadCategories, saveCategories, parseCategories, serializeCategories } from "./utils/categoryStorage";

/**
 * Points are only loaded from this zoom in. Further out the view spans a whole
 * region, which Overpass answers slowly and the map cannot draw readably
 */
const MIN_POI_ZOOM = 10;

/** How long the map has to stand still before the new view is loaded */
const AUTO_FETCH_DELAY_MS = 700;

/**
 * The query covers a little more than the screen on every side, so that a short
 * pan stays inside the loaded area instead of costing another Overpass query
 */
const FETCH_BBOX_PADDING = 0.25;

/** Grow a [south, west, north, east] box by {@link FETCH_BBOX_PADDING} */
const padBbox = ([south, west, north, east]: [number, number, number, number]):
  [number, number, number, number] => {
  const latPad = (north - south) * FETCH_BBOX_PADDING;
  const lngPad = (east - west) * FETCH_BBOX_PADDING;
  return [south - latPad, west - lngPad, north + latPad, east + lngPad];
};

/** Whether the whole of `inner` lies within `outer` */
const bboxContains = (
  outer: [number, number, number, number],
  inner: [number, number, number, number]
) =>
  inner[0] >= outer[0] &&
  inner[1] >= outer[1] &&
  inner[2] <= outer[2] &&
  inner[3] <= outer[3];

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
  const [displaySearchItem, setDisplaySearchItem] = useState<string | null>(null); // "search" | "routes" | null
  // Only kept in state so the zoom hint can be rendered from it
  const [zoom, setZoom] = useState<number | null>(null);
  const [markers, setMarkers] = useState<OverpassMarkerData[]>([]);
  const [filteredMarkers, setFilteredMarkers] = useState<OverpassMarkerData[]>([]);
  const [map, setMap] = useState<Map | null>(null);
  const [routeGeoJson, setRouteGeoJson] = useState<FeatureCollection | null>(null);
  const [appInitialized, setAppInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  /** Passing remarks rather than outcomes: no icon, no dismiss button */
  const [notices, setNotices] = useState<MapNotice[]>([]);
  const nextNoticeId = useRef(0);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  // The build time payload of a prerendered page, absent on a shared link or
  // an area search. Read once: a page load is the only thing that changes it
  const [pageData] = useState(readPageData);
  // The map tools start folded behind a single button, the column stays short
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const sheetRef = useRef<BottomSheetHandle>(null);

  /**
   * Stable across renders on purpose: PoiMarkers only re-renders when this or
   * the markers change, and re-rendering it rebuilds every marker on the map
   */
  const showNotice = useCallback((message: string) => {
    const id = ++nextNoticeId.current;
    // A run of quick taps stacks, but only three deep: past that the map is
    // covered by remarks about points nobody is looking at any more
    setNotices((current) => [...current, { id, message }].slice(-3));
    window.setTimeout(
      () => setNotices((current) => current.filter((notice) => notice.id !== id)),
      2600
    );
  }, []);

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
  // A pending auto load of the view the map was left in
  const autoFetchTimerRef = useRef<number | null>(null);
  // True while a query is running, so a pan does not race it with a second one
  const fetchInFlightRef = useRef(false);

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
      return;
    }

    // Too far out to query, the hint asks for a closer look instead
    if (map.getZoom() < MIN_POI_ZOOM) return;

    // Query a little wider than the screen, so the points are already there
    // when the user nudges the map
    const fetchBbox = padBbox(bbox);

    setLoading(true);
    fetchInFlightRef.current = true;
    requestedBboxRef.current = fetchBbox;

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
        fetchBbox,
        polygon,
        setLoadingStatus
      );
      setMarkers(data);
      setFilteredMarkers(filterMarkersInBbox(data, bbox));
      savePois({ markers: data, bbox: fetchBbox, categories });
      setErrorMessage(null); // Clear error on success
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to fetch markers from Overpass API. Please try again.";
      console.error("Error fetching markers:", e);
      setErrorMessage(errorMsg);
      // A failed query leaves nothing loaded, so the next pan may retry
      requestedBboxRef.current = null;
    }
    fetchInFlightRef.current = false;
    setLoading(false);
    setLoadingStatus(null);
  };

  /**
   * Load the points of the current view once the map settles. A drag or a fling
   * ends in a run of moveend events, so the load waits for the last of them,
   * and is skipped altogether while the view is inside the loaded area.
   */
  const scheduleAutoFetch = () => {
    if (autoFetchTimerRef.current) window.clearTimeout(autoFetchTimerRef.current);
    autoFetchTimerRef.current = window.setTimeout(() => {
      autoFetchTimerRef.current = null;
      if (!map || category.length === 0 || map.getZoom() < MIN_POI_ZOOM) return;
      // A route query follows the route rather than the view, panning along it
      // would only ask for the same points again
      if (displaySearchItem === "routes") return;

      const bbox = getBbox();
      if (!bbox) return;
      const loaded = requestedBboxRef.current;
      if (loaded && bboxContains(loaded, bbox)) return;

      // Wait for the running query rather than race it
      if (fetchInFlightRef.current) {
        scheduleAutoFetch();
        return;
      }
      fetchMarkers();
    }, AUTO_FETCH_DELAY_MS);
  };

  useEffect(
    () => () => {
      if (autoFetchTimerRef.current) window.clearTimeout(autoFetchTimerRef.current);
    },
    []
  );

  useEffect(() => {
    // When user searches for a location, center the map and fetch markers from new bbox
    if (map && searchPosition) {
      // A search result is a deliberate choice, keep GPS lock from overriding it
      userMovedMapRef.current = true;
      setMapView(searchPosition);
      // Fetch markers after map centers on search result
      fetchMarkers();
    }
  }, [searchPosition, map]);

  // Persist the current map center so it can be restored on the next visit,
  // and load the points of wherever the map was left
  const handleMapPan = () => {
    if (map) {
      const center = map.getCenter();
      const currentZoom = map.getZoom();
      setZoom(currentZoom);
      saveMapLocation({ lat: center.lat, lng: center.lng, zoom: currentZoom });
    }
    // Moves we made ourselves load their own points where they need to, and
    // the coverage check keeps this from repeating the query
    scheduleAutoFetch();
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
      const city = parseCitySlugFromPath();

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

  // Taking the hint: come in to the closest view that still loads points,
  // keeping the area the user was looking at in the middle
  const handleZoomInClick = () => {
    const center = map?.getCenter();
    if (!center) return;
    setMapView([center.lat, center.lng], MIN_POI_ZOOM);
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
      const citySlug = parseCitySlugFromPath();
      const categorySlug = parseCategorySlugFromPath();

      if (citySlug) {
        // A city we prerender carries its own coordinates, so the map centers
        // on the first frame instead of waiting for a geocoder
        const city = findCity(citySlug);
        if (city) {
          setSearchPosition([city.lat, city.lon]);
        } else {
          const results = await fetchSuggestions(citySlug.replace(/-/g, " "));
          if (results && results.length > 0) {
            setSearchPosition(results[0].coords);
          }
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

      // The category of the path, via the slug registry so that the aliases of
      // earlier sitemaps keep resolving
      if (!categoriesSet && categorySlug) {
        const categorySeo = findCategorySeo(categorySlug);
        if (categorySeo) {
          setCategory([categorySeo.category]);
          categoriesSet = true;
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

  // Keep the zoom in state from the first frame on: the hint has to be right
  // before the map is ever moved
  useEffect(() => {
    if (!map) return;
    const syncZoom = () => setZoom(map.getZoom());
    syncZoom();
    map.on("zoomend", syncZoom);
    return () => {
      map.off("zoomend", syncZoom);
    };
  }, [map]);

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

  /**
   * The heading of a route we did not prerender: a shared link, or a city that
   * is not in the registry yet. Prerendered pages bring their own h1
   */
  function getBrowsePointsTitle() {
    const citySlug = parseCitySlugFromPath();
    const categorySeo = findCategorySeo(parseCategorySlugFromPath());
    if (citySlug) {
      return `${categorySeo?.heading ?? "Points of interest"} in ${slugToTitle(citySlug)}`;
    }
    return "Find the useful places around you";
  }

  // The static markup the prerender left behind is only there to carry the
  // page before React is running. Now that the sheet renders the same content,
  // drop it rather than leave the page saying everything twice
  useEffect(() => {
    document.getElementById("seo-prerender")?.remove();
  }, []);

  return (
    <>
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
        <ZoomInHint
          onClick={handleZoomInClick}
          visible={
            zoom !== null && zoom < MIN_POI_ZOOM && displaySearchItem !== "routes"
          }
        />
        <div className="map-controls">
          <div
            className={`map-controls-group${controlsExpanded ? " open" : ""}`}
            // Folded away the buttons are still in the layout, so keep them out
            // of the tab order and out of the accessibility tree
            inert={!controlsExpanded}
          >
            <div className="map-controls-group-inner">
              <InfoIconButton onClick={() => sheetRef.current?.expand()} />
              <ShareIconButton onClick={handleShareClick} />
              <DirectionsIconButton
                onClick={() => setDisplaySearchItem(displaySearchItem === "routes" ? null : "routes")}
                active={displaySearchItem === "routes"}
              />
              <SearchIconButton
                active={displaySearchItem === "search"}
                onClick={() => setDisplaySearchItem(displaySearchItem === "search" ? null : "search")} />
            </div>
          </div>
          <MoreControlsIconButton
            expanded={controlsExpanded}
            onClick={() => setControlsExpanded(!controlsExpanded)}
          />
          <MyLocationIconButton
            onClick={handleMyLocationClick} />
        </div>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <UserPositionMarker position={userPosition} />
        <PoiMarkers markers={filteredMarkers} categories={category} onNotice={showNotice} />
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
      <BottomSheet ref={sheetRef}>
        {pageData ? (
          // The whole sheet, guide included. The root used to have the guide
          // appended here instead, which put it below the prerendered block at
          // runtime and left it out of the static HTML entirely; HomePageSection
          // renders it now, so what a crawler reads and what a visitor scrolls
          // through are one component in one order
          <PrerenderedPage data={pageData} />
        ) : (
          <>
            <InfoSheetHeader title={getBrowsePointsTitle()} />
            <InfoSheetContent />
          </>
        )}
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
      {/* Tapping a point with nothing to say should not cost a popup over the
          map, so it says it down here and goes away on its own */}
      <MapNotices notices={notices} />
    </>
  );
};

export default App;
