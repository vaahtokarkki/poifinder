import { bbox as bboxOf, buffer } from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { Map, latLngBounds, point as pixelPoint } from 'leaflet';
import { useCallback, useEffect, useRef, useState } from "react";
import { GeoJSON, MapContainer, useMapEvent } from "react-leaflet";
import BasemapLayer from "./components/BasemapLayer";
import CategorySelect from "./components/CategorySelect";
import LanguageSelect from "./components/LanguageSelect";
import PoiMarkers from "./PoiMarkers";
import RoutesBar from "./components/RoutesBar";
import SearchBar from "./components/SearchBar";
import UserPositionMarker from "./components/UserPositionMarker";
import { fetchRouteGeoJSON } from "./api/ors.ts";
import { fetchOverpassMarkers, OverpassMarkerData } from "./api/overpass.ts";
import type { OverpassProgress } from "./api/overpass.ts";
import Loading from "./components/Loading";
import LocatingChip from "./components/LocatingChip";
import ZoomInHint from "./components/ZoomInHint";
import { useUserPosition } from "./hooks/index";
import { requestDeviceHeadingPermission } from "./hooks/useDeviceHeading";
import { CATEGORIES } from "./constants";
import { fetchSuggestions } from "./api/geocode";
import { fetchIpLocation } from "./api/ipLocation";
import {
  parseCategorySlugFromPath,
  parseCitySlugFromPath,
  parseLocaleFromPath,
  slugToTitle,
} from "./utils";
import { filterMarkersInBbox } from "./geo";
import { findCity } from "./seo/cities";
import { categoryHeading, findCategorySeo, vocabFor } from "./seo/categories";
import { DEFAULT_LOCALE, interpolate, ui } from "./copy";
import type { Locale } from "./copy";
import { useLocale } from "./hooks/useLocale";
import { categoryPath, cityNames, cityPath, linkLocaleFor, linkLocaleForRoute } from "./seo/pageMeta";
import { readPageData } from "./seo/pageData";
import SheetPage from "./components/SheetPage";
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
import LayersIconButton from './components/LayersIconButton.tsx';
import LayersPanel from './components/LayersPanel.tsx';
import {
  noiseTilesConfigured,
  onGlMapChange,
  getGlMap,
  setNoiseVisible,
} from "./map/noiseTiles";
import { saveMapLocation, loadMapLocation } from "./utils/mapLocationStorage";
import { loadGPSLocation } from "./utils/gpsLocationStorage";
import { loadPois, savePois, poiCacheMatchesCategories, isPoiCacheUpToDate } from "./utils/poiStorage";
import { loadCategories, saveCategories, parseCategories, serializeCategories } from "./utils/categoryStorage";
import { analytics, type QueryTrigger } from "./analytics";
import { countryAt } from "./analytics/countries";

/**
 * Points are only loaded from this zoom in. Further out the view spans a whole
 * region, which Overpass answers slowly and the map cannot draw readably
 */
const MIN_POI_ZOOM = 10;

/** How long the map has to stand still before the new view is loaded */
const AUTO_FETCH_DELAY_MS = 700;

/**
 * The query covers more than the screen on every side, so that a short pan
 * stays inside the loaded area instead of costing another Overpass query.
 * A share of the view rather than a distance, so it means the same thing at
 * every scale: 0.25 loads a quarter of a screen past each edge.
 *
 * How much more depends on how close the map is, because the two ends of the
 * zoom range are asking for different things. Far out, the screen already spans
 * a region and the padding is what makes the query slow, so it stays where it
 * has always been. Close in, the same share is a couple of streets and cheap to
 * ask for, while the moves that leave it are not all pans the reader made:
 * opening a popup pans the map to fit it, which on a phone can be most of the
 * screen's height, and that must not cost a second query for the points that
 * are on the map already.
 */
