export enum CATEGORIES {
  Playgrounds,
  PostBoxes,
  Toilets,
  GasStation,
  ChargingStation,
  Parking,
  Icecream,
}

export const CATEGORY_FILTERS = {
  [CATEGORIES.Playgrounds]: ["[leisure=playground]"],
  [CATEGORIES.PostBoxes]: ["[amenity=post_box]"],
  [CATEGORIES.Toilets]: ["[amenity=toilets]", "[building=retail][toilets=yes]"],
  [CATEGORIES.GasStation]: ["[amenity=fuel]"],
  [CATEGORIES.ChargingStation]: ["[amenity=charging_station]"],
  [CATEGORIES.Parking]: ["[amenity=parking][access!=private]"],
  [CATEGORIES.Icecream]: ["[amenity=ice_cream]"],
};

// Display value mapping for CATEGORIES
export const CATEGORY_OPTIONS: Record<CATEGORIES, string> = {
  [CATEGORIES.Playgrounds]: "Playgrounds",
  [CATEGORIES.PostBoxes]: "Post boxes",
  [CATEGORIES.Toilets]: "Toilets",
  [CATEGORIES.GasStation]: "Gas stations",
  [CATEGORIES.ChargingStation]: "Charging stations",
  [CATEGORIES.Parking]: "Parking",
  [CATEGORIES.Icecream]: "Ice cream",
};
