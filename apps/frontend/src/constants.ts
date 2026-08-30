import ParkIcon from "@mui/icons-material/Park";
import { ToiletIcon } from "./icons";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import LocalPostOfficeIcon from "@mui/icons-material/LocalPostOffice";
import EvStationIcon from "@mui/icons-material/EvStation";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import IcecreamIcon from "@mui/icons-material/Icecream";
import DeckIcon from '@mui/icons-material/Deck';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import PetsIcon from '@mui/icons-material/Pets';
import NaturePeopleIcon from '@mui/icons-material/NaturePeople';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import RecyclingIcon from '@mui/icons-material/Recycling';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import LuggageIcon from '@mui/icons-material/Luggage';
import LandscapeIcon from '@mui/icons-material/Landscape';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import RvHookupIcon from '@mui/icons-material/RvHookup';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import CabinIcon from '@mui/icons-material/Cabin';
import HikingIcon from '@mui/icons-material/Hiking';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';
import ShowerIcon from '@mui/icons-material/Shower';
import OutdoorGrillIcon from '@mui/icons-material/OutdoorGrill';
import HandymanIcon from '@mui/icons-material/Handyman';
import ChairAltIcon from '@mui/icons-material/ChairAlt';
import * as React from "react";
import { getLocale, ui } from "./copy";
import type { Locale } from "./copy";

export enum CATEGORIES {
  Playgrounds,
  PostBoxes,
  Toilets,
  GasStation,
  ChargingStation,
  Parking,
  Icecream,
  Shelter,
  TentSite,
  DogPark,
  RestArea,
  Beach,
  Recycling,
  // Append only: these numbers are what share links and localStorage store,
  // so inserting in the middle would silently repoint existing selections
  Atm,
  Picnic,
  LuggageStorage,
  Viewpoint,
  DrinkingWater,
  SanitaryDumpStation,
  OutdoorGym,
  Library,
  PostOffice,
  Shower,
  Fireplace,
  // Was CompressedAir, which drew petrol station tyre inflators and never had
  // a listable row in any city. The slot is reused rather than appended to,
  // because appending would leave a dead number that share links still decode
  BicycleRepair,
  Bench,
}

export enum CATEGORY_GROUP {
  Essentials,
  Car,
  Food,
  Nature,
}

/** An icon element that can be re-rendered in another size */
export type CategoryIcon = React.ReactElement<{
  fontSize?: "inherit" | "small" | "medium" | "large";
}>;

// Category config type
export type CategoryConfig = {
  filters: string[];
  icon: CategoryIcon;
  color: string;
  group: CATEGORY_GROUP; 
};

