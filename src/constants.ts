import ParkIcon from "@mui/icons-material/Park";
import WcIcon from "@mui/icons-material/Wc";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import LocalPostOfficeIcon from "@mui/icons-material/LocalPostOffice";
import EvStationIcon from "@mui/icons-material/EvStation";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import IcecreamIcon from "@mui/icons-material/Icecream";
import * as React from "react";

export enum CATEGORIES {
  Playgrounds,
  PostBoxes,
  Toilets,
  GasStation,
  ChargingStation,
  Parking,
  Icecream,
}

// Category config type
export type CategoryConfig = {
  filters: string[];
  display: string;
  icon: React.ReactElement;
  color: string;
};

// Main config object
export const CATEGORY_CONFIG: Record<CATEGORIES, CategoryConfig> = {
  [CATEGORIES.Playgrounds]: {
    filters: ["[leisure=playground]"],
    display: "Playgrounds",
    icon: React.createElement(ParkIcon),
    color: "#388e3c",
  },
  [CATEGORIES.PostBoxes]: {
    filters: ["[amenity=post_box]"],
    display: "Post boxes",
    icon: React.createElement(LocalPostOfficeIcon),
    color: "#d32f2f",
  },
  [CATEGORIES.Toilets]: {
    filters: ["[amenity=toilets]", "[building=retail][toilets=yes]"],
    display: "Toilets",
    icon: React.createElement(WcIcon),
    color: "#1976d2",
  },
  [CATEGORIES.GasStation]: {
    filters: ["[amenity=fuel]"],
    display: "Gas stations",
    icon: React.createElement(LocalGasStationIcon),
    color: "#fbc02d",
  },
  [CATEGORIES.ChargingStation]: {
    filters: ["[amenity=charging_station]"],
    display: "Charging stations",
    icon: React.createElement(EvStationIcon),
    color: "#388e3c",
  },
  [CATEGORIES.Parking]: {
    filters: ["[amenity=parking][access!=private]"],
    display: "Parking",
    icon: React.createElement(LocalParkingIcon),
    color: "#1976d2",
  },
  [CATEGORIES.Icecream]: {
    filters: ["[amenity=ice_cream]", "[shop=ice_cream]", "[cuisine=ice_cream]"],
    display: "Ice cream",
    icon: React.createElement(IcecreamIcon),
    color: "#ffb300",
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
