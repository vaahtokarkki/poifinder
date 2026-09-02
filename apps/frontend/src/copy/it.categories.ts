/**
 * The Italian category nouns.
 *
 * Nouns only — no `intro`, no `faq`. `categoryCopy` falls back field by field,
 * so these 78 strings put Italian in every title, heading, link and chip on the
 * page while the prose underneath stays English. That is a shippable state and
 * the one Finnish has been in since August, not a half-finished one.
 *
 * `plural` and `singular` are the bare citation form, because the templates
 * decide the slot. Do not put a case- or gender-inflected form here.
 *
 * Every noun in the live categories was chosen from `npm run copy:nouns`
 * rather than from a dictionary: the question search asks is not what the
 * thing is called but what people type. "isola ecologica" completes to Brescia, Palermo and Messina, and
 * "fontanelle" to Milano, Roma, Parigi and Vienna — which is the traveller
 * demand this deck exists for.
 *
 * NOT YET REVIEWED BY A NATIVE SPEAKER.
 */
import type { CategoryCopy } from "./types";

const nouns: Record<string, Partial<CategoryCopy>> = {
  "toilets": { plural: "bagni pubblici", singular: "bagno pubblico", heading: "Bagni pubblici" },
  "drinking-water": { plural: "fontanelle", singular: "fontanella", heading: "Acqua potabile" },
  "playgrounds": { plural: "parchi giochi", singular: "parco giochi", heading: "Parchi giochi" },
  "parking": { plural: "parcheggi", singular: "parcheggio", heading: "Parcheggi" },
  "charging-stations": { plural: "colonnine di ricarica", singular: "colonnina di ricarica", heading: "Colonnine di ricarica" },
  "gas-stations": { plural: "distributori di benzina", singular: "distributore di benzina", heading: "Distributori" },
  "ice-cream": { plural: "gelaterie", singular: "gelateria", heading: "Gelaterie" },
  "dog-parks": { plural: "aree cani", singular: "area cani", heading: "Aree cani" },
  "picnic-spots": { plural: "aree picnic", singular: "area picnic", heading: "Aree picnic" },
  "viewpoints": { plural: "punti panoramici", singular: "punto panoramico", heading: "Punti panoramici" },
  "beaches": { plural: "spiagge", singular: "spiaggia", heading: "Spiagge" },
  "atms": { plural: "bancomat", singular: "bancomat", heading: "Bancomat" },
  "post-boxes": { plural: "cassette postali", singular: "cassetta postale", heading: "Cassette postali" },
  "recycling": { plural: "isole ecologiche", singular: "isola ecologica", heading: "Isole ecologiche" },
  "luggage-storage": { plural: "depositi bagagli", singular: "deposito bagagli", heading: "Depositi bagagli" },
  "libraries": { plural: "biblioteche", singular: "biblioteca", heading: "Biblioteche" },
  "outdoor-gyms": { plural: "palestre all'aperto", singular: "palestra all'aperto", heading: "Palestre all'aperto" },
  "camp-sites": { plural: "campeggi", singular: "campeggio", heading: "Campeggi" },
  "shelters": { plural: "rifugi", singular: "rifugio", heading: "Rifugi" },
  "rest-areas": { plural: "aree di sosta", singular: "area di sosta", heading: "Aree di sosta" },
  "dump-stations": { plural: "aree di scarico camper", singular: "area di scarico camper", heading: "Scarico camper" },
  "post-offices": { plural: "uffici postali", singular: "ufficio postale", heading: "Uffici postali" },
  "showers": { plural: "docce pubbliche", singular: "doccia pubblica", heading: "Docce pubbliche" },
  "fireplaces": { plural: "aree barbecue", singular: "area barbecue", heading: "Aree barbecue" },
  "bicycle-repair": { plural: "ciclofficine", singular: "ciclofficina", heading: "Ciclofficine" },
  "benches": { plural: "panchine", singular: "panchina", heading: "Panchine" },
};

export const itCategories: Record<string, Partial<CategoryCopy>> = nouns;