// Main config object
export const CATEGORY_CONFIG: Record<CATEGORIES, CategoryConfig> = {
  [CATEGORIES.Playgrounds]: {
    filters: ["[leisure=playground][access!=private]"],
    icon: React.createElement(ParkIcon),
    color: "#388e3c",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.PostBoxes]: {
    filters: ["[amenity=post_box]"],
    icon: React.createElement(LocalPostOfficeIcon),
    color: "#d32f2f",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.Toilets]: {
    // The second filter is buildings that say they have a toilet without being
    // one: shopping centres, supermarkets, museums, libraries and town halls,
    // campuses, stations. One regex rather than a filter per value, because
    // each filter is its own statement in the Overpass query and this is a
    // category people run on a phone. `toilets=yes` is what all of them have
    // to carry, so the osmium import tag is unchanged and the extract needs no
    // reimport when this list grows
    filters: [
      "[amenity=toilets]",
      '[building~"^(retail|supermarket|mall|commercial|museum|public|university|train_station)$"][toilets=yes]',
    ],
    icon: React.createElement(ToiletIcon),
    color: "#1976d2",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.GasStation]: {
    filters: ["[amenity=fuel]"],
    icon: React.createElement(LocalGasStationIcon),
    color: "#fbc02d",
    group: CATEGORY_GROUP.Car,
  },
  [CATEGORIES.ChargingStation]: {
    filters: ["[amenity=charging_station]"],
    icon: React.createElement(EvStationIcon),
    color: "#388e3c",
    group: CATEGORY_GROUP.Car,
  },
  [CATEGORIES.Parking]: {
    filters: ["[amenity=parking][access!=private]"],
    icon: React.createElement(LocalParkingIcon),
    color: "#1976d2",
    group: CATEGORY_GROUP.Car,
  },
  [CATEGORIES.Icecream]: {
    filters: ["[amenity=ice_cream]", "[shop=ice_cream]", "[cuisine=ice_cream]"],
    icon: React.createElement(IcecreamIcon),
    color: "#ffb300",
    group: CATEGORY_GROUP.Food,
  },
  [CATEGORIES.Shelter]: {
    // Only shelters that say what kind they are: an untyped amenity=shelter is
    // as likely to be a bus stop as a hut. Fireplaces used to live here and are
    // their own category now, because a fire ring in a park is not a structure
    // you can sit out a rainstorm in
    filters: [
      '[amenity=shelter][shelter_type~"^(picnic_shelter|lean_to|weather_shelter|basic_hut)$"]',
      "[tourism=wilderness_hut]",
      "[tourism=alpine_hut]",
    ],
    icon: React.createElement(DeckIcon),
    color: "#1B5E20",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.TentSite]: {
    // Caravan sites alongside the tent ones: the van life preset sends people
    // here, and a motorhome cannot use half of what camp_site alone returns
    filters: ["[tourism=camp_site]", "[tourism=caravan_site]"],
    icon: React.createElement(BedtimeIcon),
    color: "#212121",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.Beach]: {
    filters: ["[natural=beach]", "[leisure=swimming_area]"],
    icon: React.createElement(BeachAccessIcon),
    color: "#FFD600",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.DogPark]: {
    filters: ["[leisure=dog_park]"],
    icon: React.createElement(PetsIcon),
    color: "#3E2723",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.RestArea]: {
    // rest_area is the layby, services is the full motorway stop with fuel and
    // a building. Both are what someone driving means by "somewhere to stop"
    filters: ["[highway=rest_area]", "[highway=services]"],
    icon: React.createElement(NaturePeopleIcon),
    color: "#0D47A1",
    group: CATEGORY_GROUP.Car,
  },
  [CATEGORIES.Recycling]: {
    filters: ["[amenity=recycling]"],
    icon: React.createElement(RecyclingIcon),
    color: "green",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.Atm]: {
    // Standalone machines, plus banks and shops that have one
    filters: ["[amenity=atm]", "[atm=yes]"],
    icon: React.createElement(LocalAtmIcon),
    color: "#2E7D32",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.Picnic]: {
    // A single table, or a whole picnic area
    filters: ["[leisure=picnic_table]", "[tourism=picnic_site]"],
    icon: React.createElement(TableRestaurantIcon),
    color: "#795548",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.LuggageStorage]: {
    filters: ["[amenity=luggage_locker]", "[amenity=left_luggage]"],
    icon: React.createElement(LuggageIcon),
    color: "#455A64",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.Viewpoint]: {
    // The structures people climb for a view, not just the marked spots:
    // observation towers, and the bird hides that are the same idea with walls
    filters: [
      "[tourism=viewpoint]",
      '[man_made=tower]["tower:type"=observation]',
      "[leisure=bird_hide]",
    ],
    icon: React.createElement(LandscapeIcon),
    color: "#7B1FA2",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.DrinkingWater]: {
    // Every common way a free, potable water source is tagged. Plain
    // amenity=drinking_water can carry drinking_water=no when it is out of use
    filters: [
      "[amenity=drinking_water][drinking_water!=no]",
      "[amenity=water_point]",
      "[man_made=water_tap][drinking_water=yes]",
      "[man_made=drinking_fountain]",
      "[amenity=fountain][drinking_water=yes]",
      "[fountain=drinking]",
      "[man_made=water_well][drinking_water=yes]",
    ],
    icon: React.createElement(WaterDropIcon),
    color: "#0288D1",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.SanitaryDumpStation]: {
    filters: ["[amenity=sanitary_dump_station]"],
    icon: React.createElement(RvHookupIcon),
    color: "#5D4037",
    group: CATEGORY_GROUP.Car,
  },
  [CATEGORIES.OutdoorGym]: {
    // Outdoor gyms are tagged both as fitness stations and as fitness pitches
    filters: ["[leisure=fitness_station]", "[leisure=pitch][sport=fitness]"],
    icon: React.createElement(FitnessCenterIcon),
    color: "#E64A19",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.Library]: {
    // Public libraries, plus the street bookcases and book exchange boxes
    filters: ["[amenity=library]", "[amenity=public_bookcase]"],
    icon: React.createElement(LocalLibraryIcon),
    color: "#6D4C41",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.PostOffice]: {
    // The counter you post a parcel over, kept apart from the post boxes: one
    // has opening hours and the other is a slot in a wall
    filters: ["[amenity=post_office]"],
    icon: React.createElement(MarkunreadMailboxIcon),
    color: "#AD1457",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.Shower]: {
    filters: ["[amenity=shower]"],
    icon: React.createElement(ShowerIcon),
    color: "#00897B",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.Fireplace]: {
    // The primary tags first: a fire ring in a park is leisure=firepit or
    // amenity=bbq, and only the ones attached to something else (a shelter, a
    // picnic site) carry the fireplace=yes that used to be all this matched.
    // access!=private on every branch: a grill in a private garden or a members
    // only club is mapped the same way as a public one, and turning up to a
    // fireplace you are not allowed to use is worse than not finding it
    filters: [
      "[leisure=firepit][access!=private]",
      "[amenity=bbq][access!=private]",
      "[fireplace=yes][access!=private]",
    ],
    icon: React.createElement(OutdoorGrillIcon),
    color: "#FF6F00",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.BicycleRepair]: {
    /**
     * Public bike repair stands, and the pumps that are explicitly for bikes.
     *
     * `amenity=compressed_air` on its own is overwhelmingly the tyre inflator
     * on a petrol station forecourt: of the compressed air within 15 km of
     * Berlin 29 of 29 is that, London 19 of 19, Helsinki 7 of 10. Those belong
     * to a car category this site no longer publishes, so the bare tag is gone
     * and only the ones a mapper marked `bicycle=yes` come through.
     *
     * The repair stand is the category. It is the shape of thing that does
     * well here — unnamed, mapped by cyclists, and answered by nothing else,
     * since a search for bike repair returns shops rather than the free stand
     * two streets away.
     */
    filters: ["[amenity=bicycle_repair_station]", "[amenity=compressed_air][bicycle=yes]"],
    icon: React.createElement(HandymanIcon),
    color: "#00897B",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.Bench]: {
    // By far the largest category here, and the reason the extract grew. Worth
    // it: where you can sit down is exactly the kind of thing no commercial
    // map records and someone with a bad knee plans a walk around
    filters: ["[amenity=bench]"],
    icon: React.createElement(ChairAltIcon),
    color: "#9E9D24",
    group: CATEGORY_GROUP.Essentials,
  },
};

