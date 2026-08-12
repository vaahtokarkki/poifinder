import React from "react";
import { Marker, Popup } from "react-leaflet";
import ParkIcon from '@mui/icons-material/Park';
import { renderToString } from "react-dom/server";
import { divIcon } from "leaflet";
import {
  CATEGORY_CONFIG,
  CATEGORIES,
  filterMatchesPrimaryTag,
  matchesFilter,
} from "./constants";
import { OverpassMarkerData } from "./api/overpass"; // <-- Import the type
import MarkerClusterGroup from "./components/MarkerClusterGroup";

/**
 * How close two points have to be, in pixels on the screen, before they are
 * shown as one group.
 *
 * Small on purpose. The usual reason to cluster is to thin out a crowded map,
 * and that is the opposite of what this app is for: a map of toilets that
 * shows bubbles instead of toilets is useless. This only catches the points
 * that genuinely cover each other, an icon being 25px wide, and leaves
 * everything a thumb can already tell apart alone.
 */
const CLUSTER_RADIUS_PX = 14;

type DynamicMarkersProps = {
  markers: OverpassMarkerData[]; // <-- Use OverpassMarkerData here
  /** Said in a line at the bottom of the screen, for points with nothing to show */
  onNotice?: (message: string) => void;
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

/**
 * The category a point belongs to, found with the same filters it was fetched
 * with. The marker takes its icon and colour from this, and the popup its
 * heading, so a point looks like the same thing in both places.
 *
 * A point can satisfy two categories at once, because some filters ask what a
 * place has rather than what it is: a library with a toilet matches both the
 * library filter and the toilets one that looks for a public building with a
 * toilet in it. The filter naming the place itself wins, whatever order the
 * categories are declared in; otherwise the first match stands.
 */
const findCategory = (marker: OverpassMarkerData): CATEGORIES | null => {
  if (!marker.tags) return null;
  let fallback: CATEGORIES | null = null;
  for (const cat of Object.values(CATEGORIES).filter(v => typeof v === "number") as number[]) {
    const config = CATEGORY_CONFIG[cat as CATEGORIES];
    for (const filter of config.filters) {
      if (!matchesFilter(marker.tags, filter)) continue;
      if (filterMatchesPrimaryTag(filter)) return cat as CATEGORIES;
      if (fallback === null) fallback = cat as CATEGORIES;
    }
  }
  return fallback;
};

/**
 * One icon per category, built once and handed to every marker of that kind.
 *
 * react-leaflet calls marker.setIcon whenever the icon prop is a different
 * object, and setIcon throws away the marker's DOM element and builds a new
 * one. Returning a fresh divIcon per render meant every unrelated state change
 * rebuilt every marker on the map, and a click that spanned one of those
 * rebuilds was lost: the first tap after a message appeared did nothing.
 */
const iconCache = new Map<CATEGORIES | "uncategorised", ReturnType<typeof divIcon>>();

const getMarkerIcon = (marker: OverpassMarkerData) => {
  const category = findCategory(marker);
  // Not ?? : category 0 is a real category and a falsy number
  const key = category === null ? "uncategorised" : category;

  let icon = iconCache.get(key);
  if (!icon) {
    icon =
      category === null
        ? RenderMarkerIcon(<ParkIcon />)
        : RenderMarkerIcon(CATEGORY_CONFIG[category].icon, CATEGORY_CONFIG[category].color);
    iconCache.set(key, icon);
  }
  return icon;
};

const formatDisplay = (str: string) =>
  str.replace(/[:_]/g, " ").replace(/^\w/, c => c.toUpperCase());

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
  if (key === "fee" && value === "yes") return false;
  if (["leisure", "type", "amenity"].includes(key)) return false;
  /**
   * What kind of building it is, and how it is put together. A point standing
   * in a building is largely described by that building — a toilet found in a
   * retail block, a library in a school — and hiding it left those popups with
   * nothing to say. `building=yes` is the exception: it only repeats that the
   * thing on the map is a building
   */
  if (key === "building") return value !== "yes";
  if (key.startsWith("building:")) return true;
  if (["ref", "addr", "building", "wiki", "roof"].some(prefix => key.startsWith(prefix))) return false;
  if (key.startsWith("name") && key !== "name") return false;
  return true;
};

/**
 * Values that answer a yes or no question: whether there is a fee, whether a
 * wheelchair gets in, whether the water is drinkable. They get the shape of a
 * chip so a one word answer is not mistaken for a truncated value.
 */
const SHORT_ANSWERS = new Set([
  "yes",
  "no",
  "free",
  "designated",
  "public",
  "private",
  "limited",
  "permissive",
  "customers",
  "destination",
]);

