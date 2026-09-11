import React from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import ParkIcon from '@mui/icons-material/Park';
import { renderToString } from "react-dom/server";
import { categoryDisplay } from "./seo/categories";
import { interpolate, ui } from "./copy";
import { analytics } from "./analytics";
import { divIcon, latLngBounds, point } from "leaflet";
import type {
  LatLng,
  LatLngBounds,
  LatLngExpression,
  Map as LeafletMap,
  MarkerClusterGroup as LeafletClusterGroup,
  Point,
  PointExpression,
  Popup as LeafletPopup,
  PopupEvent,
} from "leaflet";
import {
  CATEGORY_CONFIG,
  CATEGORIES,
  filterMatchesPrimaryTag,
  matchesFilter,
} from "./constants";
import { shapeContains } from "./api/overpass";
import type {
  EnclosingBuilding as EnclosingBuildingData,
  OsmRef,
  OverpassMarkerData,
} from "./api/overpass";
import { TranslationError, translate } from "./api/translate";
import type { TranslationFailure } from "./api/translate";
import MarkerClusterGroup from "./components/MarkerClusterGroup";
import { shapeSamplePoint } from "./geo";
import PoiShape from "./components/PoiShape";
import NoiseSection, { NOISE_WORTH_KNOWING } from "./components/NoiseSection";
import AirSection from "./components/AirSection";
import { noiseCoverageAtCenter, noiseTilesConfigured } from "./map/noiseTiles";
import { airCoverageAtCenter, airTilesConfigured } from "./map/airTiles";
import { useEnclosingBuilding, useOsmElement } from "./hooks/useOsmElement";
import { PaidParkingIcon, PaidToiletIcon } from "./icons";
import {
  ADDRESS_RANK,
  CONSUMED_KEYS,
  TRANSLATABLE_KEYS,
  buildingRankForKey,
  capitaliseFirst,
  describeAddress,
  describeEdit,
  describeSurvey,
  formatOpeningHours,
  isInheritedFromBuilding,
  isTimetableKey,
  isWikiTag,
  labelFor,
  osmEditUrl,
  osmEditUrlForRef,
  rankForKey,
  wikiTagLink,
} from "./poiPopup";

/** Breathing room between an open popup and the edges of the map. */
const POPUP_EDGE_GAP_PX = 24;

/**
 * How far Leaflet keeps an open popup from the top left of the map when it pans
 * to fit it on the screen.
 *
 * The top edge that matters is not the top of the map but the bottom of the
 * controls floating over it: panning a popup to y = 24 tucks its heading under
 * the category select and the preset chips. That overlay changes height as the
 * search bar opens, the chips come and go, or the phone is turned, and Leaflet
 * reads these values when it pans rather than when the popup is created, so it
 * gets an object that measures the overlay at that moment instead of a number
 * that was right when the marker was drawn.
 */
const AUTO_PAN_PADDING_TOP_LEFT = {
  get x() {
    return POPUP_EDGE_GAP_PX;
  },
  get y() {
    const overlay = document.querySelector(".map-overlay-top");
    const overlayHeight = overlay?.getBoundingClientRect().height ?? 0;
    return Math.round(overlayHeight) + POPUP_EDGE_GAP_PX;
  },
  // Leaflet takes any { x, y } here and reads the pair as it pans, which is
  // what makes the getters above worth having. Its types only name the two
  // shapes that get written literally, a Point or a tuple
} as unknown as PointExpression;

/**
 * The room to leave around an outline when the map is moved to fit it.
 *
 * The same problem the popup padding above solves, and read the same way at
 * the moment of the move: the top of the map is under the controls, and on a
 * phone the foot of it is under the bottom sheet. Fitting a park to the bare
 * container would tuck a third of it behind furniture and call it visible.
 */
/**
 * How long a move of ours goes on being ours. Longer than Leaflet's own zoom
 * and pan animations, short enough that a reader who grabs the map right after
 * a fit is still the one holding it.
 */
const OWN_MOVE_GRACE_MS = 900;

/**
 * At this zoom and further out, opening a popup first zooms in on its point,
 * and closing it goes back to the view it was opened from.
 */
const ZOOM_TO_FEATURE_AT_OR_BELOW = 15;
/** How close that zoom goes for a point, or an outline small enough */
const FEATURE_ZOOM = 17;
/** How long the flight to a point takes, in seconds */
const FEATURE_FLY_IN_S = 0.36;
/** And the flight back when its popup closes */
const FEATURE_FLY_BACK_S = 0.6;

const shapeFitPadding = () => {
  const overlay = document.querySelector(".map-overlay-top");
  const overlayHeight = Math.round(overlay?.getBoundingClientRect().height ?? 0);
  const sheet = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--sheet-offset")
  );
  return {
    paddingTopLeft: [POPUP_EDGE_GAP_PX, overlayHeight + POPUP_EDGE_GAP_PX] as [number, number],
    paddingBottomRight: [
      POPUP_EDGE_GAP_PX,
      (Number.isFinite(sheet) ? sheet : 0) + POPUP_EDGE_GAP_PX,
    ] as [number, number],
  };
};

/**
 * Where to centre the map at `zoom` so that `bounds` is framed the way
 * fitBounds frames it, and the open popup sits clear of the edges the way its
 * own auto pan would leave it — both worked out before the move, so there is
 * one move rather than a zoom and then a correction.
 */
const centerFittingPopup = (
  map: LeafletMap,
  bounds: LatLngBounds,
  zoom: number,
  paddingTL: Point,
  paddingBR: Point,
  popup: LeafletPopup
): LatLng => {
  // As fitBounds centres the bounds inside its padding
  const center = map
    .project(bounds.getSouthWest(), zoom)
    .add(map.project(bounds.getNorthEast(), zoom))
    .divideBy(2)
    .add(paddingBR.subtract(paddingTL).divideBy(2));

  const element = popup.getElement();
  const anchorLatLng = popup.getLatLng();
  if (!element || !anchorLatLng) return map.unproject(center, zoom);

  // The popup's box relative to the point it hangs from, in pixels, which is
  // the same at every zoom
  const anchor = map.latLngToContainerPoint(anchorLatLng);
  const box = element.getBoundingClientRect();
  const container = map.getContainer().getBoundingClientRect();
  const offset = point(box.left - container.left - anchor.x, box.top - container.top - anchor.y);

  // Leaflet's own auto pan arithmetic, done for the view about to be
  const size = map.getSize();
  const at = map
    .project(anchorLatLng, zoom)
    .add(offset)
    .subtract(center.subtract(size.divideBy(2)));
  const panTL = point(AUTO_PAN_PADDING_TOP_LEFT);
  const panBR = point(POPUP_EDGE_GAP_PX, POPUP_EDGE_GAP_PX);
  let dx = 0;
  let dy = 0;
  if (at.x + box.width + panBR.x > size.x) dx = at.x + box.width - size.x + panBR.x;
  if (at.x - dx - panTL.x < 0) dx = at.x - panTL.x;
  if (at.y + box.height + panBR.y > size.y) dy = at.y + box.height - size.y + panBR.y;
  if (at.y - dy - panTL.y < 0) dy = at.y - panTL.y;

  return map.unproject(center.add([dx, dy]), zoom);
};

/**
 * How close two points have to be, in pixels on the screen, before they are
 * shown as one group, once the map is close enough to be read as a street.
 *
 * Small on purpose. The usual reason to cluster is to thin out a crowded map,
 * and that is the opposite of what this app is for: a map of toilets that
 * shows bubbles instead of toilets is useless. This only catches the points
 * that genuinely cover each other, and leaves everything a thumb can already
 * tell apart alone.
 *
 * Which is why it is the width of an icon and not less. It was fourteen, and
 * an icon is 25px wide (see RenderMarkerIcon), so there was a band between the
 * two where a pair drew as two overlapping icons and was never grouped — no
 * disc to tap, no way to fan them apart, and the lower one unreachable under
 * the upper. Two toilets 12 m apart at zoom 17 landed 16px apart and did
 * exactly that.
 *
 * The band did worse than that at the top of the zoom range, because of how
 * the plugin decides what a tap on a disc means: it fans the points out only
 * if they are still one group at the maximum zoom, and otherwise zooms in on
 * them. A pair 6 to 9 m apart was one group at 17 and two at 18, so tapping it
 * zoomed the map to 18 and left the pair 16 to 22px apart — the disc gone, the
 * icons overlapping, the map at its closest and nothing further to try. From
 * the outside that reads as the disc closing and taking the points with it.
 *
 * At the width of an icon both cases come out right, and they are the same
 * case: a pair that would overlap at maximum zoom is one group there too, so a
 * tap fans it out, and a pair that would not is zoomed apart into two icons
 * that no longer touch.
 */
const CLUSTER_RADIUS_PX = 28;

/** The zoom from which that tight grouping applies: a street and its doorways */
const TIGHT_CLUSTER_ZOOM = 17;

/**
 * How wide a group may get when the map is opened right out.
 *
 * A ceiling rather than a target. Past it the groups start swallowing places
 * that are nowhere near each other, and the map stops being a map of anything.
 */
const MAX_CLUSTER_RADIUS_PX = 80;

/** How fast the radius grows for each zoom level out. Measured by looking at it:
 * 1.7 is the point where a city stops being a wall of icons and the groups
 * still land where the places are */
const CLUSTER_RADIUS_GROWTH = 1.7;

