import React from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import ParkIcon from '@mui/icons-material/Park';
import { renderToString } from "react-dom/server";
import { categoryDisplay } from "./seo/categories";
import { interpolate, ui } from "./copy";
import { analytics } from "./analytics";
import { divIcon } from "leaflet";
import type { PointExpression, Popup as LeafletPopup, PopupEvent } from "leaflet";
import {
  CATEGORY_CONFIG,
  CATEGORIES,
  filterMatchesPrimaryTag,
  matchesFilter,
} from "./constants";
import { OverpassMarkerData } from "./api/overpass"; // <-- Import the type
import type { EnclosingBuilding as EnclosingBuildingData } from "./api/overpass";
import { TranslationError, translate } from "./api/translate";
import type { TranslationFailure } from "./api/translate";
import MarkerClusterGroup from "./components/MarkerClusterGroup";
import PoiShape from "./components/PoiShape";
import { useEnclosingBuilding } from "./hooks/useOsmElement";
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
 * How close two points have to be, in pixels on the screen, before they are
 * shown as one group, once the map is close enough to be read as a street.
 *
 * Small on purpose. The usual reason to cluster is to thin out a crowded map,
 * and that is the opposite of what this app is for: a map of toilets that
 * shows bubbles instead of toilets is useless. This only catches the points
 * that genuinely cover each other, an icon being 25px wide, and leaves
 * everything a thumb can already tell apart alone.
 */
const CLUSTER_RADIUS_PX = 14;

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
 * 14px at street level, 24 at 16, 40 at 15, 69 at 14, the cap from 13 out.
 * Zooming in walks it back down, which is what makes a group an invitation
 * rather than a wall — the points are one zoom away, and the count on the disc
 * says how many are waiting.
 */
const clusterRadiusForZoom = (zoom: number): number => {
  if (zoom >= TIGHT_CLUSTER_ZOOM) return CLUSTER_RADIUS_PX;
  const stepsOut = TIGHT_CLUSTER_ZOOM - zoom;
  return Math.min(
    MAX_CLUSTER_RADIUS_PX,
    Math.round(CLUSTER_RADIUS_PX * CLUSTER_RADIUS_GROWTH ** stepsOut)
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
   * `access=customers`: somewhere you get into by buying something first. It
   * is still worth having on the map — a café toilet is a toilet — but it is
   * not the same offer as the point next to it, and a reader scanning for
   * somewhere to go should be able to tell the two apart without opening
   * either.
   *
   * So the category's colour is dropped for a light grey rather than dimmed.
   * The map is read by colour, and anything that keeps some of the hue is
   * saying "this one, a bit less" — which is a comparison the eye has to stop
   * and make at every marker. A grey one is out of that conversation at a
   * glance and still legible by its shape, which is what the reader falls back
   * on: these are the points to walk to when you were buying a coffee anyway,
   * and the condition is the first thing worth knowing about them.
   */
  customersOnly: boolean = false
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
        color: ${customersOnly ? CUSTOMERS_ONLY_COLOR : color};
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
 * What a customers-only point is drawn in instead of its category's colour.
 *
 * Light enough to drop out of the scan and dark enough to keep the icon's shape
 * readable against the white disc it sits on — the shape is all that is left to
 * say what the point is once the hue has gone. See RenderMarkerIcon.
 */
const CUSTOMERS_ONLY_COLOR = "#737474";

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
  const customersOnly = isCustomersOnly(marker);

  /**
   * Keyed as a string so the variants share the cache with everything else.
   * Category 0 is a real category and a falsy number, so the null check stays
   * explicit rather than becoming a ??
   */
  const key =
    category === null
      ? `uncategorised:${customersOnly ? "customers" : "open"}`
      : `${category}:${paidIcon ? "paid" : "free"}:${changingTable ? "baby" : "plain"}:${
          customersOnly ? "customers" : "open"
        }`;

  let icon = iconCache.get(key);
  if (!icon) {
    icon =
      category === null
        ? RenderMarkerIcon(<ParkIcon />, UNCATEGORISED_COLOR, customersOnly)
        : RenderMarkerIcon(
            paidIcon ?? CATEGORY_CONFIG[category].icon,
            getMarkerColor(marker, selected),
            customersOnly
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

  const shapeMarker = markers.find(marker => shapeKey(marker) === openShape) ?? null;

  const map = useMap();
  /** The popup currently on the map, while it is still allowed to pan it */
  const openPopupRef = React.useRef<LeafletPopup | null>(null);

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
    // fires neither of these
    map.on("dragstart", releaseMap);
    map.on("zoomstart", releaseMap);
    return () => {
      map.off("dragstart", releaseMap);
      map.off("zoomstart", releaseMap);
    };
  }, [map]);

  return (
    <>
      <MarkerClusterGroup
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
        {markers.map((marker) => {
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
          const hasDetails =
            buildPopupRows(marker.tags).length > 0 || describeSurvey(marker.tags) !== null;
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
                },
              };

          return <Marker
            key={String(marker.id)}
            position={marker.position}
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
