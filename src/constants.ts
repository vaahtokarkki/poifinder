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
  Beach
}

export enum CATEGORY_GROUP {
  Essentials,
  Car,
  Food,
  Nature,
}

// Category config type
export type CategoryConfig = {
  filters: string[];
  display: string;
  icon: React.ReactElement;
  color: string;
  group: CATEGORY_GROUP; 
};

// Main config object
export const CATEGORY_CONFIG: Record<CATEGORIES, CategoryConfig> = {
  [CATEGORIES.Playgrounds]: {
    filters: ["[leisure=playground]"],
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
    filters: ["[amenity=toilets]", "[building=retail][toilets=yes]"],
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
    color: "balck",
    group: CATEGORY_GROUP.Nature,
  },
  [CATEGORIES.Beach]: {
    filters: ["[natural=beach]"],
    display: "Beach",
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
};

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