/**
 * What the curve below grows from, which is not what it starts at.
 *
 * The two were one number until the tight radius had to double, and keeping
 * them one number would have doubled the whole curve with it — a city three
 * zoom levels out is not what was broken, and widening its groups to fix a
 * pair of overlapping icons at street level would trade a bug nobody has for a
 * map nobody asked for. So the curve is the one that was already there, and
 * the tight radius is a floor under it.
 */
const CLUSTER_GROWTH_BASE_PX = 14;

/**
 * How close two points have to be to be shown as one group, at this zoom.
 *
 * A single radius cannot serve both ends of the range. Fourteen pixels is
 * right against a street, where the question is which of two overlapping icons
 * a thumb will hit — and useless three zoom levels out, where a screen holding
 * a whole city and four categories at once is a solid field of markers with no
 * shape to it, and the points that matter are the ones you cannot see for the
 * rest. That was the map with several categories on: not crowded, unreadable.
 *
 * So the radius follows the zoom. Every level out roughly doubles what one
 * pixel covers on the ground, and the grouping widens with it until the cap:
 * 28px at street level, 40 at 15, 69 at 14, the cap from 13 out. Zooming in
 * walks it back down, which is what makes a group an invitation rather than a
 * wall — the points are one zoom away, and the count on the disc says how many
 * are waiting.
 *
 * Never below the width of an icon, at any zoom. Two icons that overlap have
 * to be one group wherever the map is, or the lower of them cannot be tapped
 * at all — see CLUSTER_RADIUS_PX. That floor only bites at 16, where the curve
 * would otherwise say 24; from 15 out the curve is already wider than an icon
 * and this changes nothing.
 */
const clusterRadiusForZoom = (zoom: number): number => {
  if (zoom >= TIGHT_CLUSTER_ZOOM) return CLUSTER_RADIUS_PX;
  const stepsOut = TIGHT_CLUSTER_ZOOM - zoom;
  return Math.min(
    MAX_CLUSTER_RADIUS_PX,
    Math.max(
      CLUSTER_RADIUS_PX,
      Math.round(CLUSTER_GROWTH_BASE_PX * CLUSTER_RADIUS_GROWTH ** stepsOut)
    )
  );
};

type DynamicMarkersProps = {
  markers: OverpassMarkerData[]; // <-- Use OverpassMarkerData here
  /** The categories switched on, which is why these points are on the map */
  categories: CATEGORIES[];
  /** Said in a line at the bottom of the screen, for points with nothing to show */
  onNotice?: (message: string) => void;
};

