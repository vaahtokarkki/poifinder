/**
 * The German deck: app chrome only.
 *
 * Same shape and same reasoning as the Finnish one — no `categories`, so the
 * pages keep their English copy and fall back key by key. German is the first
 * locale that is expected to grow a `categories` deck, because it is the one
 * with the search demand behind it: twelve cities in the list are German
 * speaking and OpenStreetMap coverage there is the densest anywhere.
 *
 * The compound nouns here are the layout stress test. "Kategorien auswählen"
 * and "Karten­werkzeuge ausblenden" are roughly half again the width of their
 * English originals, which is what a control row has to survive before five
 * more languages are added to it.
 *
 * Written to be reviewed by a native speaker before this ships. The register
 * is deliberately the informal "du" throughout, which is what a consumer map
 * app uses in German and what the English copy's tone corresponds to.
 */
import type { LocaleDeck } from "./types";

const ui: NonNullable<LocaleDeck["ui"]> = {
  categoryNames: {
    toilets: "Toiletten",
    "drinking-water": "Trinkwasser",
    playgrounds: "Spielplätze",
    parking: "Parken",
    "charging-stations": "Ladesäulen",
    "gas-stations": "Tankstellen",
    "ice-cream": "Eisdielen",
    "dog-parks": "Hundewiese",
    "picnic-spots": "Picknickplätze",
    viewpoints: "Aussichtspunkte",
    beaches: "Strand & Baden",
    atms: "Geldautomat",
    "post-boxes": "Briefkästen",
    recycling: "Recycling",
    "luggage-storage": "Gepäckaufbewahrung",
    libraries: "Bibliotheken",
    "outdoor-gyms": "Outdoor-Fitness",
    "camp-sites": "Campingplätze",
    shelters: "Schutzhütten",
    "rest-areas": "Rastplätze",
    "dump-stations": "Entsorgungsstationen",
    "post-offices": "Postfilialen",
    showers: "Duschen",
    fireplaces: "Feuerstellen & Grill",
    "compressed-air": "Druckluft",
    benches: "Bänke",
  },

  groups: {
    essentials: "Grundlagen",
    car: "Auto",
    food: "Essen",
    nature: "Natur",
  },

  presets: {
    family: "Familie",
    "road-trip": "Autoreise",
    camping: "Camping",
    "van-life": "Vanlife",
    outdoors: "Draußen",
    "dog-walk": "Gassi gehen",
    errands: "Besorgungen",
  },

  sheet: {
    summary:
      "Wayside zeigt die kleinen Dinge, die unterwegs schwer zu finden sind: Toiletten, Spielplätze, Trinkwasser, Parkplätze und mehr. Wähle eine fertige Zusammenstellung oder eigene Kategorien und durchsuche jeden Bereich der Karte.",
    howItWorksHeading: "So funktioniert es",
    steps: [
      {
        title: "Wähle, was du brauchst",
        text: "Nimm eine fertige Zusammenstellung wie Familie oder Autoreise, oder wähle die Kategorien selbst.",
      },
      {
        title: "Bewege die Karte",
        text: "Verschiebe oder zoome beliebig, und die Punkte des neuen Ausschnitts laden von selbst, sobald die Karte zur Ruhe kommt.",
      },
      {
        title: "Öffne einen Punkt",
        text: "Tippe auf eine Markierung für Details, Öffnungszeiten sofern bekannt, und die Route dorthin.",
      },
    ],
    presetsHeading: "Zusammenstellungen",
    presetsNote: "Nicht das Richtige dabei? Im Auswahlmenü gibt es jede Kategorie einzeln.",
    goodToKnowHeading: "Gut zu wissen",
    tips: [
      "Suche mit der Suchschaltfläche nach einer Stadt oder einer Adresse.",
      "Folge einer Route: Setze Start und Ziel, um die Punkte entlang des Wegs zu sehen.",
      "Teile den aktuellen Ausschnitt samt Kategorien mit der Teilen-Schaltfläche.",
    ],
    creditsSourceBefore: "Die Punkte stammen von den Mitwirkenden von",
    creditsSourceLink: "OpenStreetMap",
    creditsSourceAfter: ". Fehlt etwas? Trage es dort ein, dann erscheint es auch hier.",
    creditsCodeBefore: "Wayside ist quelloffen:",
    creditsCodeLink: "der Code liegt auf GitHub",
    creditsCodeAfter: ".",
  },

  // English on purpose, as in the Finnish deck: these render on the
  // prerendered pages, whose paragraphs have no German behind them yet. This
  // section is what a `categories` deck would arrive alongside
  page: {
    homeTitle: "Find the small things, anywhere",
    browseCitiesBefore: "Browse",
    browseCitiesAfter: "with a page of their own",
    citiesTitle: "Cities on Wayside",
    cityUnit: { one: "city", other: "cities" },
    countryUnit: { one: "country", other: "countries" },
    citiesSummaryAfter:
      "have a page of their own, listing what is mapped there: public toilets, drinking water, playgrounds and 17 more categories. Everywhere else still works on the map, it just has no page yet.",
    cityTitle: "Points of interest in {city}",
    cityCategoriesHeading: "Categories in {city}",
    categoryUnit: { one: "category", other: "categories" },
    citySummaryAfter:
      "These are the small fixtures that are hard to look up anywhere else. Pick one to see it on the map.",
    mapped: "mapped",
    namedHeading: "Named",
    individualHeading: "Individual",
    showingSome: "Showing {listed} of the {total} the data can tell apart.",
    mapHasAll: "The map has all {count}",
    includingUnplaced:
      ", including the {unlisted} that carry neither a name nor a building or park to place them in.",
    questionsHeading: "Questions",
    allPointsIn: "All points of interest in {city}",
    allCities: "All cities on Wayside",
    nearbyCities: "Nearby cities",
    sheetFreshnessBefore: "Counts and names above are from the extract of",
    sheetFreshnessAfter: ". The map itself is live.",
    pageFreshnessBefore: "Points come from",
    pageFreshnessLink: "OpenStreetMap",
    pageFreshnessMiddle: "contributors, last refreshed",
    pageFreshnessAfter:
      ". Something missing? Add it there and it shows up here on the next refresh.",
  },

  poi: {
    stepFree: "Barrierefrei",
    partlyStepFree: "Teilweise barrierefrei",
    free: "Kostenlos",
    fee: "Gebührenpflichtig",
    unnamedPlace: "Unbenannter Ort",
    noExtraDetails: "{name} — keine weiteren Angaben",
    address: "Adresse",
    fromBuilding: "Aus diesem Gebäude",
    lastChecked: "Zuletzt geprüft",
    lastEdited: "Zuletzt bearbeitet",
    hours: {
      Mo: "Mo", Tu: "Di", We: "Mi", Th: "Do", Fr: "Fr", Sa: "Sa", Su: "So",
      PH: "an Feiertagen", SH: "in den Schulferien", closed: "geschlossen",
    },
    age: {
      withinMonth: "im letzten Monat",
      months: { one: "vor einem Monat", other: "vor {count} Monaten" },
      years: { one: "vor einem Jahr", other: "vor {count} Jahren" },
    },
    keyLabels: {
      changing_table: "Wickeltisch",
      "toilets:disposal": "Toilettentyp",
      "ramp:wheelchair": "Rollstuhlrampe",
      building_levels: "Etagen",
      "building:levels": "Etagen",
      collection_times: "Leerung",
      "socket:type2": "Typ-2-Anschlüsse",
      "socket:type2_combo": "CCS-Anschlüsse",
      "socket:chademo": "CHAdeMO-Anschlüsse",
      "socket:schuko": "Schuko-Steckdosen",
      backrest: "Rückenlehne",
      wikipedia: "Wikipedia",
      wikidata: "Wikidata",
    },
    inThisBuilding: "In diesem Gebäude",
    inBuilding: "In {building}",
    buildingLastChecked: "Gebäude zuletzt geprüft",
    buildingLastEdited: "Gebäude zuletzt bearbeitet",
  },

  translate: {
    action: "Übersetzen",
    pending: "Übersetzen…",
    showOriginal: "Original anzeigen",
    showTranslation: "Übersetzung anzeigen",
    sameLanguage: "Bereits auf Englisch",
    quota: "Tageslimit für Übersetzungen erreicht",
    failed: "Übersetzung nicht verfügbar",
  },

  controls: {
    about: "Über diese App",
    closeSearch: "Suche schließen",
    selectCategories: "Kategorien für die Karte auswählen",
    zoomInHint: "Heranzoomen, um neue Punkte zu laden",
    routeStart: "Dein Standort",
    routeEnd: "Ziel",
    chooseCategories: "Kategorien wählen",
    clearAll: "Auswahl zurücksetzen",
    presetTitle: "Punkte auf der Karte zeigen: {preset}",
    showMapTools: "Kartenwerkzeuge einblenden",
    hideMapTools: "Kartenwerkzeuge ausblenden",
    myLocation: "Karte auf deinen Standort zentrieren",
    share: "Diesen Ausschnitt teilen",
    toggleSearch: "Suchleiste ein- oder ausblenden",
    directions: "Route",
    language: "Sprache",
    searchPlaceholder: "Ort suchen",
    routeHeading: "Punkte entlang der Route suchen",
    routeSubmit: "Route suchen",
    routeReset: "Route zurücksetzen",
    routeActive: "Punkte entlang der Route von {start} nach {end}",
    routeYourLocation: "deinem Standort",
    typeLocation: "Ort eingeben",
    dragDownToClose: "Zum Schließen nach unten ziehen",
    dragUpForMore: "Für mehr nach oben ziehen",
  },

  notices: {
    fetchFailed:
      "Die Punkte konnten nicht von der Overpass-API geladen werden. Bitte versuche es erneut.",
    linkCopied: "Link in die Zwischenablage kopiert",
    copyFailed: "Der Link konnte nicht in die Zwischenablage kopiert werden.",
    shareRouteMissing: "Start- oder Zielkoordinaten konnten nicht ermittelt werden.",
    routeFailed: "Route konnte nicht geladen werden: ",
    fallbackTitle: "Interessante Orte",
    fallbackSubtitle: "Finde die nützlichen Orte in deiner Nähe",
  },
};

export const de: LocaleDeck = { ui };

export default de;