export type CategoryPreset = {
  /** Stable key into the copy deck; the name it shows lives there */
  id: string;
  icon: CategoryIcon;
  /** Tints the icon, so the presets are told apart at a glance */
  color: string;
  categories: CATEGORIES[];
};

/**
 * Ready made category combinations for the most common trips, so that the app
 * is useful without picking the categories one by one.
 */
export const CATEGORY_PRESETS: CategoryPreset[] = [
  {
    id: "family",
    icon: React.createElement(FamilyRestroomIcon),
    color: "#2E7D32",
    categories: [CATEGORIES.Playgrounds, CATEGORIES.Toilets],
  },
  {
    id: "road-trip",
    icon: React.createElement(DirectionsCarIcon),
    color: "#1565C0",
    categories: [
      CATEGORIES.GasStation,
      CATEGORIES.ChargingStation,
      CATEGORIES.Toilets,
      CATEGORIES.RestArea,
    ],
  },
  {
    id: "camping",
    icon: React.createElement(CabinIcon),
    color: "#EF6C00",
    categories: [
      CATEGORIES.TentSite,
      CATEGORIES.Shelter,
      CATEGORIES.DrinkingWater,
      CATEGORIES.Toilets,
    ],
  },
  {
    id: "van-life",
    icon: React.createElement(RvHookupIcon),
    color: "#6A1B9A",
    categories: [
      CATEGORIES.SanitaryDumpStation,
      CATEGORIES.DrinkingWater,
      CATEGORIES.Toilets,
      CATEGORIES.Parking,
      CATEGORIES.Recycling,
    ],
  },
  {
    id: "outdoors",
    icon: React.createElement(HikingIcon),
    color: "#00838F",
    categories: [
      CATEGORIES.Viewpoint,
      CATEGORIES.Picnic,
      CATEGORIES.DrinkingWater,
      CATEGORIES.OutdoorGym,
    ],
  },
  {
    id: "dog-walk",
    icon: React.createElement(PetsIcon),
    color: "#8D6E63",
    categories: [
      CATEGORIES.DogPark,
      CATEGORIES.DrinkingWater,
      CATEGORIES.Toilets,
    ],
  },
  {
    id: "errands",
    icon: React.createElement(StorefrontIcon),
    color: "#C62828",
    categories: [
      CATEGORIES.Atm,
      CATEGORIES.PostBoxes,
      CATEGORIES.Recycling,
      CATEGORIES.LuggageStorage,
    ],
  },
];