// Reusable icon rendering function
const RenderMarkerIcon = (
  iconElement: React.ReactElement,
  color: string = "black",
  /**
   * Whether to drop the category's colour: a point that is customers-only or
   * marked disused. Both are still worth having on the map — a café toilet is
   * a toilet, and a surveyor's "disused" is a claim rather than a demolition —
   * but neither is the same offer as the point next to it, and a reader
   * scanning for somewhere to go should be able to tell them apart without
   * opening either.
   *
   * So the category's colour is dropped for a light grey rather than dimmed.
   * The map is read by colour, and anything that keeps some of the hue is
   * saying "this one, a bit less" — which is a comparison the eye has to stop
   * and make at every marker. A grey one is out of that conversation at a
   * glance and still legible by its shape, which is what the reader falls back
   * on: these are the points to walk to when you were buying a coffee anyway,
   * and the condition is the first thing worth knowing about them.
   */
  muted: boolean = false
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
        border: 2px solid #fff6;
        color: ${muted ? MUTED_COLOR : color};
      ">
        ${renderToString(React.cloneElement(iconElement))}
      </span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

/** Every category, in declaration order, which is what makes the search below
 * deterministic: the selection arrives in the order it was clicked in */
const ALL_CATEGORIES = Object.values(CATEGORIES).filter(
  (value): value is CATEGORIES => typeof value === "number"
);

/**
 * The best category for a point among the ones offered, or null.
 *
 * A point can satisfy two categories at once, because some filters ask what a
 * place has rather than what it is: a library with a toilet matches both the
 * library filter and the toilets one that looks for a public building with a
 * toilet in it. The filter naming the place itself wins, whatever order the
 * categories are declared in; otherwise the first match stands.
 */
const findCategoryAmong = (
  marker: OverpassMarkerData,
  candidates: readonly CATEGORIES[]
): CATEGORIES | null => {
  if (!marker.tags) return null;
  let fallback: CATEGORIES | null = null;
  for (const cat of candidates) {
    for (const filter of CATEGORY_CONFIG[cat].filters) {
      if (!matchesFilter(marker.tags, filter)) continue;
      if (filterMatchesPrimaryTag(filter)) return cat;
      if (fallback === null) fallback = cat;
    }
  }
  return fallback;
};

/**
 * The category a point belongs to, found with the same filters it was fetched
 * with. The marker takes its icon and colour from this, and the popup its
 * heading, so a point looks like the same thing in both places.
 *
 * Only the categories that are switched on are considered, because they are
 * the reason the point is on the map at all. Searching every category instead
 * meant a library with a toilet in it came back as a library while the user
 * was looking for a toilet: the right answer to a question nobody asked, and
 * an icon that made the point look like it did not belong in the results.
 *
 * Something that matches nothing selected still gets an icon rather than the
 * uncategorised one. That is a point left over from the previous selection,
 * on screen until the next search replaces it, and it should keep looking
 * like whatever it is until then.
 */
const findCategory = (
  marker: OverpassMarkerData,
  selected: readonly CATEGORIES[]
): CATEGORIES | null =>
  findCategoryAmong(marker, selected) ?? findCategoryAmong(marker, ALL_CATEGORIES);

/**
 * One icon per category, built once and handed to every marker of that kind.
 *
 * react-leaflet calls marker.setIcon whenever the icon prop is a different
 * object, and setIcon throws away the marker's DOM element and builds a new
 * one. Returning a fresh divIcon per render meant every unrelated state change
 * rebuilt every marker on the map, and a click that spanned one of those
 * rebuilds was lost: the first tap after a message appeared did nothing.
 */
const iconCache = new Map<string, ReturnType<typeof divIcon>>();

/**
 * The badged shape to use when a point of this category charges. Only the
 * categories people actually expect to be free sometimes and not others are
 * here: a fee on a fuel station says nothing, a fee on a toilet or a car park
 * decides whether you walk there at all.
 */
const PAID_ICONS: Partial<Record<CATEGORIES, React.ReactElement>> = {
  [CATEGORIES.Toilets]: <PaidToiletIcon />,
  [CATEGORIES.Parking]: <PaidParkingIcon />,
};

/**
 * Pink for a toilet with a changing table.
 *
 * Colour rather than another badge, because the corner is already spoken for by
 * the fee and these two facts are independent: a toilet can charge and have a
 * changing table, and someone carrying a baby needs to see both. Two facts, two
 * channels, no precedence to get wrong.
 */
const CHANGING_TABLE_COLOR = "#E91E63";

const hasChangingTable = (category: CATEGORIES | null, marker: OverpassMarkerData) =>
  category === CATEGORIES.Toilets && marker.tags?.changing_table === "yes";

/**
 * Whether getting in means being a customer first. Any category: a toilet, a
 * car park and a drinking fountain behind a till are the same proposition to
 * somebody deciding whether to walk there.
 */
const isCustomersOnly = (marker: OverpassMarkerData) =>
  marker.tags?.access === "customers";

/**
 * Whether a surveyor has marked the thing as no longer in use.
 *
 * `disused=yes` on an otherwise ordinary point, which is the only form of this
 * that can reach the map: the commoner OpenStreetMap idiom is the `disused:`
 * key prefix — `disused:amenity=toilets` — and an object tagged that way no
 * longer carries `amenity=toilets` at all, so Overpass never returns it and
 * there is nothing here to grey.
 */
const isDisused = (marker: OverpassMarkerData) => marker.tags?.disused === "yes";

/**
 * Whether the point is drawn in grey rather than its category's colour.
 *
 * Two conditions, one appearance, and deliberately so. "You have to buy
 * something" and "this may not be there any more" are different facts, but
 * they are the same *decision*: do not count on this one. A reader scanning a
 * street for a toilet needs that in one glance, and giving the two conditions
 * separate colours would make them compare shades instead of reading a map.
 * The popup is where the difference is spelled out.
 */
const isMuted = (marker: OverpassMarkerData) =>
  isCustomersOnly(marker) || isDisused(marker);

/**
 * What a muted point is drawn in instead of its category's colour.
 *
 * Light enough to drop out of the scan and dark enough to keep the icon's shape
 * readable against the white disc it sits on — the shape is all that is left to
 * say what the point is once the hue has gone. See RenderMarkerIcon.
 */
const MUTED_COLOR = "#737474";

/** The default of {@link RenderMarkerIcon}, for a point of no known category */
const UNCATEGORISED_COLOR = "black";

/**
 * The colour a point is drawn in, wherever it is drawn: the marker, the popup
 * heading, and the outline of the way or relation behind it. One point is one
 * colour, so the shape that appears under an open popup is recognisably the
 * thing whose popup it is.
 */
const getMarkerColor = (
  marker: OverpassMarkerData,
  selected: readonly CATEGORIES[]
): string => {
  const category = findCategory(marker, selected);
  if (hasChangingTable(category, marker)) return CHANGING_TABLE_COLOR;
  return category !== null ? CATEGORY_CONFIG[category].color : UNCATEGORISED_COLOR;
};

const getMarkerIcon = (marker: OverpassMarkerData, selected: readonly CATEGORIES[]) => {
  const category = findCategory(marker, selected);
  const paidIcon = marker.tags?.fee === "yes" && category !== null
    ? PAID_ICONS[category]
    : undefined;
  const changingTable = hasChangingTable(category, marker);
  const muted = isMuted(marker);

  /**
   * Keyed as a string so the variants share the cache with everything else.
   * Category 0 is a real category and a falsy number, so the null check stays
   * explicit rather than becoming a ??
   */
  const key =
    category === null
      ? `uncategorised:${muted ? "muted" : "open"}`
      : `${category}:${paidIcon ? "paid" : "free"}:${changingTable ? "baby" : "plain"}:${
          muted ? "muted" : "open"
        }`;

  let icon = iconCache.get(key);
  if (!icon) {
    icon =
      category === null
        ? RenderMarkerIcon(<ParkIcon />, UNCATEGORISED_COLOR, muted)
        : RenderMarkerIcon(
            paidIcon ?? CATEGORY_CONFIG[category].icon,
            getMarkerColor(marker, selected),
            muted
          );
    iconCache.set(key, icon);
  }
  return icon;
};

/**
 * A value is punctuated for people, and the two marks need opposite treatment.
 *
 * The underscore is still a machine separator — `fine_gravel` is meant to be
 * read as "fine gravel" — so it goes. The colon is not: in a value it is a
 * clock, and turning it into a space renders `05:00-24:00` as `05 00-24 00`,
 * which is how opening hours came out looking broken. Keys can lose their
 * colons because no key holds a time; values cannot.
 *
 * A semicolon is how OpenStreetMap writes a list inside one value:
 * `diaper=room;bench`, `cuisine=pizza;pasta`. Rendered raw it reads as a typo
 * rather than as two answers, so it becomes the comma a reader expects. The
 * surrounding whitespace goes with it, because contributors write the separator
 * as ";", "; " and " ; " interchangeably and all three mean one thing.
 */
/**
 * A tag value as words.
 *
 * Looked up in the deck first, which covers the closed half of the vocabulary
 * — `yes`, `no`, `limited` and the dozen others that answer most of what a
 * popup is asked. Anything else is the open half (operators, materials,
 * socket counts) and is shown as written with its punctuation cleaned up,
 * which is the only thing that can be done with a value nobody enumerated.
 *
 * A semicolon list is translated item by item, because `access=customers;permit`
 * is two values rather than a phrase.
 */
const formatValue = (value: string): string => {
  const table = ui().poi.values;
  const parts = value.split(/\s*;\s*/).map((part) => {
    const known = table[part.trim().toLowerCase()];
    return known ?? capitaliseFirst(part.replace(/_/g, " "));
  });
  return parts.join(", ");
};

const isUrl = (val: string) => /^https?:\/\/|^www\./i.test(val);

/**
 * "facebook.com/waysidecc" rather than "Open website". Where a link goes is
 * the thing worth knowing before tapping it, and a full URL is far too long
 * for a popup, so the scheme, the www and the query string come off.
 */
const formatLinkLabel = (href: string) => {
  let label: string;
  try {
    const url = new URL(href);
    const path = url.pathname.replace(/\/$/, "");
    label = url.hostname.replace(/^www\./i, "") + path + (url.search ? "/…" : "");
  } catch {
    label = href.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  }
  return label.length > 36 ? `${label.slice(0, 35)}…` : label;
};

/**
 * Tags that say nothing a visitor standing in front of the place needs: what
 * the category already said, addressing meta, and the wiki cross references.
 */
const isDisplayableTag = (key: string, value: string) => {
  if (key === "access" && value === "yes") return false;
  /**
   * Read by a row that is written rather than listed: the address, and when it
   * was last checked. Listing them again underneath would say everything twice,
   * in worse words the second time
   */
  if (CONSUMED_KEYS.has(key)) return false;
  if (key.startsWith("check_date")) return false;
  /**
   * `fee=yes` used to be hidden here alongside access=yes, on the grounds that
   * it was one more thing to say about a point that was already saying enough.
   * It has to be shown now: the marker carries a currency badge for it, and a
   * point that advertises a fee on the map and then omits it from the popup
   * reads as the map having got it wrong. access=yes stays hidden, because
   * being allowed in is what a reader already assumes of a point on this map.
   */
  if (["leisure", "type", "amenity"].includes(key)) return false;
  /**
   * What kind of building it is, and how it is put together. A point standing
   * in a building is largely described by that building — a toilet found in a
   * retail block, a library in a school — and hiding it left those popups with
   * nothing to say. `building=yes` is the exception: it only repeats that the
   * thing on the map is a building
   */
  if (key === "building") return value !== "yes";
  /**
   * What it is made of and how tall it is, which is how somebody picks the
   * right red brick building out of a street. `building:parts` and
   * `building:min_level` are the exceptions: they are notes about how the 3D
   * model of the building is put together, and mean nothing on the ground
   */
  if (key.startsWith("building:"))
    return key !== "building:parts" && key !== "building:min_level";
  /**
   * The exceptions among the wiki tags, which are otherwise cross references
   * between databases with nothing behind them for a reader. `wikipedia` is an
   * article about the thing on the map, and for a memorial or a viewpoint it is
   * the only tag with anything to say; `wikidata` is an id rather than prose,
   * but shown as a link to the item it makes the same offer in fewer words.
   * The namespaced forms — `brand:wikidata`, `operator:wikipedia` — say the
   * same thing about one of the point's own facts, and are the common case in
   * the data rather than the exception; see isWikiTag.
   *
   * Only ever when the value is one a link can be built from. A wiki tag that
   * cannot be linked is a bare `Q126728228` in the middle of the popup, which
   * is the one shape this row must never take
   */
  if (isWikiTag(key)) return wikiTagLink(key, value) !== undefined;
  if (["ref", "addr", "building", "wiki", "roof"].some(prefix => key.startsWith(prefix))) return false;
  if (key.startsWith("name") && key !== "name") return false;
  return true;
};

/**
 * The two values that answer a yes or no question: whether there is a fee,
 * whether a wheelchair gets in, whether the water is drinkable. They get the
 * shape of a chip, which is what carries the answer at a glance — and the
 * colour, in the one case a chip is not grey.
 *
 * Only these two. `limited`, `permissive` and the rest of the access
 * vocabulary used to be chipped alongside them, and it made the popup read as
 * though every one of them were a verdict of the same kind. They are not:
 * "yes" and "no" close a question, while "limited" opens one, and dressing the
 * two alike put a qualification in the shape of an answer. Set as plain text
 * they read as what they are, a value worth reading rather than a badge.
 */
const YES_NO_ANSWERS = new Set(["yes", "no"]);

/**
 * `access=customers` is the exception among the qualifications, and it gets
 * the chip.
 *
 * It closes the question the same way a yes or a no does — you are getting in
 * if you buy something, and you are not if you do not — and it is the one
 * access value the map draws differently, its colour drained out of it. A
 * reader who picked that marker out of the map has already been told there is
 * a condition; the popup is where they find out what it is, and it should be
 * the line their eye lands on rather than one more grey row among twelve.
 * Hence the weight on it as well as the shape.
 */
const isCustomersChip = (key: string, value: string) =>
  key === "access" && value.toLowerCase() === "customers";

/**
 * Words that are cheap to spot and very hard to write by accident in another
 * language. Present in useful numbers, the text is English.
 */
const ENGLISH_FUNCTION_WORDS =
  /\b(the|and|of|is|are|at|for|with|to|in|on|from|free|open|next|near|only|during)\b/g;

/** Letters English never uses, which no amount of function words outweighs */
const NON_ENGLISH_LETTERS = /[äöåøæßñçéèêëüõšžłđğ]/i;

/** Greek, Cyrillic, Hebrew, Arabic, kana and Han: not English, no guesswork */
const NON_LATIN_SCRIPT =
  /[Ͱ-ϿЀ-ӿ֐-׿؀-ۿ぀-ヿ一-鿿]/;

/**
 * Whether a value reads as English.
 *
 * Two distinct function words is the bar, and it is set there because one is
 * not enough: German "Eingang in der Halle" contains "in", and suppressing the
 * translation on that basis would hide the link from exactly the reader who
 * needed it. The exception is a value too short to contain two of anything —
 * "Free public toilet" is three words and unambiguously English — where one
 * will do provided the text is otherwise plain ASCII.
 */
function looksEnglish(value: string): boolean {
  const hits = new Set(value.toLowerCase().match(ENGLISH_FUNCTION_WORDS) ?? []).size;
  if (hits >= 2) return true;
  const words = value.trim().split(/\s+/).length;
  return hits === 1 && words <= 3 && !NON_ENGLISH_LETTERS.test(value);
}

/**
 * Whether to put a translate link under a value.
 *
 * The two mistakes this can make are not equally bad. Offering a translation of
 * text that turned out to be English costs the reader a link they ignore;
 * withholding one from text they cannot read costs them the feature entirely,
 * silently, in the one case it existed for. So the answer defaults to yes, and
 * only positive evidence — the tag naming its own language, or English sitting
 * there in plain sight — takes the link away.
 */
function shouldOfferTranslation(key: string, value: string): boolean {
  if (!TRANSLATABLE_KEYS.test(key)) return false;
  // A URL, a phone number, a bare reference: nothing a translator can help with
  if (isUrl(value) || !/\p{L}\p{L}/u.test(value)) return false;
  // One lowercase word is a value picked from a list — `yes`, `limited`,
  // `room` — whatever key it arrived under. Nothing a translator can improve
  if (/^[a-z_]+$/.test(value.trim())) return false;

  // `description:en` says what it is in, which beats anything guessed from the
  // text itself. A suffix is only a language when it is two letters long:
  // `wheelchair:description` ends in a word, not a code
  const tagged = key.match(/:([a-z]{2})$/)?.[1];
  if (tagged) return tagged !== "en";

  if (NON_LATIN_SCRIPT.test(value)) return true;
  if (looksEnglish(value)) return false;
  return true;
}

/** What to say when the service declined, in the reader's terms rather than its own */
const failureMessage = (failure: TranslationFailure): string => {
  const t = ui().translate;
  return failure === "same-language" ? t.sameLanguage : failure === "quota" ? t.quota : t.failed;
};

/**
 * A tag value with a translate link under it.
 *
 * The translation replaces the value in place rather than appearing beside it,
 * because a popup on a phone has no room to show a sentence twice, and the link
 * turns into the way back. Nothing is fetched until it is asked for: the
 * allowance this spends belongs to the visitor, and a popup that translated
 * itself on open would spend it on values nobody read.
 */
const TranslatableValue: React.FC<{value: string; isProse: boolean}> = ({
  value,
  isProse,
}) => {
  const [translation, setTranslation] = React.useState<string | null>(null);
  const [showTranslation, setShowTranslation] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [failure, setFailure] = React.useState<TranslationFailure | null>(null);

  const handleClick = () => {
    if (translation) {
      setShowTranslation(current => !current);
      return;
    }
    setPending(true);
    setFailure(null);
    translate(value).then(
      result => {
        setTranslation(result);
        setShowTranslation(true);
        setPending(false);
      },
      error => {
        setFailure(error instanceof TranslationError ? error.reason : "failed");
        setPending(false);
      }
    );
  };

  const showing = showTranslation && translation !== null;
  /**
   * The original goes through the same formatting it would have had without
   * this component wrapped around it. A translation does not: it comes back as
   * a sentence, and formatValue rewrites the punctuation of tag values
   */
  const text = showing ? translation : isProse ? value : formatValue(value);

  // Asking again after the quota ran out, or after being told the text is
  // already readable, spends a request to be told the same thing
  const retryable = failure === null || failure === "failed";

  const label = pending
    ? ui().translate.pending
    : translation
      ? showing
        ? ui().translate.showOriginal
        : ui().translate.showTranslation
      : ui().translate.action;

  return (
    <>
      {text}
      {/* The notes come first so the action itself ends up flush against the
          right margin, where every other value in the popup ends */}
      <span className="poi-popup-translate-line">
        {failure && (
          <span className="poi-popup-translate-note">{failureMessage(failure)}</span>
        )}
        {retryable && (
          <button
            type="button"
            className="poi-popup-translate"
            onClick={handleClick}
            disabled={pending}
          >
            {label}
          </button>
        )}
      </span>
    </>
  );
};

/**
 * The wiki page for a tag key, where what the values mean is written down.
 * Reached through the row's own label rather than an icon next to it: the
 * label already names the tag, and a popup on a phone has no room for more.
 */
const tagWikiUrl = (key: string) =>
  `https://wiki.openstreetmap.org/wiki/Key:${encodeURIComponent(key)}`;

/**
 * A value picked from a list rather than typed: `apartments`, `unisex`,
 * `fine_gravel`. One lowercase word in the tagging alphabet, and short enough
 * to be a code rather than a sentence.
 */
const ENUMERATED_VALUE = /^[a-z][a-z0-9_]{0,29}$/;

/**
 * The keys whose value is a name, a number, an identifier or a piece of prose,
 * whatever shape it happens to arrive in. `operator=city` is a lowercase word
 * and names an organisation; `capacity=4` is a count. Neither has a page.
 */
const FREE_TEXT_KEYS =
  /^(name|operator|brand|network|ref|phone|email|website|url|wikipedia|wikidata|capacity|level|charge|height|width|ele|start_date|inscription|description|note|fixme)$|^(addr|contact|name|ref|survey|operator|brand):/;

/**
 * The wiki page for a tag as a whole — `building=apartments` — where what that
 * particular value means is written down, which is the question the key's own
 * page usually cannot answer in one line.
 *
 * Offered only where a page plausibly exists. The wiki documents values, not
 * strings: there is a page for `building=apartments` and none for
 * `name=Kamppi`, and a link to a page that is not there is worse than no link,
 * because it is only discovered after the tap. Hence the two tests — the value
 * has to look like one picked from a list, and the key has to be one whose
 * values come from a list at all.
 */
const tagValueWikiUrl = (key: string, value: string): string | undefined => {
  if (!ENUMERATED_VALUE.test(value) || FREE_TEXT_KEYS.test(key)) return undefined;
  /**
   * A yes or a no is not a kind of thing and has nothing of its own to
   * explain: whatever there is to say about `lit=yes` is said on the page for
   * `lit`, which the label beside it already leads to. Half of these pages do
   * not exist either, and a link is worth having only when it lands somewhere
   */
  if (YES_NO_ANSWERS.has(value)) return undefined;
  return `https://wiki.openstreetmap.org/wiki/Tag:${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
};

/**
 * A tag value, linked to what it means where there is somewhere to link to.
 *
 * Set as text rather than as a link: the same quiet treatment the label above
 * it gets, because the reader came for the value and not for a page about it,
 * and a popup where every second row is blue reads as a list of links rather
 * than as an account of a place. The dotted underline on hover is the offer.
 */
const ValueText: React.FC<{ value: string; tag: string; wikiUrl?: string }> = ({
  value,
  tag,
  wikiUrl,
}) =>
  wikiUrl ? (
    <a
      className="poi-popup-tag-link"
      href={wikiUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`${tag}=${value} on the OpenStreetMap wiki`}
    >
      {formatValue(value)}
    </a>
  ) : (
    <>{formatValue(value)}</>
  );

/** One line of the popup: a label, a value, and how the value should be read */
type PopupRow = {
  /** React key, and the tag the label links to on the wiki */
  key: string;
  label: string;
  value: string;
  /**
   * Already written for a reader. Formatting a value is for tag syntax, and
   * running it over a sentence this file composed itself would only undo it
   */
  written?: boolean;
  /** Rendered as a link to here, when the value is not itself a URL */
  href?: string;
  /** What the link says, where the host it points at is not the useful part */
  linkLabel?: string;
};

/**
 * Everything worth putting in front of somebody, in the order it is worth
 * saying it.
 *
 * The address is ranked alongside the tags rather than prepended to them, so
 * that `indoor`, `level` and `location` can sit above it: the question a person
 * holding a phone in a shopping centre has is which floor, and the address of a
 * building they are already standing in answers nothing.
 */
const buildPopupRows = (tags: Record<string, string> = {}): PopupRow[] => {
  const rows: (PopupRow & { rank: number })[] = [];

  const address = describeAddress(tags);
  if (address)
    rows.push({
      key: "addr",
      label: ui().poi.address,
      value: address,
      written: true,
      rank: ADDRESS_RANK,
    });

  for (const [key, rawValue] of Object.entries(tags)) {
    const value = String(rawValue);
    if (!isDisplayableTag(key, value)) continue;
    const timetable = isTimetableKey(key);
    /**
     * The tags whose value names a page elsewhere without being a URL: a
     * Wikipedia article, a Wikidata item. The value is an identifier in
     * another database, so the row leads to the page it names rather than
     * printing the tag
     */
    const link = wikiTagLink(key, value);
    rows.push({
      key,
      label: labelFor(key),
      value: timetable ? formatOpeningHours(value) : value,
      written: timetable,
      href: link?.href,
      linkLabel: link?.label,
      rank: rankForKey(key),
    });
  }

  // Stable, so tags of equal rank keep the order the contributor wrote them
  return rows.sort((a, b) => a.rank - b.rank);
};

/** What to call a point, and what to say underneath */
const describeMarker = (marker: OverpassMarkerData, selected: readonly CATEGORIES[]) => {
  const category = findCategory(marker, selected);
  const config = category !== null ? CATEGORY_CONFIG[category] : null;
  const name = marker.name?.trim();

  return {
    config,
    /** An unnamed drinking fountain is still a drinking fountain, and "No name"
     * told the reader nothing they could not already see on the map */
    title:
      name || (category !== null ? categoryDisplay(category) : "") || ui().poi.unnamedPlace,
    /** Only when it is not just the title again */
    subtitle: name && category !== null ? categoryDisplay(category) : null,
  };
};

/**
 * The rows of a popup, whether they describe the point or the building it
 * stands in. One renderer for both, because a fact about a place should not
 * change how it is set out depending on which object in OpenStreetMap happens
 * to be carrying it: an address is an address, and a timetable on a shopping
 * centre reads the same way as one on the toilet inside it.
 */
const PopupRows: React.FC<{ rows: PopupRow[]; keyPrefix: string }> = ({
  rows,
  keyPrefix,
}) => (
  <dl className="poi-popup-rows">
    {rows.map(({ key, label, value: valueStr, written, href: rowHref, linkLabel }) => {
      const isCustomers = !written && isCustomersChip(key, valueStr);
      const isYesNo =
        (!written && YES_NO_ANSWERS.has(valueStr.toLowerCase())) || isCustomers;
      const href =
        rowHref ?? (valueStr.startsWith("http") ? valueStr : `https://${valueStr}`);
      /**
       * Prose, not a tag value: a description carries its own line breaks
       * and is far too long to sit in a right hand column, so the row
       * turns into a label with a paragraph under it. A timetable is
       * written rather than prose, and takes the same shape for the same
       * reason: several rules stacked in the right hand column wrap into
       * an unreadable column of fragments
       */
      const isProse = !written && (valueStr.includes("\n") || valueStr.length > 40);
      const isStacked = isProse || valueStr.includes("\n");
      const canTranslate = !written && shouldOfferTranslation(key, valueStr);
      /**
       * The value's own page on the wiki, where there is one. Not for a
       * written row: the address and the timetables are assembled here out of
       * several tags, and no page describes the sentence this file wrote
       */
      const valueWikiUrl =
        written || rowHref ? undefined : tagValueWikiUrl(key, valueStr);

      return (
        <div
          className={`poi-popup-row${isStacked ? " poi-popup-row-stacked" : ""}`}
          key={`${keyPrefix}-${key}`}
        >
          <dt>
            <a
              className="poi-popup-tag-link"
              href={tagWikiUrl(key)}
              target="_blank"
              rel="noopener noreferrer"
              title={`${key} on the OpenStreetMap wiki`}
            >
              {label}
            </a>
          </dt>
          <dd>
            {canTranslate ? (
              <TranslatableValue value={valueStr} isProse={isProse} />
            ) : rowHref || key === "website" || key === "url" || isUrl(valueStr) ? (
              <a
                className="poi-popup-link"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {linkLabel ?? formatLinkLabel(href)}
              </a>
            ) : isYesNo ? (
              <span
                className={`poi-popup-chip${isCustomers ? " poi-popup-chip-strong" : ""}`}
                /**
                 * The one chip that is not grey. It carries the same pink
                 * the marker does, so a point somebody picked out of the
                 * map by its colour says the same thing when it opens.
                 * Every other yes or no keeps the neutral pill.
                 */
                style={
                  key === "changing_table" && valueStr.toLowerCase() === "yes"
                    ? { background: CHANGING_TABLE_COLOR, color: "#fff" }
                    : undefined
                }
              >
                {formatValue(valueStr)}
              </span>
            ) : isProse || written ? (
              // Verbatim: formatValue rewrites underscores and semicolons,
              // which is right for a tag value and wrong for a sentence
              // somebody wrote, or for a line this file wrote itself
              valueStr
            ) : (
              <ValueText value={valueStr} tag={key} wikiUrl={valueWikiUrl} />
            )}
          </dd>
        </div>
      );
    })}
  </dl>
);