const FETCH_BBOX_PADDING = {
  /** Wide views, where the padding is what a query costs */
  far: 0.25,
  /**
   * Close views. Enough that a popup's own pan lands well inside the loaded
   * area: Leaflet pans by up to the popup's height plus the room it keeps
   * around it, so anything short of a screenful has to be covered
   */
  near: 1,
  /** At or below this zoom, {@link FETCH_BBOX_PADDING.far} */
  farZoom: 13,
  /** At or above this zoom, {@link FETCH_BBOX_PADDING.near} */
  nearZoom: 16,
} as const;

/**
 * How far past the screen the query reaches at this zoom, as a share of the
 * view. Ramped rather than switched at a threshold, so that a zoom step in the
 * middle of the range does not throw away a loaded area by changing what
 * counts as covered.
 */
const bboxPaddingForZoom = (zoom: number): number => {
  const { far, near, farZoom, nearZoom } = FETCH_BBOX_PADDING;
  const progress = (zoom - farZoom) / (nearZoom - farZoom);
  return far + (near - far) * Math.min(Math.max(progress, 0), 1);
};

/** Grow a [south, west, north, east] box by {@link bboxPaddingForZoom} */
const padBbox = (
  [south, west, north, east]: [number, number, number, number],
  zoom: number
): [number, number, number, number] => {
  const padding = bboxPaddingForZoom(zoom);
  const latPad = (north - south) * padding;
  const lngPad = (east - west) * padding;
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

/**
 * The zoom an IP location is opened at. The lookup lands on a city rather than
 * a street, so the view is kept wide enough that the user's own surroundings
 * are somewhere on the screen, and still inside {@link MIN_POI_ZOOM}
 */
const IP_LOCATION_ZOOM = 13;

/**
 * The zoom a searched place opens at when the geocoder does not say how big it
 * is — a house number, a shop, a bus stop. The app's own default view, which is
 * close enough to read a street and wide enough to hold the next one along.
 */
const SEARCH_RESULT_ZOOM = 15;

/**
 * As close as a search is allowed to take the map.
 *
 * A geocoded doorway has an extent a few metres across, and fitting the map to
 * it lands on a view of one roof. Somebody who searched for a place wants to
 * see where it is, which is a question about its surroundings.
 */
const MAX_SEARCH_RESULT_ZOOM = 17;

/** Room left around a searched place, so it does not sit against the edge */
const SEARCH_FIT_PADDING_PX = 48;

/**
 * How close to open the map on a searched place.
 *
 * Panning without zooming was the old behaviour and it had a hole in it: a
 * search made while the map was opened right out moved to the place and left
 * it out there, below the zoom points are loaded at, so the answer to the
 * search was an empty map and a hint to come closer.
 *
 * Where the geocoder says how big the place is, the view is fitted to that: a
 * city fills the screen, a street is a street. Both bounds matter — the fit is
 * clamped so a country cannot take the map out past the zoom that loads
 * points, and a doorway cannot take it in past a view of one roof.
 */
const zoomForSearchResult = (
  map: Map,
  extent?: [number, number, number, number]
): number => {
  if (!extent) return SEARCH_RESULT_ZOOM;
  const [south, west, north, east] = extent;
  const fitted = map.getBoundsZoom(
    latLngBounds([south, west], [north, east]),
    false,
    pixelPoint(SEARCH_FIT_PADDING_PX, SEARCH_FIT_PADDING_PX)
  );
  return Math.min(MAX_SEARCH_RESULT_ZOOM, Math.max(MIN_POI_ZOOM, fitted));
};

/**
 * Whether the visit brings a location of its own: a city or coordinates in the
 * URL, the view the last visit was left in, or the GPS fix of an earlier
 * session. With none of these there is nothing to center the map on, and the
 * IP lookup is a better first guess than a hardcoded point on the map
 */
const hasKnownLocation = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  const lat = params.get("lat");
  const lon = params.get("lon");
  return Boolean(
    parseCitySlugFromPath() ||
      (lat && lon && !isNaN(Number(lat)) && !isNaN(Number(lon))) ||
      loadMapLocation() ||
      loadGPSLocation()
  );
};

const MapPanHandler = ({ onMove }: { onMove: (center: [number, number]) => void }) => {
  useMapEvent("moveend", (e) => {
    const map = e.target;
    const center = map.getCenter();
    onMove([center.lat, center.lng]);
  });
  return null;
};

