/**
 * The French category nouns.
 *
 * Nouns only — no `intro`, no `faq`. `categoryCopy` falls back field by field,
 * so these 78 strings put French in every title, heading, link and chip on the
 * page while the prose underneath stays English. That is a shippable state and
 * the one Finnish has been in since August, not a half-finished one.
 *
 * `plural` and `singular` are the bare citation form, because the templates
 * decide the slot. Do not put a case- or gender-inflected form here.
 *
 * Every noun in the live categories was chosen from `npm run copy:nouns`
 * rather than from a dictionary: the question search asks is not what the
 * thing is called but what people type. "point de recyclage" and "fontaine à eau potable" both complete into
 * city names; the bus-shelter noun does not, which is why shelters is absent
 * from the French traveller tree.
 *
 * NOT YET REVIEWED BY A NATIVE SPEAKER.
 */
import type { CategoryCopy } from "./types";

const nouns: Record<string, Partial<CategoryCopy>> = {
  "toilets": { plural: "toilettes publiques", singular: "toilette publique", heading: "Toilettes publiques" },
  "drinking-water": { plural: "fontaines à eau potable", singular: "fontaine à eau potable", heading: "Eau potable" },
  "playgrounds": { plural: "aires de jeux", singular: "aire de jeux", heading: "Aires de jeux" },
  "parking": { plural: "parkings", singular: "parking", heading: "Parking" },
  "charging-stations": { plural: "bornes de recharge", singular: "borne de recharge", heading: "Bornes de recharge" },
  "gas-stations": { plural: "stations-service", singular: "station-service", heading: "Stations-service" },
  "ice-cream": { plural: "glaciers", singular: "glacier", heading: "Glaciers" },
  "dog-parks": { plural: "parcs à chiens", singular: "parc à chiens", heading: "Parcs à chiens" },
  "picnic-spots": { plural: "aires de pique-nique", singular: "aire de pique-nique", heading: "Aires de pique-nique" },
  "viewpoints": { plural: "points de vue", singular: "point de vue", heading: "Points de vue" },
  "beaches": { plural: "plages", singular: "plage", heading: "Plages et baignade" },
  "atms": { plural: "distributeurs de billets", singular: "distributeur de billets", heading: "Distributeurs de billets" },
  "post-boxes": { plural: "boîtes aux lettres", singular: "boîte aux lettres", heading: "Boîtes aux lettres" },
  "recycling": { plural: "déchetteries", singular: "déchetterie", heading: "Déchetteries" },
  "luggage-storage": { plural: "consignes à bagages", singular: "consigne à bagages", heading: "Consignes à bagages" },
  "libraries": { plural: "bibliothèques", singular: "bibliothèque", heading: "Bibliothèques" },
  "outdoor-gyms": { plural: "aires de fitness en plein air", singular: "aire de fitness en plein air", heading: "Fitness en plein air" },
  "camp-sites": { plural: "campings", singular: "camping", heading: "Campings" },
  "shelters": { plural: "abris", singular: "abri", heading: "Abris" },
  "rest-areas": { plural: "aires de repos", singular: "aire de repos", heading: "Aires de repos" },
  "dump-stations": { plural: "aires de vidange", singular: "aire de vidange", heading: "Aires de vidange" },
  "post-offices": { plural: "bureaux de poste", singular: "bureau de poste", heading: "Bureaux de poste" },
  "showers": { plural: "douches publiques", singular: "douche publique", heading: "Douches publiques" },
  "fireplaces": { plural: "aires de barbecue", singular: "aire de barbecue", heading: "Aires de barbecue" },
  "bicycle-repair": { plural: "stations de réparation de vélos", singular: "station de réparation de vélos", heading: "Réparation de vélos" },
  "benches": { plural: "bancs publics", singular: "banc public", heading: "Bancs publics" },
};

export const frCategories: Record<string, Partial<CategoryCopy>> = nouns;