/**
 * What the popup says about the building the point stands in.
 *
 * The question a person holding a phone actually has about a toilet in a
 * shopping centre is which shopping centre, and the node they tapped does not
 * know: the name, the street and the opening hours are all on the building
 * around it, which is a different object in OpenStreetMap with nothing in
 * either of them pointing at the other. Which one it is has to be worked out
 * from the geometry, and fetchEnclosingBuilding is where that happens.
 *
 * Only for a node. A point drawn as a way is already an area on the map, and
 * the building it overlaps is a neighbour rather than a container.
 *
 * Nothing is fetched until the popup opens, because this only ever renders
 * inside one: react-leaflet mounts a popup's contents when Leaflet opens it,
 * so a screenful of markers is a screenful of markers rather than a hundred
 * queries for buildings nobody looked at. The outline on the map is asking the
 * same question at the same moment and gets the same answer without a second
 * request; see the lookups in hooks/useOsmElement.
 *
 * What comes back is split in two, because a building's tags are two different
 * kinds of fact. Most of them are true of the building and not of the point,
 * and those stay in their own section at the bottom: a toilet that is free
 * inside a shopping centre that charges for parking must not end up with one
 * "Fee" row and no way to tell which is which. A handful describe the facility
 * itself and are only on the building because that is where somebody typed
 * them, and those move up beside the point's own rows under a heading that says
 * where they came from — see isInheritedFromBuilding.
 */