/** True when the selection is exactly the categories of the preset */
export function isPresetActive(
  preset: CategoryPreset,
  selected: CATEGORIES[]
): boolean {
  if (preset.categories.length !== selected.length) return false;
  return preset.categories.every((category) => selected.includes(category));
}

/** One condition of an Overpass filter: `[key=value]`, `!=`, `~` or `!~` */
export type FilterCondition = {
  key: string;
  /** The literal value, or the pattern when `isRegex` */
  value: string;
  isRegex: boolean;
  isNegated: boolean;
  pattern?: RegExp;
};

/**
 * The conditions of a filter string like `[building~"^(retail|public)$"][toilets=yes]`.
 *
 * Every operator Overpass takes, not just `=`. Reading only `=` meant a filter
 * lost the conditions written any other way, and the ones that survived were
 * matched on their own: the toilets filter above came out as "anything tagged
 * toilets=yes", which is every library with a toilet in it.
 */
export function parseFilterString(filter: string): FilterCondition[] {
  const conditions: FilterCondition[] = [];
  // The key can be quoted as well as the value: Overpass QL demands it for
  // anything with a colon in it, such as tower:type
  const regex = /\[(?:"([^"]*)"|([a-zA-Z0-9:_-]+))(!?[=~])(?:"([^"]*)"|([^\]]*))\]/g;
  let match;
  while ((match = regex.exec(filter)) !== null) {
    const [, quotedKey, bareKey, operator, quoted, bare] = match;
    const key = quotedKey ?? bareKey;
    const value = quoted ?? bare;
    const isRegex = operator.endsWith("~");
    conditions.push({
      key,
      value,
      isRegex,
      isNegated: operator.startsWith("!"),
      pattern: isRegex ? new RegExp(value) : undefined,
    });
  }
  return conditions;
}

/** Parsed once per filter string, then reused for every marker on the map */
const filterCache = new Map<string, FilterCondition[]>();

const getFilterConditions = (filter: string): FilterCondition[] => {
  let conditions = filterCache.get(filter);
  if (!conditions) {
    conditions = parseFilterString(filter);
    filterCache.set(filter, conditions);
  }
  return conditions;
};

/**
 * Whether a point's tags satisfy a filter, the way Overpass read it when the
 * point was fetched. A missing tag satisfies a negated condition: `[access!=private]`
 * is there to drop the private ones, not to demand an access tag.
 */
export function matchesFilter(
  tags: Record<string, string> | undefined,
  filter: string
): boolean {
  const conditions = getFilterConditions(filter);
  if (conditions.length === 0) return false;
  return conditions.every(({ key, value, isNegated, pattern }) => {
    const actual = tags?.[key];
    const hit =
      actual === undefined ? false : pattern ? pattern.test(actual) : actual === value;
    return isNegated ? !hit : hit;
  });
}

/**
 * The tags that say what a place is, rather than what it happens to have.
 * A filter pinned to one of these describes the point itself, and is taken
 * over one that is not: a library with a toilet in it is still a library.
 */
export const PRIMARY_TAG_KEYS = new Set([
  "amenity",
  "leisure",
  "tourism",
  "shop",
  "natural",
  "highway",
  "man_made",
]);

/** True when the filter pins one of the tags that say what a place is */
export const filterMatchesPrimaryTag = (filter: string): boolean =>
  getFilterConditions(filter).some(
    ({ key, isNegated }) => !isNegated && PRIMARY_TAG_KEYS.has(key)
  );

/**
 * The deck key of each group. Identity, not copy: the words these stand for
 * live in copy/en.ts under `ui.groups`.
 */
