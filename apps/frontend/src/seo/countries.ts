/**
 * The countries that get a hub page of their own, and what they are called.
 *
 * A country hub answers the query with no city in it. Finns search "vessat
 * kartalla" and "kierrätyspisteet kartalla"; Dutch search "drinkwaterkaart
 * nederland"; Germans "öffentliche toiletten schweden karte"; Italians "bagni
 * pubblici mappa". None of those name a town, and until now nothing on the
 * site answered them: every page was about one city, and the city index is a
 * list of every city everywhere rather than an answer about one country.
 *
 * These are also the queries where a directory beats a map pack outright.
 * There is no single business for Google to point at when somebody asks where
 * the drinking fountains in a whole country are.
 *
 * Nothing is listed here by hand. Which hubs exist is decided in pageMeta.ts
 * from the data — a country needs enough cities with a real page in that
 * category before there is anything to put on the page — and this file only
 * says what the country is called once it qualifies.
 */
import type { Locale } from "../copy";

/**
 * A country's name in one locale, in the two forms the templates place.
 *
 * The same shape and the same reasoning as `CityName` in cities.ts: the string
 * form is a language that leaves the name alone and spells the relation with a
 * preposition, the object form is for a language that inflects it. Finnish
 * says "Suomessa", not "in Suomi".
 *
 * The trap this avoids is the one French and Italian would otherwise spring.
 * "en France" but "au Luxembourg" and "aux Pays-Bas"; "in Italia" but "nei
 * Paesi Bassi". A preposition stored in the deck and glued to a bare country
 * name is wrong for a third of Europe, so a locale that has that problem gives
 * the whole phrase here instead.
 */
export type CountryName = string | { name: string; inCountry: string };

/**
 * The names, keyed by ISO 3166-1 alpha-2.
 *
 * Only the locales that can actually produce a hub for that country need an
 * entry, which is a much smaller set than it looks: a hub needs three cities
 * with a page, so a locale's list is its own home countries and nothing else.
 * The English name is `City.country` and is not repeated here.
 *
 * `inCountry` is only written where it differs from a preposition the deck can
 * hold. German, Italian and Spanish all take a plain "in"/"en" in front of
 * these particular names, so they give the string form; French and Finnish do
 * not, so they give both.
 */
export const COUNTRY_NAMES: Partial<Record<string, Partial<Record<Locale, CountryName>>>> = {
  FI: { fi: { name: "Suomi", inCountry: "Suomessa" } },
  DE: { de: "Deutschland", fr: { name: "Allemagne", inCountry: "en Allemagne" }, it: "Germania", es: "Alemania" },
  AT: { de: "Österreich", fr: { name: "Autriche", inCountry: "en Autriche" }, it: "Austria", es: "Austria" },
  CH: { de: "Schweiz", fr: { name: "Suisse", inCountry: "en Suisse" }, it: "Svizzera", es: "Suiza" },
  FR: { fr: { name: "France", inCountry: "en France" }, de: "Frankreich", it: "Francia", es: "Francia" },
  BE: { fr: { name: "Belgique", inCountry: "en Belgique" }, de: "Belgien", it: "Belgio", es: "Bélgica" },
  LU: { fr: { name: "Luxembourg", inCountry: "au Luxembourg" }, de: "Luxemburg", it: "Lussemburgo", es: "Luxemburgo" },
  IT: { it: "Italia", de: "Italien", fr: { name: "Italie", inCountry: "en Italie" }, es: "Italia" },
  ES: { es: "España", de: "Spanien", fr: { name: "Espagne", inCountry: "en Espagne" }, it: "Spagna" },
  // The two whose name takes an article in every language here, which is why
  // they carry the object form even in the locales that otherwise get by
  // with a bare "in": "in den Niederlanden", "nei Paesi Bassi", "en los
  // Países Bajos". Neither qualifies for a hub today; both would be wrong the
  // day a third Dutch or British city lands, and that is exactly the kind of
  // bug nobody goes looking for.
  NL: {
    de: { name: "Niederlande", inCountry: "in den Niederlanden" },
    fr: { name: "Pays-Bas", inCountry: "aux Pays-Bas" },
    it: { name: "Paesi Bassi", inCountry: "nei Paesi Bassi" },
    es: { name: "Países Bajos", inCountry: "en los Países Bajos" },
  },
  GB: {
    de: { name: "Vereinigtes Königreich", inCountry: "im Vereinigten Königreich" },
    fr: { name: "Royaume-Uni", inCountry: "au Royaume-Uni" },
    it: { name: "Regno Unito", inCountry: "nel Regno Unito" },
    es: { name: "Reino Unido", inCountry: "en el Reino Unido" },
  },
  MX: { es: "México" },
  AR: { es: "Argentina" },
  CL: { es: "Chile" },
};

/**
 * The URL segment of a country, derived from its English name rather than
 * stored.
 *
 * Derived because a slug that can drift from the name it came from is a slug
 * that will: the country is written once in cities.ts and this is the only
 * place that turns it into a path. Accents fold rather than being dropped, so
 * a future "Côte d'Ivoire" becomes "cote-divoire" and not "cte-divoire".
 */
export function countrySlug(country: string): string {
  return country
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The country's name in a locale, falling back to the English form */
export function countryName(
  countryCode: string,
  english: string,
  locale: Locale
): string {
  const entry = COUNTRY_NAMES[countryCode]?.[locale];
  if (!entry) return english;
  return typeof entry === "string" ? entry : entry.name;
}

/**
 * The country in the form that means "in this country".
 *
 * Falls back to the plain name, which is what a template in a language without
 * the problem wants: its deck spells the relation itself and never asks for
 * this. See CountryName.
 */
export function countryIn(
  countryCode: string,
  english: string,
  locale: Locale
): string {
  const entry = COUNTRY_NAMES[countryCode]?.[locale];
  if (!entry) return english;
  return typeof entry === "string" ? entry : entry.inCountry;
}
