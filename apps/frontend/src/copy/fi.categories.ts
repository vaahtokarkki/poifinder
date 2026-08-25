/**
 * The Finnish category nouns.
 *
 * Nouns only — no `intro`, no `faq`. Those are 3,700 words of prose behind a
 * disclosure; these 78 strings are what every title, heading, link and chip on
 * the page is built from, so they are the half that decides whether a page
 * reads as Finnish. `categoryCopy` falls back field by field, so the prose
 * stays English underneath until somebody writes it.
 *
 * `plural` and `singular` are the bare nominative, which is what the templates
 * place: "{noun} {cityIn}" gives "Yleiset käymälät Helsingissä". Do not put a
 * noun here in a case form — the templates decide the slot, the deck supplies
 * the citation form. Same rule as the German deck, for the same reason.
 *
 * NOT YET REVIEWED BY A NATIVE SPEAKER.
 */
import { fiProse } from "./fi.prose";
import type { CategoryCopy } from "./types";

const nouns: Record<string, Partial<CategoryCopy>> = {
  toilets: { plural: "vessat", singular: "vessa", heading: "Vessat" },
  "drinking-water": {
    plural: "juomavesipisteet",
    singular: "juomavesipiste",
    heading: "Juomavesi",
  },
  playgrounds: { plural: "leikkipuistot", singular: "leikkipuisto", heading: "Leikkipuistot" },
  parking: { plural: "pysäköintialueet", singular: "pysäköintialue", heading: "Pysäköinti" },
  "charging-stations": {
    plural: "latauspisteet",
    singular: "latauspiste",
    heading: "Latauspisteet",
  },
  "gas-stations": { plural: "huoltoasemat", singular: "huoltoasema", heading: "Huoltoasemat" },
  "ice-cream": { plural: "jäätelöpaikat", singular: "jäätelöpaikka", heading: "Jäätelö" },
  "dog-parks": { plural: "koirapuistot", singular: "koirapuisto", heading: "Koirapuistot" },
  "picnic-spots": { plural: "eväspaikat", singular: "eväspaikka", heading: "Eväspaikat" },
  viewpoints: { plural: "näköalapaikat", singular: "näköalapaikka", heading: "Näköalapaikat" },
  beaches: {
    plural: "rannat ja uimapaikat",
    singular: "ranta tai uimapaikka",
    heading: "Rannat ja uinti",
  },
  atms: { plural: "pankkiautomaatit", singular: "pankkiautomaatti", heading: "Pankkiautomaatit" },
  "post-boxes": { plural: "postilaatikot", singular: "postilaatikko", heading: "Postilaatikot" },
  recycling: { plural: "kierrätyspisteet", singular: "kierrätyspiste", heading: "Kierrätys" },
  "luggage-storage": {
    plural: "matkatavarasäilytykset",
    singular: "matkatavarasäilytys",
    heading: "Matkatavarasäilytys",
  },
  libraries: { plural: "kirjastot", singular: "kirjasto", heading: "Kirjastot" },
  "outdoor-gyms": {
    plural: "ulkokuntosalit",
    singular: "ulkokuntosali",
    heading: "Ulkokuntosalit",
  },
  "camp-sites": { plural: "leirintäalueet", singular: "leirintäalue", heading: "Leirintäalueet" },
  shelters: { plural: "laavut ja majat", singular: "laavu tai maja", heading: "Laavut ja majat" },
  "rest-areas": { plural: "levähdysalueet", singular: "levähdysalue", heading: "Levähdysalueet" },
  "dump-stations": {
    plural: "jätevesipisteet",
    singular: "jätevesipiste",
    heading: "Jätevesipisteet",
  },
  "post-offices": { plural: "postit", singular: "posti", heading: "Postit" },
  showers: { plural: "yleiset suihkut", singular: "yleinen suihku", heading: "Suihkut" },
  fireplaces: {
    plural: "nuotiopaikat ja grillit",
    singular: "nuotiopaikka tai grilli",
    heading: "Nuotiopaikat ja grillit",
  },
  "compressed-air": { plural: "paineilmapisteet", singular: "paineilmapiste", heading: "Paineilma" },
  benches: { plural: "penkit", singular: "penkki", heading: "Penkit" },
};

/**
 * Nouns and prose merged into one deck. Kept in two files because they are two
 * jobs: 78 short strings that decide how every heading reads, and 3,700 words
 * that sit behind a disclosure. A locale can arrive with the first and grow
 * the second, which is what Finnish just did.
 */
export const fiCategories: Record<string, Partial<CategoryCopy>> = Object.fromEntries(
  Object.entries(nouns).map(([slug, noun]) => [slug, { ...noun, ...fiProse[slug] }])
);