const App = () => {
  // Subscribing here is what makes every ui() call in the tree below re-read
  // the deck when the language changes
  const [locale, setAppLocale] = useLocale();
  const { position: userPosition } = useUserPosition();
  const [searchPosition, setSearchPosition] = useState<[number, number] | null>(null);
  /**
   * The zoom that goes with {@link searchPosition}, when the thing that set it
   * had an opinion. A search from the box does; a city in the URL does not, and
   * keeps whatever view the visit arrived with
   */
  const [searchZoom, setSearchZoom] = useState<number | null>(null);
  /**
   * What last set {@link searchPosition}, so the query it causes can be
   * reported as what it was. Both paths run the same effect below, and calling
   * both a search made a city page load look like somebody typing.
   */
  const searchOriginRef = useRef<"city-page" | "place-search">("city-page");
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
  /**
   * Which mirror a running search has got to, when it has had to go looking.
   * Null the rest of the time, which is nearly always: see OverpassProgress
   */
  const [loadingProgress, setLoadingProgress] = useState<OverpassProgress | null>(null);
  // The build time payload of a prerendered page, absent on a shared link or
  // an area search. Read once: a page load is the only thing that changes it
  const [pageData] = useState(readPageData);
  // The map tools start folded behind a single button, the column stays short
  const [controlsExpanded, setControlsExpanded] = useState(false);
  /**
   * Whether the modelled noise bands are drawn. Off by default: it is an
   * overlay about the surroundings rather than about what was searched for,
   * and a map that greets everyone with a wash of colour they did not ask for
   * is a map people learn to distrust.
   *
   * This is only what is *painted*. The layer is in the style from the first
   * frame whatever this says, which is what lets a popup read the band while
   * the wash is off — see setNoiseVisible in map/noiseTiles.ts
   */
  const [noiseVisible, setNoiseVisible_] = useState(false);
  /** Whether the layers panel is open. Its own state: it is a panel, not a layer */
  const [layersOpen, setLayersOpen] = useState(false);

  /**
   * Open or close the layers panel, and say so.
   *
   * The one door in and out, because the panel has four ways of being shut and
   * only one of being opened: reporting from each of them separately is how a
   * report ends up with more opens than closes and no way to tell which of the
   * two numbers is the wrong one.
   */
  const toggleLayers = (open: boolean) => {
    analytics.layersPanelToggled(open);
    setLayersOpen(open);
  };

  /**
   * Paint the bands, or stop painting them.
   *
   * Also re-applied whenever the GL map is replaced, because the style is
   * rebuilt from scratch then and comes back at the default of hidden — a
   * reader who had the layer on would otherwise silently lose it on a basemap
   * reload. Subscribing costs nothing in a build with no tiles configured:
   * BasemapLayer publishes the map either way and this returns immediately
   */
  useEffect(() => {
    if (!noiseTilesConfigured) return;
    // setNoiseVisible takes null happily: the wish is remembered and applied
    // when the layer is installed, which now happens after the basemap has
    // drawn rather than with it
    const apply = () => setNoiseVisible(getGlMap(), noiseVisible);
    apply();
    return onGlMapChange(apply);
  }, [noiseVisible]);
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
  // The map must not be re-centered on GPS lock once the user has taken
  // control, or when it was restored to the view the last visit was left in
  const userMovedMapRef = useRef(false);
  // Timestamp of the latest setView we triggered ourselves, to tell our own
  // moves apart from the user zooming or dragging
  const programmaticMoveAtRef = useRef(0);
  const initialViewAppliedRef = useRef(false);
  const gpsLockCenteringDoneRef = useRef(false);
  // The IP lookup of a visit that has no location of its own. It is started
  // before the map exists, so the first view is centered as early as it can be
  const ipLocationRef = useRef<Promise<[number, number] | null> | null>(null);
  // Bounding box the markers have been loaded or requested for
  const requestedBboxRef = useRef<[number, number, number, number] | null>(null);
  // A pending auto load of the view the map was left in
  const autoFetchTimerRef = useRef<number | null>(null);
  /**
   * The query in the air, if there is one, and what it asked for.
   *
   * A pan must not race a running query with a second one, which is what this
   * was first for. It also carries the query's key, because two effects can
   * ask for the very same points in the same tick: on a city page the URL sets
   * searchPosition, whose effect centers the map and loads it, while the
   * initial load effect fires beside it for the same view. Both queries went
   * out, and the access log showed almost every session opening with the same
   * request twice — the crawlers included, which is the half nobody chose.
   *
   * A call that matches the one already running is handed that one's promise
   * instead of a second request. Only while it is running: the same query
   * later is a deliberate refresh and has to reach the server.
   */
  const fetchInFlightRef = useRef<{ key: string; promise: Promise<void> } | null>(null);

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
  const fetchMarkers = (
    categoriesOverride?: CATEGORIES[],
    trigger: QueryTrigger = "pan"
  ): Promise<void> => {
    const bbox = getBbox();
    if (!map || !bbox) return Promise.resolve();

    const categories = categoriesOverride ?? category;

    // Without categories there is nothing to query for, just empty the map
    if (categories.length === 0) {
      setMarkers([]);
      setFilteredMarkers([]);
      requestedBboxRef.current = null;
      return Promise.resolve();
    }

    // Too far out to query, the hint asks for a closer look instead
    if (map.getZoom() < MIN_POI_ZOOM) return Promise.resolve();

    // Query wider than the screen, so the points are already there when the
    // view moves a little — whether the reader nudged the map or a popup panned
    // it to fit itself on the screen
    const fetchBbox = padBbox(bbox, map.getZoom());

    let polygon: Feature<Polygon | MultiPolygon> | undefined = undefined;
    if (
      displaySearchItem === "routes" &&
      routeGeoJson
    ) {
      const feature = routeGeoJson.features[0]
      polygon = buffer(feature, 500, { units: 'meters' });
    }

    // Everything that decides what the server is asked, as one string. The
    // categories are sorted because the order they were picked in is not part
    // of the question; the route buffer is not spelled out because a route is
    // only ever queried once per route, so which one it is cannot differ while
    // a query for it is running
    const key = [
      [...categories].sort().join(","),
      fetchBbox.join(","),
      polygon ? "route" : "view",
    ].join("|");

    const inFlight = fetchInFlightRef.current;
    if (inFlight?.key === key) return inFlight.promise;

    // After the de-duplication above, so the report counts queries that were
    // really asked rather than the two effects that can ask for the same one
    analytics.categoriesQueried(categories, trigger);

    /*
     * And where that query was pointed. The middle of the area actually asked
     * about — the route's buffer when there is one, the padded view otherwise —
     * rather than the middle of the screen, so a route across a border is
     * counted where it was searched.
     *
     * Skipped silently when the outlines are not loaded yet, which is every
     * query in the first seconds of a visit. Waiting for them would mean
     * holding up the map for a line in a report, and countryAt is written so
     * that this stays a plain call with no promise in it
     */
    const [west, south, east, north] = polygon
      ? (bboxOf(polygon) as [number, number, number, number])
      : [fetchBbox[1], fetchBbox[0], fetchBbox[3], fetchBbox[2]];
    const country = countryAt((south + north) / 2, (west + east) / 2);
    if (country) analytics.overpassCountry(country, trigger);

    const promise = (async () => {
      setLoading(true);
      setLoadingProgress(null);
      requestedBboxRef.current = fetchBbox;

      try {
        const data = await fetchOverpassMarkers(
          null, // Don't use GPS-based around query, only bbox
          1000,
          categories,
          fetchBbox,
          polygon,
          setLoadingProgress
        );
        setMarkers(data);
        setFilteredMarkers(filterMarkersInBbox(data, bbox));
        savePois({ markers: data, bbox: fetchBbox, categories });
        setErrorMessage(null); // Clear error on success
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : ui().notices.fetchFailed;
        console.error("Error fetching markers:", e);
        analytics.overpassFailed(errorMsg);
        setErrorMessage(errorMsg);
        // A failed query leaves nothing loaded, so the next pan may retry
        requestedBboxRef.current = null;
      } finally {
        // Only when it is still this query that is registered. Anything with
        // the same key was handed this promise rather than replacing it, so
        // matching on the key is matching on ourselves
        if (fetchInFlightRef.current?.key === key) fetchInFlightRef.current = null;
        setLoading(false);
        setLoadingProgress(null);
      }
    })();

    fetchInFlightRef.current = { key, promise };
    return promise;
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
      setMapView(searchPosition, searchZoom ?? undefined);
      // Fetch markers after map centers on search result
      fetchMarkers(undefined, searchOriginRef.current);
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

  // A visit with nothing to restore starts its IP lookup right away, before
  // the map is even mounted: the initial load below waits for the answer, and
  // every millisecond of it is time the map spends on the wrong side of Europe
  useEffect(() => {
    if (hasKnownLocation()) return;
    ipLocationRef.current = fetchIpLocation();
  }, []);

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
        } else if (savedLocation) {
          // Pick up where the last visit left off. That view is a deliberate
          // choice as much as a search is, so the GPS lock must not pull the
          // map away from it once the fix arrives
          userMovedMapRef.current = true;
          setMapView([savedLocation.lat, savedLocation.lng], savedLocation.zoom || 15);
        } else {
          // Nothing saved yet: the GPS position of an earlier session is the
          // best guess to hold the map until this session gets its own fix.
          // With not even that, the IP lookup started above centers the map
          // once it answers
          const gpsLocation = loadGPSLocation();
          if (gpsLocation) {
            setMapView([gpsLocation.lat, gpsLocation.lng]);
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
    // Read once, so the failure below is reported against the way it was
    // actually tried rather than asked a second time
    const method = typeof navigator.share === "function" ? "native" : "clipboard";
    try {
      if (method === "native") {
        await navigator.share({ title: document.title, url: shareUrl });
        analytics.shared(method, true);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      analytics.shared(method, true);
      setShareMessage(ui().notices.linkCopied);
    } catch (e) {
      // Dismissing the share sheet is not an error
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Error sharing the current view:", e);
      analytics.shared(method, false);
      setErrorMessage(ui().notices.copyFailed);
    }
  };

  // Taking the hint: come in to the closest view that still loads points,
  // keeping the area the user was looking at in the middle
  const handleZoomInClick = () => {
    analytics.zoomHintTapped();
    const center = map?.getCenter();
    if (!center) return;
    setMapView([center.lat, center.lng], MIN_POI_ZOOM);
  };

  const handleMyLocationClick = () => {
    const hasFix =
      typeof userPosition.lat === "number" && typeof userPosition.lng === "number";
    analytics.myLocationUsed(hasFix);
    // iOS hands out compass readings only when they are asked for from inside
    // a tap, and this is the one tap that is unambiguously about where the
    // visitor is. Fire and forget: the centring below must not wait on a
    // permission sheet, and the compass is an extra either way
    void requestDeviceHeadingPermission();
    if (map && hasFix) {
      setMapView([userPosition.lat as number, userPosition.lng as number]);
    }
  };

  // Center on the user once GPS locks, unless the map was moved since init or
  // it already shows a restored view of the previous visit
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
      fetchMarkers(undefined, "gps");
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
        alert(ui().notices.shareRouteMissing);
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
      analytics.routeSearched(true);
      setLoading(false);
    } catch (err) {
      analytics.routeSearched(false);
      setLoading(false);
      alert(ui().notices.routeFailed + err);
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
      fetchMarkers(undefined, "route");
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
          searchOriginRef.current = "city-page";
          setSearchPosition([city.lat, city.lon]);
        } else {
          const results = await fetchSuggestions(citySlug.replace(/-/g, " "));
          if (results && results.length > 0) {
            searchOriginRef.current = "city-page";
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

    const initialLoad = async () => {
      // A visit with no location of its own centers on the IP lookup, and the
      // load waits for it: querying first would ask for the default view, an
      // area the user has never asked to see. The lookup gives up quickly, and
      // a GPS fix or a move by the user in the meantime takes the map instead
      const ipLocationPending = ipLocationRef.current;
      if (ipLocationPending) {
        ipLocationRef.current = null;
        const ipLocation = await ipLocationPending;
        if (ipLocation && !userMovedMapRef.current && !gpsLockCenteringDoneRef.current) {
          setMapView(ipLocation, IP_LOCATION_ZOOM);
        }
      }

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
        fetchMarkers(undefined, "initial");
      }
    };
    initialLoad();
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

  const zoomHintVisible =
    zoom !== null && zoom < MIN_POI_ZOOM && displaySearchItem !== "routes";

  // How often people end up too far out for the points to load. On the
  // transition, so this counts arrivals at that zoom rather than renders
  // spent there
  const zoomHintWasVisibleRef = useRef(false);
  useEffect(() => {
    if (zoomHintVisible && !zoomHintWasVisibleRef.current) {
      analytics.zoomHintShown();
    }
    zoomHintWasVisibleRef.current = zoomHintVisible;
  }, [zoomHintVisible]);

  // A preset is a one tap selection, so search for its points right away
  const handlePresetSelect = (categories: CATEGORIES[]) => {
    // The preset's own event says which chip was tapped; this says what that
    // left switched on, in the same words the picker's changes are counted in
    analytics.categoriesChanged(categories);
    setCategory(categories);
    fetchMarkers(categories, "preset");
  };

  /**
   * The heading of a route we did not prerender: a shared link, or a city that
   * is not in the registry yet. Prerendered pages bring their own h1
   */
  /**
   * Switching language: go to that language's page when one exists, swap the
   * words in place when it does not.
   *
   * The city decides. Berlin has a German tree, so German Berlin is a URL and
   * a visitor should end up at it — shareable, canonical, and the one Google
   * knows about. Oslo does not, so German Oslo is this page with German words
   * on it and the same URL, which is the honest thing to serve rather than a
   * /de/ path that was never written.
   *
   * The in-place swap only ever sits on top of English: from /de/berlin/ into
   * a language Berlin has no tree for, the fallback is the English page, never
   * another locale's, because that URL declares a language in its own markup.
   */
  function chooseLocale(next: Locale) {
    // First, because picking the language of a city page navigates below, and
    // a tracker call made after `location.assign` races the unload. Only a
    // real change: reopening the menu on the language already set is not a
    // choice, and counted it would make the current language look popular
    if (next !== locale) analytics.languageChosen(next);

    const citySlug = parseCitySlugFromPath();
    const city = citySlug ? findCity(citySlug) : undefined;
    const categorySlug = parseCategorySlugFromPath();
    // Same rule as arriving: what decides the tree is what this route has, and
    // a category page's locales are narrower than its city's
    const target = city
      ? categorySlug
        ? linkLocaleForRoute(city, categorySlug, next)
        : linkLocaleFor(city, next)
      : DEFAULT_LOCALE;
    const currentPrefix = parseLocaleFromPath();

    setAppLocale(next);

    // Only move if the tree the URL should be in has actually changed
    if (city && target !== currentPrefix) {
      window.location.assign(
        categorySlug
          ? categoryPath(city.slug, categorySlug, target)
          : cityPath(city.slug, target)
      );
    }
  }

  function getBrowsePointsTitle() {
    const citySlug = parseCitySlugFromPath();
    if (!citySlug) return ui().notices.fallbackSubtitle;

    // The same deck templates the prerendered pages use, rather than gluing a
    // heading to a city with an English "in". This is the path a route takes
    // when it has no prerendered payload — every route under `npm run dev`,
    // and in production a link to something the build did not write — and it
    // was the one place still assembling a title in English by hand.
    const city = findCity(citySlug);
    const names = city
      ? cityNames(city)
      : // Not in the registry, so there is no localized name and no inflected
        // form to have. The slug is all there is and it reads the same in
        // every language
        { city: slugToTitle(citySlug), cityIn: slugToTitle(citySlug) };

    const categorySeo = findCategorySeo(parseCategorySlugFromPath());
    if (!categorySeo) return interpolate(ui().page.cityTitle, names);

    return interpolate(ui().page.categoryHeading, {
      noun: categoryHeading(categorySeo, city ? vocabFor(city.countryCode) : "intl"),
      ...names,
    });
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
        // The zoom range used to come from the raster TileLayer, which carried
        // Leaflet's default ceiling of 18. A vector layer declares nothing of
        // the sort, so without these the map would zoom without end into a
        // basemap that stops having anything more to say. The floor is 1
        // rather than 0 because the GL map and Leaflet drift apart at 0
        minZoom={1}
        maxZoom={18}
        scrollWheelZoom={true}
        className="map-root"
        zoomControl={false}
        ref={setMap}
      >
        <MapPanHandler onMove={handleMapPan} />
        <div className="map-overlay-top" ref={overlayRef}>
          <SearchBar
            onSearch={(_, coords, extent) => {
              if (coords && Array.isArray(coords) && coords.length === 2) {
                analytics.searchResultChosen();
                // Fitting the extent needs the map to measure itself against.
                // There is always one under this, the search bar being a child
                // of the map, but a search must not go missing over that
                setSearchZoom(
                  map ? zoomForSearchResult(map, extent) : SEARCH_RESULT_ZOOM
                );
                searchOriginRef.current = "place-search";
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
          <div className="category-row">
            <CategorySelect
              value={category}
              onChange={setCategory}
              // The search bar takes this slot while it is open
              visible={!displaySearchItem}
              onCommit={() => fetchMarkers(undefined, "categories")}
            />
            <LanguageSelect
              value={locale}
              onChange={chooseLocale}
              // The same condition the category select uses: the search and
              // route panels both take this row for themselves
              visible={!displaySearchItem}
            />
          </div>
          <CategoryPresets
            value={category}
            onSelect={handlePresetSelect}
            visible={displaySearchItem !== "routes"}
          />
          {/* Last in the column, under the preset chips: a search running is
              the least of what is on this overlay, and the map stays usable
              throughout one */}
          <Loading active={loading} progress={loadingProgress} />
          {/* Under it again: a search is about the map, a missing fix is only
              about the dot on it */}
          <LocatingChip />
        </div>
        <ZoomInHint onClick={handleZoomInClick} visible={zoomHintVisible} />
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
                onClick={() => {
                  const opening = displaySearchItem !== "routes";
                  analytics.directionsPanelToggled(opening);
                  setDisplaySearchItem(opening ? "routes" : null);
                }}
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
        {/* The panel's own corner, opposite the tool column. Both it and its
            button exist only where there is an overlay to switch: with no tile
            server configured the panel would open on the one basemap there is
            and nothing to do with it */}
        {noiseTilesConfigured && (
          <div className="map-layers">
            {layersOpen && (
              <LayersPanel
                // Every way out of the panel — the close button, the scrim,
                // Escape — reports through here, so an open and its close are
                // one pair in the report rather than a count that only balances
                // for people who happen to close it the way they opened it
                onClose={() => toggleLayers(false)}
                noiseVisible={noiseVisible}
                onNoiseChange={(visible) => {
                  analytics.noiseLayerToggled(visible);
                  setNoiseVisible_(visible);
                }}
              />
            )}
            <LayersIconButton
              open={layersOpen}
              onClick={() => toggleLayers(!layersOpen)}
            />
          </div>
        )}
        <BasemapLayer />
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
      {/* The page label is for the one event the sheet reports, the reader
          reaching the bottom of the text — so that "read to the end" on the map
          root can be told from the same gesture on a city page. "map" is the
          route that was not prerendered at all: a shared link with coordinates,
          or an unknown city, which is the fallback content below */}
      <BottomSheet ref={sheetRef} page={pageData?.kind ?? "map"}>
        {pageData ? (
          // The whole sheet, guide included. The root used to have the guide
          // appended here instead, which put it below the prerendered block at
          // runtime and left it out of the static HTML entirely; the page
          // components render it now, so what a crawler reads and what a
          // visitor scrolls through are the same words in one component.
          // SheetPage is where the two orders part: see its comment for why a
          // visitor who can see the map leads with the guide and not the list
          <SheetPage data={pageData} />
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