const splitBuildingRows = (
  building: EnclosingBuildingData,
  marker: OverpassMarkerData,
  /** What the point has already said, so the building does not say it again */
  shown: PopupRow[]
): { inherited: PopupRow[]; own: PopupRow[] } => {
  const inherited: PopupRow[] = [];
  const own: PopupRow[] = [];

  for (const row of buildPopupRows(building.tags)) {
    // The name is the heading of this section, and a row repeating it would be
    // the only thing in the popup said twice in two lines
    if (row.key === "name") continue;
    /**
     * The point's own tagging wins outright, whatever it says. A building
     * marked `wheelchair=yes` around a toilet marked `wheelchair=limited` is
     * not a contradiction to resolve: the toilet is the thing being asked
     * about, and it has answered
     */
    if (isInheritedFromBuilding(row.key) && marker.tags?.[row.key] === undefined) {
      inherited.push(row);
      continue;
    }
    if (shown.some(already => already.key === row.key && already.value === row.value)) {
      continue;
    }
    own.push(row);
  }

  // Sorted after the split rather than before it: what leads the building's own
  // list is decided among the rows that stayed, and `localeCompare` on the
  // labels is what a reader scans by, the tag keys being what they are
  own.sort(
    (a, b) =>
      buildingRankForKey(a.key) - buildingRankForKey(b.key) ||
      a.label.localeCompare(b.label)
  );

  return { inherited, own };
};

/**
 * The tags the building carries on the point's behalf, lifted up beside the
 * point's own rows and labelled as borrowed.
 *
 * See isInheritedFromBuilding for which tags these are and why they move. The
 * heading is not decoration: without it a changing table mapped on a shopping
 * centre would appear to be tagged on the toilet, which is a claim about the
 * data nobody made.
 */
const InheritedFromBuilding: React.FC<{
  marker: OverpassMarkerData;
  rows: PopupRow[];
}> = ({ marker, rows }) => (
  <div className="poi-popup-inherited">
    <p className="poi-popup-inherited-label">{ui().poi.fromBuilding}</p>
    <PopupRows rows={rows} keyPrefix={`${marker.id}-from-building`} />
  </div>
);

/**
 * The offer to fix what the dates above it have just cast doubt on: the object
 * open in OpenStreetMap's editor, selected and ready to correct.
 *
 * Takes its wording rather than assuming it, for the same reason the date lines
 * do. A popup showing a point inside a building carries two of these, and two
 * links both reading "Edit in OpenStreetMap" would leave the reader to work out
 * from the indentation which one edits the shopping centre.
 */
const EditInOsm: React.FC<{
  href: string;
  label: string;
  /** Which of the two objects a popup can offer this for */
  object: "point" | "building";
  /** The point's category, for both links: see analytics.osmEditOpened */
  category: CATEGORIES | null;
}> = ({ href, label, object, category }) => (
  <p className="poi-popup-edit">
    <a
      className="poi-popup-edit-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      /*
       * Counted rather than left to Matomo's outlink tracking, which sees only
       * a URL: the report should say that somebody set out to fix a drinking
       * fountain, not that openstreetmap.org was clicked for the fourth time
       * this week from a page that links there in five other places
       */
      onClick={() => analytics.osmEditOpened(object, category)}
    >
      {label}
    </a>
  </p>
);

const RenderMarkerContents: React.FC<{
  marker: OverpassMarkerData;
  categories: readonly CATEGORIES[];
}> = ({ marker, categories }) => {
  const { config, title, subtitle } = describeMarker(marker, categories);
  const category = findCategory(marker, categories);
  const rows = buildPopupRows(marker.tags);
  const survey = describeSurvey(marker.tags);
  const edited = describeEdit(marker.timestamp);
  const editUrl = osmEditUrl(marker);

  /**
   * Asked for here rather than inside the section that shows it, because the
   * answer is now read in two places: the borrowed rows above the point's own
   * footnotes, and the building's account of itself below them. One query
   * either way — see the doc on splitBuildingRows
   */
  const building = useEnclosingBuilding(
    isDrawn(marker) || !marker.position ? null : marker.position
  );
  const { inherited, own: buildingRows } = building
    ? splitBuildingRows(building, marker, rows)
    : { inherited: [], own: [] };
  const buildingName = building?.tags.name?.trim();
  /**
   * The building's own dates, said in its own words. Both objects carry these
   * and they are routinely years apart: a toilet surveyed in June inside a
   * building last touched in 2012 is two facts, and a bare "Last checked"
   * under each would leave the reader to work out which was which from the
   * indentation
   */
  const buildingSurvey = describeSurvey(
    building?.tags,
    undefined,
    ui().poi.buildingLastChecked
  );
  const buildingEdited = describeEdit(
    building?.timestamp,
    undefined,
    ui().poi.buildingLastEdited
  );
  /**
   * The building has no centre of its own here — the lookup answers with its
   * outline and tags, not a point — so the editor opens on the marker, which
   * stands inside it by definition. iD selects the building either way
   */
  const buildingEditUrl = osmEditUrlForRef(building?.ref, marker.position);

  return (
    <div className="poi-popup-body">
      <div className="poi-popup-header">
        {config && (
          // The colour is the category's own, so the popup and the marker it
          // came from are recognisably the same thing
          <span className="poi-popup-icon" style={{ color: config.color }}>
            {React.cloneElement(config.icon, { fontSize: "small" })}
          </span>
        )}
        <div className="poi-popup-heading">
          <h3 className="poi-popup-title">{title}</h3>
          {subtitle && <p className="poi-popup-subtitle">{subtitle}</p>}
        </div>
      </div>

      {rows.length > 0 && <PopupRows rows={rows} keyPrefix={String(marker.id)} />}

      {inherited.length > 0 && (
        <InheritedFromBuilding marker={marker} rows={inherited} />
      )}

      {/* Below the rows and set quieter than them, because these are facts
          about the data rather than about the place. Two lines rather than one
          joined by a separator: when a place has both, they say different
          things — somebody stood there in June, somebody edited the record in
          August — and running them together invites reading the second as
          confirmation of the first.

          Above the building's section rather than at the very bottom, so that
          each object's dates follow that object's rows. Set out the other way
          round the popup ended on four date lines in a row, two about a
          shopping centre and two about a toilet, in the order nobody reads */}
      {survey && <p className="poi-popup-survey">{survey}</p>}
      {edited && <p className="poi-popup-edited">{edited}</p>}

      {/* What to do about those two dates, offered where they are read: at the
          foot of the point's own block, and again at the foot of the
          building's, because each is a separate object with its own record to
          correct */}
      {editUrl && (
        <EditInOsm
          href={editUrl}
          label={ui().poi.editInOsm}
          object="point"
          category={category}
        />
      )}

      {building && (
        <div className="poi-popup-building">
          <p className="poi-popup-building-label">
            {buildingName
              ? interpolate(ui().poi.inBuilding, { building: buildingName })
              : ui().poi.inThisBuilding}
          </p>
          {buildingRows.length > 0 && (
            <PopupRows rows={buildingRows} keyPrefix={`${marker.id}-building`} />
          )}
          {buildingSurvey && <p className="poi-popup-survey">{buildingSurvey}</p>}
          {buildingEdited && <p className="poi-popup-edited">{buildingEdited}</p>}
          {buildingEditUrl && (
            <EditInOsm
              href={buildingEditUrl}
              label={ui().poi.editBuildingInOsm}
              object="building"
              category={category}
            />
          )}
        </div>
      )}

      {/* Last, under everything including the building's own section. Both of
          the blocks above describe an object somebody surveyed — the point,
          and the building around it — and this describes neither: it is the
          surroundings, worked out rather than recorded. It also renders for
          only a handful of categories, so for most popups this line is the
          whole of it and nothing changes */}
      <NoiseSection
        position={marker.position ?? null}
        category={category}
        // Only for a drawn point. A node has no outline to take a centroid of,
        // and passing its ref would ask Overpass for one
        shapeRef={isDrawn(marker) ? shapeRefOf(marker) : null}
      />

      {/* And under that. Both sections describe the surroundings rather than
          the point, so they belong together at the foot; noise first because
          it is the older row and moving it would move a line readers have
          learned where to find. No shapeRef: unlike a noise band, which can
          differ across a park, the nearest monitoring station is tens of
          kilometres away and is the same station for every corner of any
          shape this app draws */}
      <AirSection position={marker.position ?? null} category={category} />
    </div>
  );
};

