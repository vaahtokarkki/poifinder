import ParkIcon from "@mui/icons-material/Park";
import WcIcon from "@mui/icons-material/Wc";
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
import * as React from "react";

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
  display: string;
  icon: CategoryIcon;
  color: string;
  group: CATEGORY_GROUP; 
};

// Main config object
export const CATEGORY_CONFIG: Record<CATEGORIES, CategoryConfig> = {
  [CATEGORIES.Playgrounds]: {
    filters: ["[leisure=playground][access!=private]"],
    display: "Playgrounds",
    icon: React.createElement(ParkIcon),
    color: "#388e3c",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.PostBoxes]: {
    filters: ["[amenity=post_box]"],
    display: "Post boxes",
    icon: React.createElement(LocalPostOfficeIcon),
    color: "#d32f2f",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.Toilets]: {
    // The second filter is buildings that say they have a toilet without being
    // one: shopping centres, supermarkets, museums, libraries and town halls,
    // campuses. One regex rather than a filter per value, because each filter
    // is its own statement in the Overpass query and this is a category people
    // run on a phone. `toilets=yes` is what all of them have to carry, so the
    // osmium import tag is unchanged and the extract needs no reimport
    filters: [
      "[amenity=toilets]",
      '[building~"^(retail|supermarket|museum|public|university)$"][toilets=yes]',
    ],
    display: "Toilets",
    icon: React.createElement(WcIcon),
    color: "#1976d2",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.GasStation]: {
    filters: ["[amenity=fuel]"],
    display: "Gas stations",
    icon: React.createElement(LocalGasStationIcon),
    color: "#fbc02d",
    group: CATEGORY_GROUP.Car,
  },
  [CATEGORIES.ChargingStation]: {
    filters: ["[amenity=charging_station]"],
    display: "Charging stations",
    icon: React.createElement(EvStationIcon),
    color: "#388e3c",
    group: CATEGORY_GROUP.Car,
  },
  [CATEGORIES.Parking]: {
    filters: ["[amenity=parking][access!=private]"],
    display: "Parking",
    icon: React.createElement(LocalParkingIcon),
    color: "#1976d2",
    group: CATEGORY_GROUP.Car,
  },
  [CATEGORIES.Icecream]: {
    filters: ["[amenity=ice_cream]", "[shop=ice_cream]", "[cuisine=ice_cream]"],
    display: "Ice cream",
    icon: React.createElement(IcecreamIcon),
    color: "#ffb300",
    group: CATEGORY_GROUP.Food,
  },
  [CATEGORIES.Shelter]: {
    filters: ['[amenity=shelter][shelter_type~"^(picnic_shelter|lean_to|weather_shelter|basic_hut)$"]', "[fireplace=yes][access!=private]", "[tourism=wilderness_hut]"],
    display: "Shelter",
    icon: React.createElement(DeckIcon),
    color: "#1B5E20",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.TentSite]: {
    filters: ["[tourism=camp_site]"],
    display: "Camp site",
    icon: React.createElement(BedtimeIcon),
    color: "#212121",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.Beach]: {
    filters: ["[natural=beach]", "[leisure=swimming_area]"],
    display: "Beach & swimming",
    icon: React.createElement(BeachAccessIcon),
    color: "#FFD600",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.DogPark]: {
    filters: ["[leisure=dog_park]"],
    display: "Dog park",
    icon: React.createElement(PetsIcon),
    color: "#3E2723",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.RestArea]: {
    filters: ["[highway=rest_area]"],
    display: "Rest area",
    icon: React.createElement(NaturePeopleIcon),
    color: "#0D47A1",
    group: CATEGORY_GROUP.Car,
  },
  [CATEGORIES.Recycling]: {
    filters: ["[amenity=recycling]"],
    display: "Recycling",
    icon: React.createElement(RecyclingIcon),
    color: "green",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.Atm]: {
    // Standalone machines, plus banks and shops that have one
    filters: ["[amenity=atm]", "[atm=yes]"],
    display: "ATM",
    icon: React.createElement(LocalAtmIcon),
    color: "#2E7D32",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.Picnic]: {
    // A single table, or a whole picnic area
    filters: ["[leisure=picnic_table]", "[tourism=picnic_site]"],
    display: "Picnic spots",
    icon: React.createElement(TableRestaurantIcon),
    color: "#795548",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.LuggageStorage]: {
    filters: ["[amenity=luggage_locker]", "[amenity=left_luggage]"],
    display: "Luggage storage",
    icon: React.createElement(LuggageIcon),
    color: "#455A64",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.Viewpoint]: {
    filters: ["[tourism=viewpoint]"],
    display: "Viewpoints",
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
    ],
    display: "Drinking water",
    icon: React.createElement(WaterDropIcon),
    color: "#0288D1",
    group: CATEGORY_GROUP.Essentials,
  },
  [CATEGORIES.SanitaryDumpStation]: {
    filters: ["[amenity=sanitary_dump_station]"],
    display: "Dump station",
    icon: React.createElement(RvHookupIcon),
    color: "#5D4037",
    group: CATEGORY_GROUP.Car,
  },
  [CATEGORIES.OutdoorGym]: {
    // Outdoor gyms are tagged both as fitness stations and as fitness pitches
    filters: ["[leisure=fitness_station]", "[leisure=pitch][sport=fitness]"],
    display: "Outdoor gym",
    icon: React.createElement(FitnessCenterIcon),
    color: "#E64A19",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.Library]: {
    // Public libraries, plus the street bookcases and book exchange boxes
    filters: ["[amenity=library]", "[amenity=public_bookcase]"],
    display: "Libraries",
    icon: React.createElement(LocalLibraryIcon),
    color: "#6D4C41",
    group: CATEGORY_GROUP.Essentials,
  },
};

export type CategoryPreset = {
  label: string;
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
    label: "Family",
    icon: React.createElement(FamilyRestroomIcon),
    color: "#2E7D32",
    categories: [CATEGORIES.Playgrounds, CATEGORIES.Toilets],
  },
  {
    label: "Road trip",
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
    label: "Camping",
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
    label: "Van life",
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
    label: "Outdoors",
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
    label: "Dog walk",
    icon: React.createElement(PetsIcon),
    color: "#8D6E63",
    categories: [
      CATEGORIES.DogPark,
      CATEGORIES.DrinkingWater,
      CATEGORIES.Toilets,
    ],
  },
  {
    label: "Errands",
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

// Helper to parse a filter string like "[amenity=retail][toilets=yes]" into { amenity: "retail", toilets: "yes" }
export function parseFilterString(filter: string): Record<string, string> {
  const obj: Record<string, string> = {};
  const regex = /\[([a-zA-Z0-9:_-]+)=([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(filter)) !== null) {
    obj[match[1]] = match[2];
  }
  return obj;
}

// CATEGORY_MARKER_MAPPING: Record<CATEGORIES, Array<Record<string, string>>>
export const CATEGORY_MARKER_MAPPING: Record<CATEGORIES, Record<string, string>[]> = Object.fromEntries(
  Object.entries(CATEGORY_CONFIG).map(([cat, config]) => [
    Number(cat),
    config.filters.map(parseFilterString),
  ])
) as Record<CATEGORIES, Record<string, string>[]>;

export const CATEGORY_GROUP_DISPLAY: Record<CATEGORY_GROUP, string> = {
  [CATEGORY_GROUP.Essentials]: "Essentials",
  [CATEGORY_GROUP.Car]: "Car",
  [CATEGORY_GROUP.Food]: "Food",
  [CATEGORY_GROUP.Nature]: "Nature",
};

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
} as const;