/**
 * The wiki page for a tag key, where what the values mean is written down.
 * Reached through the row's own label rather than an icon next to it: the
 * label already names the tag, and a popup on a phone has no room for more.
 */
const tagWikiUrl = (key: string) =>
  `https://wiki.openstreetmap.org/wiki/Key:${encodeURIComponent(key)}`;

/** The tags worth putting in front of somebody, in the order OSM gave them */
const getDisplayableTags = (marker: OverpassMarkerData) =>
  Object.entries(marker.tags ?? {}).filter(([key, value]) =>
    isDisplayableTag(key, String(value))
  );

/** What to call a point, and what to say underneath */
const describeMarker = (marker: OverpassMarkerData) => {
  const category = findCategory(marker);
  const config = category !== null ? CATEGORY_CONFIG[category] : null;
  const name = marker.name?.trim();

  return {
    config,
    /** An unnamed drinking fountain is still a drinking fountain, and "No name"
     * told the reader nothing they could not already see on the map */
    title: name || config?.display || "Unnamed place",
    /** Only when it is not just the title again */
    subtitle: name && config ? config.display : null,
  };
};

const RenderMarkerContents: React.FC<{ marker: OverpassMarkerData }> = ({ marker }) => {
  const { config, title, subtitle } = describeMarker(marker);
  const rows = getDisplayableTags(marker);

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

      {rows.length > 0 && (
        <dl className="poi-popup-rows">
          {rows.map(([key, value]) => {
            const valueStr = String(value);
            const isShortAnswer = SHORT_ANSWERS.has(valueStr.toLowerCase());
            const href = valueStr.startsWith("http") ? valueStr : `https://${valueStr}`;
            /**
             * Prose, not a tag value: a description carries its own line
             * breaks and is far too long to sit in a right hand column, so the
             * row turns into a label with a paragraph under it
             */
            const isProse = valueStr.includes("\n") || valueStr.length > 40;

            return (
              <div
                className={`poi-popup-row${isProse ? " poi-popup-row-stacked" : ""}`}
                key={`${marker.id}-${key}`}
              >
                <dt>
                  <a
                    className="poi-popup-tag-link"
                    href={tagWikiUrl(key)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${key} on the OpenStreetMap wiki`}
                  >
                    {formatDisplay(key)}
                  </a>
                </dt>
                <dd>
                  {key === "website" || key === "url" || isUrl(valueStr) ? (
                    <a
                      className="poi-popup-link"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {formatLinkLabel(href)}
                    </a>
                  ) : isShortAnswer ? (
                    <span className="poi-popup-chip">{formatDisplay(valueStr)}</span>
                  ) : isProse ? (
                    // Verbatim: formatDisplay turns every colon and underscore
                    // into a space, which is right for a tag value and wrong
                    // for a sentence somebody wrote
                    valueStr
                  ) : (
                    formatDisplay(valueStr)
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
};

/**
 * The group icon: a disc the size of a marker with the count in it, anchored
 * the same way a marker is, so a group sits exactly where the points it stands
 * for were and nothing jumps when it fans out.
 */
const createClusterIcon = (cluster: { getChildCount: () => number }) => {
  const size = 30;
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
      `<text x="50" y="50" text-anchor="middle" dominant-baseline="central">` +
      `${cluster.getChildCount()}</text></svg>`,
    className: "poi-cluster",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
};

const PoiMarkers: React.FC<DynamicMarkersProps> = ({
  markers,
  onNotice,
}) => {
return <MarkerClusterGroup
  maxClusterRadius={CLUSTER_RADIUS_PX}
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
  {markers.map((marker) => {
    // Most points carry nothing but the tag that put them on the map. A popup
    // holding only the name repeats what the marker already said, and covers
    // the map to do it, so those points get a line at the bottom of the screen
    // instead and the map stays where it is
    const hasDetails = getDisplayableTags(marker).length > 0;
    const { title } = describeMarker(marker);

    return <Marker
      key={String(marker.id)}
      position={marker.position}
      icon={getMarkerIcon(marker)}
      eventHandlers={
        hasDetails ? undefined : { click: () => onNotice?.(`${title} — no extra details`) }
      }
    >
      {hasDetails && (
        <Popup className="poi-popup" maxWidth={380} minWidth={260} autoPanPadding={[24, 24]}>
          <RenderMarkerContents marker={marker} />
        </Popup>
      )}
    </Marker>
  })}
</MarkerClusterGroup>
}

/**
 * Nothing else on the page can change what a marker looks like, and rendering
 * this list rebinds every marker on the map. Repainting it because a message
 * appeared at the bottom of the screen is how clicks went missing.
 */
export default React.memo(PoiMarkers);