/**
 * The group icon: a disc the size of a marker with the count in it, anchored
 * the same way a marker is, so a group sits exactly where the points it stands
 * for were and nothing jumps when it fans out.
 */
const createClusterIcon = (cluster: { getChildCount: () => number }) => {
  const count = cluster.getChildCount();
  /**
   * A wider group holds more, and says so before the number is read. The disc
   * grows a little rather than in proportion: it is still a marker sitting
   * among markers, and one that swelled with the count would take over the map
   * the grouping exists to keep readable.
   */
  const size = count >= 1000 ? 38 : count >= 100 ? 34 : 30;
  /**
   * And the digits shrink to fit it. Four digits at the one-count size ran
   * out past the edge of the circle, which is how a group of 1,214 recycling
   * containers came out reading as "121"
   */
  const fontSize = count >= 1000 ? 34 : count >= 100 ? 42 : 52;
  return divIcon({
    /*
     * The count is drawn as SVG text rather than laid out as HTML. Centring a
     * digit with CSS means centring the line box that holds it, and a digit is
     * drawn against the baseline with the descender space left empty below,
     * so the number always ends up sitting high in the circle. SVG centres on
     * the glyph itself: x/y are the middle of the viewBox, text-anchor centres
     * it across, dominant-baseline centres it down, and there is no line box
     * in the picture at all.
     */
    html:
      `<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">` +
      // Inline rather than an attribute: .poi-cluster text states the size in
      // CSS, and a presentation attribute loses to it
      `<text x="50" y="50" text-anchor="middle" dominant-baseline="central" ` +
      `style="font-size:${fontSize}px">${count}</text></svg>`,
    className: "poi-cluster",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
};

/**
 * Whether this point is something OpenStreetMap drew rather than dropped: a
 * way or a relation, which has an outline worth showing. A node is the marker
 * and nothing more.
 */
const isDrawn = (marker: OverpassMarkerData) =>
  marker.type === "way" || marker.type === "relation";

/** Tells a way apart from a relation of the same number, which do coexist */
const shapeKey = (marker: OverpassMarkerData) => `${marker.type}/${marker.id}`;

/**
 * The same string as an OsmRef, for the lookups that take one. Only ever
 * called behind isDrawn, which is what makes the narrowing true rather than
 * asserted — a node has no outline and must not be asked for one
 */
const shapeRefOf = (marker: OverpassMarkerData) =>
  `${marker.type as "way" | "relation"}/${marker.id}` as OsmRef;

const PoiMarkers: React.FC<DynamicMarkersProps> = ({
  markers,
  categories,
  onNotice,
}) => {
  /**
   * The point whose outline is on the map, which is the point whose popup is
   * open. Only ever one: see PoiShape
   */
  const [openShape, setOpenShape] = React.useState<string | null>(null);
  /** Bumped when a fan closes, to take the points held back while it was open */
  const [, setFanClosedAt] = React.useState(0);

  const map = useMap();
  /** The popup currently on the map, while it is still allowed to pan it */
  const openPopupRef = React.useRef<LeafletPopup | null>(null);
  /** The cluster group, for the one question below that has to be asked of it */
  const clusterRef = React.useRef<LeafletClusterGroup | null>(null);

  /**
   * Whether a group is currently fanned out.
   *
   * This is the question the two guards below turn on, and it has to be asked
   * because of what the clustering plugin does when a fan collapses: it closes
   * the popup of every marker in it. So anything that collapses a fan while
   * the reader is reading one of its popups takes that popup with it.
   *
   * Two things collapse a fan: a change of zoom, and a marker being added to
   * or removed from the group. This component did both, one point of a second
   * after opening a popup — which is why a point sharing a spot with another
   * was so hard to open. You tapped the group, it fanned out, you tapped one
   * of the two, and the popup opened and vanished.
   *
   * Read off the group rather than tracked from its `spiderfied` and
   * `unspiderfied` events, which is the tidier version of this and is wrong by
   * two hundred milliseconds: both are fired at the end of the animation, and
   * a fan is collapsible from the moment it starts. This field is set as the
   * fan opens and cleared as it closes, which is the moment that matters.
   */
  const isSpiderfied = () =>
    Boolean(
      (clusterRef.current as unknown as { _spiderfied?: unknown } | null)
        ?._spiderfied
    );

  /**
   * The points on the map, held still while a group is fanned out.
   *
   * Every move of the map hands this component a new list — App cuts the
   * loaded points to the view on each moveend — and a point entering or
   * leaving that list is a marker added to or removed from the group, which
   * collapses a fan and closes every popup in it. The move that does it is
   * usually the popup's own: open a point in the upper half of the screen and
   * it pans the map down to fit, the edge of the view crosses a few points,
   * and the fan and the popup vanish together. On Friedrichstraße, with three
   * toilets at one spot, that was every tap above the middle of the screen.
   *
   * So while a fan is open the list stays the one it opened with, and the
   * latest is taken when it closes — see the `unspiderfied` listener below.
   * Nothing the reader is looking at is missing either way: the points on the
   * screen are in both lists, and the rest arrive as the fan closes.
   */
  const shownMarkersRef = React.useRef(markers);
  if (!isSpiderfied()) shownMarkersRef.current = markers;
  const shownMarkers = shownMarkersRef.current;

  const shapeMarker = shownMarkers.find(marker => shapeKey(marker) === openShape) ?? null;

  /**
   * Keep a fanned out group open until the reader closes it.
   *
   * The plugin collapses a fan on any click on the map, which sounds right and
   * is the single most annoying thing about a pair of points at one spot. The
   * reader fans the two apart, opens one, and the popup — which is most of the
   * screen — pans the map to fit itself: 35 to 70 pixels sideways, because a
   * popup is centred on its own marker and the marker is off to one side of
   * the group. The other point is now not where it was a moment ago. The next
   * tap, aimed where it used to be, lands on the map, and the map's answer is
   * to throw the fan away. Now both points are back under one disc and the
   * reader starts again — which is what "impossible to open the second one"
   * actually is: not one broken tap, but a miss that costs everything.
   *
   * So a miss costs nothing here: the popup closes, the fan stays, the two
   * points are still where they were and the second tap lands. What closes the
   * fan is tapping the disc it came out of, which is the gesture that opened
   * it, and the things that always closed it — zooming, opening another group,
   * the points reloading.
   *
   * The disc has to be handled before the plugin sees the click, or its own
   * handler fans the group out again on the way past. Hence the capture phase
   * listener rather than the group's `clusterclick`, which fires after.
   */
  React.useEffect(() => {
    const group = clusterRef.current as unknown as {
      _unspiderfyWrapper?: () => void;
      _unspiderfy?: () => void;
      _spiderfied?: unknown;
    } | null;
    if (!group) return;

    const dismissOnMapClick = group._unspiderfyWrapper;
    if (dismissOnMapClick) map.off("click", dismissOnMapClick, group);

    const container = map.getContainer();
    const collapseOnDiscTap = (event: MouseEvent) => {
      if (!group._spiderfied) return;
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.(".poi-cluster")) return;
      group._unspiderfy?.();
      // The plugin's own handler would otherwise fan it straight back out
      event.stopPropagation();
      event.preventDefault();
    };
    container.addEventListener("click", collapseOnDiscTap, true);

    // A fan that closes hands the list back: whatever arrived while it was
    // open is drawn now. See shownMarkersRef
    const cluster = clusterRef.current;
    const showLatestPoints = () => setFanClosedAt(Date.now());
    cluster?.on("unspiderfied", showLatestPoints);

    return () => {
      if (dismissOnMapClick) map.on("click", dismissOnMapClick, group);
      container.removeEventListener("click", collapseOnDiscTap, true);
      cluster?.off("unspiderfied", showLatestPoints);
    };
  }, [map]);
  /**
   * Until when a move of the map is this component's own doing.
   *
   * The release below listens for the reader taking the map somewhere, and a
   * fitBounds of ours fires the same events a drag does. A deadline rather
   * than a flag cleared on moveend, because a fit that turns out to need no
   * movement fires no moveend to clear it, and a flag stuck on would quietly
   * hand the popup the right to pan the map for the rest of the session.
   */
  const ownMoveUntilRef = React.useRef(0);

  /**
   * Where the map was before a popup zoomed in on its point, and which popup
   * that now belongs to. Cleared by the reader moving the map, because then
   * where they are is where they chose to be.
   */
  const viewBeforeZoomRef = React.useRef<{
    center: [number, number];
    zoom: number;
    popup: LeafletPopup;
  } | null>(null);

  /**
   * The view the map last came to rest in with no popup open, which is the
   * one to go back to. Read when a popup opens it would already be off:
   * Leaflet pans the map to fit a popup before it announces it, so the view
   * at popupopen is the panned one, and going back there lands somewhere the
   * reader never was — possibly outside the loaded area, costing a query.
   */
  const restingViewRef = React.useRef<{
    center: [number, number];
    zoom: number;
  } | null>(null);
  /** The popup on the map, whether or not it may still pan it */
  const shownPopupRef = React.useRef<LeafletPopup | null>(null);

  const rememberRestingView = React.useCallback(() => {
    const center = map.getCenter();
    restingViewRef.current = { center: [center.lat, center.lng], zoom: map.getZoom() };
  }, [map]);

  React.useEffect(() => {
    rememberRestingView();
    // The popup's own pan is animated, so its moveend arrives after the
    // popup is marked open and is left out
    const onMoveEnd = () => {
      if (!shownPopupRef.current) rememberRestingView();
    };
    map.on("moveend", onMoveEnd);
    return () => {
      map.off("moveend", onMoveEnd);
    };
  }, [map, rememberRestingView]);

  /**
   * The outline of the open point, if it has one, so that its marker can be
   * put inside it.
   *
   * The same ref PoiShape asks for, which costs nothing: useOsmElement shares
   * one answer and one in-flight request per ref, so the two callers here are
   * one request between them.
   */
  const openElement = useOsmElement(
    shapeMarker && isDrawn(shapeMarker) ? shapeRefOf(shapeMarker) : null
  );

  /**
   * Where a drawn point's marker really belongs, for the ones whose given
   * position is not inside their own outline.
   *
   * Overpass answers `out center`, which is the middle of the bounding box —
   * and the middle of the box around a crescent bay, a horseshoe park or a
   * ring of allotments is not in the place at all, it is on whatever the shape
   * bends around. So once the outline is known the marker moves to a point
   * that is guaranteed to be on the surface, the equivalent of PostGIS's
   * ST_PointOnSurface. See shapeSamplePoint.
   *
   * Only when the given position is genuinely outside. For the great majority
   * of shapes the box centre is inside the shape and is the more natural place
   * for a pin than a computed one, and a marker that hops the moment its popup
   * opens is worse than a marker a few metres off centre.
   *
   * Kept per point rather than only for the open one, so a pin that has been
   * corrected stays corrected when the popup closes.
   */
  const [insidePositions, setInsidePositions] = React.useState<
    Record<string, [number, number]>
  >({});

  React.useEffect(() => {
    const shape = openElement?.shape;
    if (!shapeMarker || !shape || !shapeMarker.position) return;
    // Moving a marker means removing it from the group and adding it back,
    // which collapses a fan and closes the popup that asked for this outline
    // in the first place. A pin a few metres off centre is worth less than the
    // popup the reader is reading; the correction lands the next time this
    // point is opened on its own. See isSpiderfied
    if (isSpiderfied()) return;
    const key = shapeKey(shapeMarker);
    if (shapeContains(shape, shapeMarker.position)) return;
    const inside = shapeSamplePoint(shape);
    if (!inside) return;
    setInsidePositions(current =>
      current[key] ? current : { ...current, [key]: inside }
    );
  }, [openElement, shapeMarker]);

  /**
   * A flight of ours, to a point or back from one. A flight fires its
   * zoomstart during the call itself, so marking just the call as ours is
   * exact: a drag a moment later is the reader's, and stops it.
   */
  const flyOwn = React.useCallback(
    (center: LatLngExpression, zoom: number, duration: number) => {
      const until = ownMoveUntilRef.current;
      ownMoveUntilRef.current = Infinity;
      try {
        map.flyTo(center, zoom, { duration });
      } finally {
        ownMoveUntilRef.current = until;
      }
    },
    [map]
  );

  /**
   * Bring the whole of a drawn point into view when its popup opens, and only
   * then.
   *
   * A popup about a park is an account of the park, and the reader cannot see
   * what is being described if two thirds of it are off the screen. The bounds
   * come with the marker — no fetch and no wait — so this happens as the popup
   * opens rather than a second later when the outline arrives.
   *
   * Nothing moves if the outline is already on the screen. Somebody who tapped
   * a bench they can see does not want the map to lurch, and a shape that fits
   * is a shape they are already looking at.
   */
  const fitShapeIntoView = React.useCallback(
    (marker: OverpassMarkerData, popup: LeafletPopup) => {
      // Going straight from one popup to another keeps the view the first
      // one was opened from, so closing the second still goes back there
      const saved = viewBeforeZoomRef.current;
      if (saved) saved.popup = popup;

      const corners = marker.bounds;
      /*
       * Never out of a fanned out group, and this is the whole of the bug that
       * made two points at one spot so hard to open.
       *
       * A shopping centre is larger than the screen at street zoom, so fitting
       * it changes the zoom — and a change of zoom collapses the fan, and
       * collapsing a fan closes the popups of everything in it. The popup this
       * fit was called from opened and shut in the same frame, the outline
       * went with it, and the reader was left somewhere else on the map with
       * nothing selected. Which is exactly the case the fan exists for: a
       * toilet mapped as a node and again as the building around it stand at
       * the same spot, and the building is the one with an outline to fit.
       *
       * So the fan wins. The reader fanned the group out deliberately and is
       * reading one of the two; a map that keeps that where it is beats a map
       * that frames an outline it has just thrown away.
       */
      if (isSpiderfied()) return;

      /*
       * Zoomed out, a point is a dot among hundreds and its popup is about
       * something too small to see, so the map goes to it — the outline if
       * there is one, the point itself otherwise — and remembers where it was.
       */
      const resting = restingViewRef.current;
      const featureBounds = corners
        ? latLngBounds([corners[0], corners[1]], [corners[2], corners[3]])
        : marker.position
          ? latLngBounds(marker.position, marker.position)
          : null;
      if (map.getZoom() <= ZOOM_TO_FEATURE_AT_OR_BELOW && featureBounds && resting) {
        const padding = shapeFitPadding();
        const paddingTL = point(padding.paddingTopLeft);
        const paddingBR = point(padding.paddingBottomRight);
        const target = Math.min(
          FEATURE_ZOOM,
          map.getBoundsZoom(featureBounds, false, paddingTL.add(paddingBR))
        );
        // Only ever in. An outline too big to show any closer is fitted below
        // like at any other zoom, rather than zooming out into points that
        // were never loaded
        if (target > map.getZoom()) {
          viewBeforeZoomRef.current ??= { ...resting, popup };
          /*
           * One motion. Left to itself the popup pans the map on its way in:
           * once as it opens, again when React renders its content — which
           * lands in the middle of the zoom — and it would need a third pan
           * after it, because a point near the side of the screen leaves the
           * popup hanging off the edge at the new zoom. So it may not pan, the
           * pan it already started is stopped, and the room it needs goes into
           * where the map flies to instead.
           */
          popup.options.autoPan = false;
          map.stop();

          // React renders the content a frame or two after the popup opens and
          // Leaflet lays it out in the frame after that; only then is the room
          // the popup needs known
          let frames = 0;
          let rendered = false;
          const fly = () => {
            // Closed, replaced, or the reader took the map in the meantime
            if (!popup.isOpen() || openPopupRef.current !== popup) return;
            if (!rendered && frames++ < 10) {
              rendered = Boolean(
                popup.getElement()?.querySelector(".leaflet-popup-content")
                  ?.childElementCount
              );
              requestAnimationFrame(fly);
              return;
            }
            flyOwn(
              centerFittingPopup(map, featureBounds, target, paddingTL, paddingBR, popup),
              target,
              FEATURE_FLY_IN_S
            );
            // Landed with the popup in view. From here on it pans the map as
            // it always has, for when its content grows
            map.once("moveend", () => {
              if (openPopupRef.current === popup) popup.options.autoPan = true;
            });
          };
          requestAnimationFrame(fly);
          return;
        }
      }

      if (!corners) return;
      const [south, west, north, east] = corners;
      const bounds = latLngBounds([south, west], [north, east]);
      if (map.getBounds().contains(bounds)) return;

      ownMoveUntilRef.current = Date.now() + OWN_MOVE_GRACE_MS;
      map.fitBounds(bounds, shapeFitPadding());
    },
    [map, flyOwn]
  );

  /**
   * Go back to the view a popup zoomed in from, when that popup closes and
   * the reader has not moved the map themselves in the meantime.
   */
  const restoreViewAfter = React.useCallback(
    (popup: LeafletPopup) => {
      if (shownPopupRef.current === popup) shownPopupRef.current = null;
      const saved = viewBeforeZoomRef.current;
      if (saved?.popup !== popup) {
        // Nothing to go back to, so wherever the map is now is where the next
        // popup should return to — unless another one has already opened
        if (!shownPopupRef.current) rememberRestingView();
        return;
      }
      viewBeforeZoomRef.current = null;
      flyOwn(saved.center, saved.zoom, FEATURE_FLY_BACK_S);
    },
    [flyOwn, rememberRestingView]
  );

  /*
   * Auto panning is for the moment a popup opens: the box has to be brought
   * clear of the controls and the screen edges, and it cannot be done before
   * the content is in it and measured, so it happens a beat after the click.
   *
   * After that it has to stop. Leaflet re-runs the pan on every popup.update(),
   * and react-leaflet calls update() whenever the popup's children change --
   * which is every render of this list, including the one that follows the
   * points being reloaded for the view just panned to. The map jumped back to
   * the open popup on each of them, so the map could not be read around a point
   * without closing what was said about it first.
   *
   * The first deliberate move is the signal: once the reader has taken the map
   * somewhere themselves, the popup gives up the right to move it. The flag
   * lives on the popup instance, so it comes back the next time it is opened.
   */
  React.useEffect(() => {
    const releaseMap = () => {
      const popup = openPopupRef.current;
      if (!popup) return;
      popup.options.autoPan = false;
      openPopupRef.current = null;
    };

    // Only user gestures: the auto pan itself moves the map with panBy, which
    // fires neither of these, and a fit of ours says so on the way in
    const releaseUnlessOurs = () => {
      if (Date.now() < ownMoveUntilRef.current) return;
      releaseMap();
      // The reader has taken the map somewhere, closing is no longer a way back
      viewBeforeZoomRef.current = null;
    };

    map.on("dragstart", releaseUnlessOurs);
    map.on("zoomstart", releaseUnlessOurs);
    return () => {
      map.off("dragstart", releaseUnlessOurs);
      map.off("zoomstart", releaseUnlessOurs);
    };
  }, [map]);

  /**
   * Whether the two overlays have anything to say about this view.
   *
   * Asked of the middle of the screen once per render, rather than of every
   * marker, and that is a fair trade rather than a shortcut: both layers are
   * built out of areas far larger than a screenful — a modelled city for
   * noise, a band of interpolated air hundreds of kilometres across — so a
   * view whose centre is covered has covered markers, and one whose centre is
   * not has none. Asking per marker means a rendered query per point per
   * render, which is the cost this whole branch exists to avoid.
   *
   * Read here rather than subscribed to, and that is the load-bearing part.
   * The obvious version of this used the same hooks the layers panel does,
   * which hold the answer in state and refresh it on every `idle`. In a panel
   * with two tiles that is nothing. Here it was a disaster: coverage answers
   * "unknown" while a source is still loading, which is the normal state of
   * affairs during a pan, so every pan flipped the answer to unknown and back.
   * Each flip changes `hasDetails` for every point that has nothing else to
   * show, and React answers that by unbinding a popup from each of a thousand
   * markers and binding it again a moment later — twice per pan, synchronously.
   * The map stopped scrolling and the sheet stopped sliding.
   *
   * So: a plain call during render, which subscribes to nothing and cannot
   * schedule a render of its own, and a ref that keeps the last definite
   * answer. "unknown" is not an answer, it is the absence of one — treating it
   * as "no coverage" is what made this oscillate — so it leaves the decision
   * where it was until the tiles say otherwise. The list re-renders when it
   * would anyway: new points, a popup opening, a shape settling into place.
   */
  const airCoverageRef = React.useRef(false);
  const noiseCoverageRef = React.useRef(false);
  if (airTilesConfigured) {
    const answer = airCoverageAtCenter();
    if (answer !== "unknown") airCoverageRef.current = answer === "covered";
  }
  if (noiseTilesConfigured) {
    const answer = noiseCoverageAtCenter();
    if (answer !== "unknown") noiseCoverageRef.current = answer === "covered";
  }
  const airCovered = airTilesConfigured && airCoverageRef.current;
  const noiseCovered = noiseTilesConfigured && noiseCoverageRef.current;

  return (
    <>
      <MarkerClusterGroup
        ref={clusterRef}
        maxClusterRadius={clusterRadiusForZoom}
        iconCreateFunction={createClusterIcon}
        // Points that are truly on top of each other cannot be separated by zooming,
        // so a click fans them out around the spot instead
        spiderfyOnMaxZoom
        spiderfyDistanceMultiplier={1.6}
        // The hull drawn around a group of two is noise at this scale
        showCoverageOnHover={false}
        // Adding a thousand markers at once should not freeze the map
        chunkedLoading
      >
        {shownMarkers.map((marker) => {
          // Most points carry nothing but the tag that put them on the map. A popup
          // holding only the name repeats what the marker already said, and covers
          // the map to do it, so those points get a line at the bottom of the screen
          // instead and the map stays where it is.
          //
          // Whether there is a building around the point is not part of this,
          // and cannot be: it takes a query to find out, and asking for every
          // marker on the screen is exactly what this app does not do. So a
          // point carrying nothing but `amenity=toilets` still gets the line
          // rather than a popup, even standing in a shopping centre. On Bremen
          // that is 18 of the 843 points inside a building
          //
          // Except where one of the two overlays is the detail. A bench carries
          // `amenity=bench` and usually nothing else, so it fell to the line at
          // the bottom every time — and a bench is precisely a point whose
          // noise level decides whether it is worth walking to. So is the air:
          // that row is shown for every category, because "is it a good day to
          // be outside at all" is a question somebody may be asking whatever
          // they tapped, and where the wash is drawn every point has at least
          // that much to say.
          //
          // Gated on the tiles being configured and on the view actually being
          // covered, which is the part that used to be missing. A bench in a
          // city the noise builder never modelled opened a popup promising a
          // band and showing none; a toilet outside every published air city
          // would do the same. Coverage is read once for the view rather than
          // once per marker — see above.
          const markerCategory = findCategory(marker, categories);
          const noiseIsTheDetail =
            noiseCovered &&
            markerCategory !== null &&
            NOISE_WORTH_KNOWING.has(markerCategory);
          const airIsTheDetail = airCovered;
          const hasDetails =
            noiseIsTheDetail ||
            airIsTheDetail ||
            buildPopupRows(marker.tags).length > 0 ||
            describeSurvey(marker.tags) !== null;
          const { title } = describeMarker(marker, categories);

          const key = shapeKey(marker);
          // Every point with a popup opens the shape slot, drawn or not: a node
          // may turn out to be standing in a building, and there is no telling
          // which until its popup asks
          const eventHandlers = !hasDetails
            ? {
                click: () => {
                  analytics.poiTappedWithoutDetails(findCategory(marker, categories));
                  onNotice?.(interpolate(ui().poi.noExtraDetails, { name: title }));
                },
              }
            : {
                popupopen: (event: PopupEvent) => {
                  analytics.poiPopupOpened(findCategory(marker, categories));
                  setOpenShape(key);
                  openPopupRef.current = event.popup;
                  shownPopupRef.current = event.popup;
                  // Zooms in when far out, otherwise only moves the map if the
                  // outline does not already fit
                  fitShapeIntoView(marker, event.popup);
                },
                // Only if it is still ours: opening another popup closes this
                // one, and the close arrives after the open it was caused by
                popupclose: (event: PopupEvent) => {
                  setOpenShape(current => (current === key ? null : current));
                  // Whatever this popup was allowed to do is settled; the next
                  // opening starts over, centered like the first one was
                  event.popup.options.autoPan = true;
                  if (openPopupRef.current === event.popup) {
                    openPopupRef.current = null;
                  }
                  restoreViewAfter(event.popup);
                },
              };

          return <Marker
            /* The type as well as the number. Ids are unique per type rather
               than across them, so a node and a way can carry the same one —
               and two React children under one key is a marker that never
               mounts. Every other key in this file is already this string;
               this one was the exception. See shapeKey */
            key={key}
            position={insidePositions[key] ?? marker.position}
            icon={getMarkerIcon(marker, categories)}
            eventHandlers={eventHandlers}
          >
            {hasDetails && (
              <Popup
                className="poi-popup"
                maxWidth={380}
                minWidth={260}
                autoPanPaddingTopLeft={AUTO_PAN_PADDING_TOP_LEFT}
                autoPanPaddingBottomRight={[POPUP_EDGE_GAP_PX, POPUP_EDGE_GAP_PX]}
              >
                <RenderMarkerContents marker={marker} categories={categories} />
              </Popup>
            )}
          </Marker>
        })}
      </MarkerClusterGroup>
      {/* Outside the cluster group, which takes its children to be markers.
          Keyed by the point, so switching between two open popups starts a new
          fetch rather than redrawing the first one in the second one's colour */}
      {shapeMarker && (
        <PoiShape
          key={shapeKey(shapeMarker)}
          marker={shapeMarker}
          color={getMarkerColor(shapeMarker, categories)}
          enclosing={!isDrawn(shapeMarker)}
        />
      )}
    </>
  );
}

/**
 * Nothing else on the page can change what a marker looks like, and rendering
 * this list rebinds every marker on the map. Repainting it because a message
 * appeared at the bottom of the screen is how clicks went missing.
 */
export default React.memo(PoiMarkers);