export const CATEGORY_GROUP_ID: Record<CATEGORY_GROUP, string> = {
  [CATEGORY_GROUP.Essentials]: "essentials",
  [CATEGORY_GROUP.Car]: "car",
  [CATEGORY_GROUP.Food]: "food",
  [CATEGORY_GROUP.Nature]: "nature",
};

/** The name of a category group, as the picker heads it */
export function groupDisplay(
  group: CATEGORY_GROUP,
  locale: Locale = getLocale()
): string {
  return ui(locale).groups[CATEGORY_GROUP_ID[group]] ?? "";
}

/** The name of a preset, as its chip reads */
export function presetLabel(
  preset: CategoryPreset,
  locale: Locale = getLocale()
): string {
  return ui(locale).presets[preset.id] ?? preset.id;
}

/**
 * A self hosted Overpass instance, when the build was given one
 * (VITE_OVERPASS_API_URL, see apps/overpass). It is asked first and asked once:
 * the instance is ours, it holds only the categories below, and nobody else is
 * competing for it, so there is nothing for a retry loop to wait out.
 *
 * The mirrors below stay as a fallback for when it cannot answer at all. One
 * machine on a home connection is a single point of failure, and an empty map
 * is a worse answer than a slow one.
 */
export const SELF_HOSTED_OVERPASS_URL: string | undefined =
  import.meta.env.VITE_OVERPASS_API_URL?.trim() || undefined;

/**
 * The prologue every runtime query is built with.
 *
 * The `[timeout:]` and `[maxsize:]` are not belt and braces, they are what
 * lets the query run at all on our own instance. A dispatcher started with
 * `--time` / `--space` treats those as the budget shared by every query
 * running at once, and a query reserves what it declares out of that pool
 * before it may start. Declare nothing and Overpass fills in its own defaults
 * — 180 s and 512 MB — which is more than the pool holds, so the dispatcher
 * never grants a slot and every query, however cheap, comes back as a 504
 * carrying `Dispatcher_Client::request_read_and_idx::timeout`. That took the
 * API down for a day on 2026-08-24.
 *
 * These have to stay in step with OVERPASS_TIME and OVERPASS_SPACE in
 * apps/overpass/docker-compose.prod.yml, which are sized to hold several of
 * these at once, and with QUERY_TIMEOUT in scripts/fetch-poi-data.mjs. The
 * public mirrors run budgets far larger than anything here, so this changes
 * nothing for them.
 */
export const OVERPASS_QUERY_PROLOGUE = "[out:json][timeout:60][maxsize:268435456]";

// Public Overpass mirrors, used when no self hosted instance is configured
export const OVERPASS_API_CONFIG = {
  URLS: [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/cgi/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
  ],
  RETRY: {
    maxRetries: 3,
    initialDelayMs: 5000,
    backoffMultiplier: 2,
    jitterPercent: 10,
  },
  /**
   * How long to wait for a response, per phase.
   *
   * One number was too short in the place that mattered and would be far too
   * long everywhere else. The shared default of 10s is fine for deciding
   * whether a mirror is answering at all, and wrong for a dense query: a busy
   * Overpass queues the request and answers in twenty to forty seconds, so
   * giving up at ten abandons work the server is already doing and then asks
   * it again, which is how a slow mirror is turned into an overloaded one.
   *
   * `quick` is the fast failover pass, where the question is only "is this
   * host up". `patient` is for the self hosted instance and for the second
   * pass, both of which are the cases where waiting is the right answer:
   * nobody else is competing for our own instance, and by pass 2 every mirror
   * has already failed once and the visitor is committed to waiting anyway.
   *
   * Worst case wall time, all four mirrors down twice over: 45 + 4x15 + 4x(4
   * x45 + 35 backoff) ~= 16 min, against ~6 today. That upper bound is only
   * reached when Overpass is globally unavailable, and the failure is already
   * reported to the visitor at each step by the status callback. Cutting
   * maxRetries to 1 in pass 2 would bring it back under 6 min if that
   * trade ever looks wrong.
   */
  TIMEOUT: {
    /** Pass 1, which only has to find a host that answers */
    quickMs: 15000,
    /** Our own instance, and pass 2 where the visitor is already waiting */
    patientMs: 45000,
  },
} as const;
