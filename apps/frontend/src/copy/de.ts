/**
 * The German deck: app chrome only.
 *
 * The chrome half. The page copy is in de.categories.ts, which German has and
 * Finnish does not: German is the locale with the search demand behind it —
 * twelve cities in the list are German speaking and OpenStreetMap coverage
 * there is the densest anywhere — so it is the first to be worth 3,800 words.
 *
 * Having `categories` does not by itself put German pages on the site. That
 * needs URL trees, localized city names and per-locale slugs, none of which
 * exist yet; until they do this deck serves the in-place swap and nothing is
 * indexed in German.
 *
 * The compound nouns here are the layout stress test. "Kategorien auswählen"
 * and "Karten­werkzeuge ausblenden" are roughly half again the width of their
 * English originals, which is what a control row has to survive before five
 * more languages are added to it.
 *
 * RULE FOR THIS DECK, learned twice the hard way: `{noun}` and `{plural}` hold
 * the bare nominative — "öffentliche Toiletten" — so they may only be placed
 * where German takes that form. A slot behind a determiner or a preposition
 * inflects the adjective and the stored form is then wrong: "Liste der
 * öffentliche Toiletten" wants genitive -en, "zu öffentliche Toiletten" wants
 * dative. Both were written here and both had to be reworded. Put the noun in
 * a bare slot instead of adding case forms to the deck.
 *
 * NOT YET REVIEWED BY A NATIVE SPEAKER, and it should not ship without one.
 * The register is deliberately the informal "du" throughout, which is what a
 * consumer map app uses in German and what the English copy's tone
 * corresponds to. See the list of open questions in the handover notes.
 */
import { deCategories, deCommonFaq } from "./de.categories";
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
    creditsSourceBefore: "Die Punkte stammen von",
    creditsSourceLink: "OpenStreetMap",
    creditsSourceAfter: "und Mitwirkenden. Fehlt etwas? Trage es dort ein, dann erscheint es auch hier.",
    creditsCodeBefore: "Wayside ist quelloffen:",
    creditsCodeLink: "der Code liegt auf GitHub",
    creditsCodeAfter: ".",
  },

  /**
   * German throughout, because German pages exist now. This section was left
   * in English while the /de/ tree did not: translating the frame around
   * English paragraphs would have made one page read in two languages. With
   * de.categories.ts written, the paragraphs are German and the frame has to
   * match — a German intro under an English "Questions" heading is the same
   * fault the other way round.
   */
  page: {
    homeTitle: "Finde die kleinen Dinge, überall",
    browseCitiesBefore: "Durchsuche",
    browseCitiesAfter: "mit einer eigenen Seite",
    citiesTitle: "Städte auf Wayside",
    cityUnit: { one: "Stadt", other: "Städte" },
    countryUnit: { one: "Land", other: "Ländern" },
    citiesSummaryAfter:
      "haben eine eigene Seite, auf der steht, was dort verzeichnet ist: öffentliche Toiletten, Trinkwasser, Spielplätze und 17 weitere Kategorien. Überall sonst funktioniert die Karte genauso, es gibt nur noch keine Seite dazu.",
    cityTitle: "Interessante Orte in {city}",
    cityCategoriesHeading: "Kategorien in {city}",
    categoryUnit: { one: "Kategorie", other: "Kategorien" },
    citySummaryAfter:
      "Das sind die kleinen Einrichtungen, die anderswo kaum nachzuschlagen sind. Wähle eine aus, um sie auf der Karte zu sehen.",
    mapped: "verzeichnet",
    namedHeading: "Benannte",
    individualHeading: "Einzelne",
    showingSome: "{listed} von {total} unterscheidbaren werden gezeigt.",
    mapHasAll: "Auf der Karte stehen alle {count}",
    includingUnplaced:
      ", darunter die {unlisted}, die weder einen Namen tragen noch in einem Gebäude oder Park liegen, der sie einordnet.",
    questionsHeading: "Fragen",
    allPointsIn: "Alle interessanten Orte in {city}",
    allCities: "Alle Städte auf Wayside",
    nearbyCities: "Städte in der Nähe",
    viewInThisLanguage: "Diese Seite auf Deutsch",
    categoryTitle: "{noun} in {city} — {count} auf der Karte | {site}",
    categoryDescription:
      "{count} {noun} in {city} auf einer Karte, mit Öffnungszeiten, Gebühren und Barrierefreiheit, soweit OpenStreetMap sie kennt. Kostenlos, ohne Anmeldung, funktioniert auf dem Handy.",
    categoryHeading: "{noun} in {city}",
    moreInCity: "Mehr in {city}",
    nearbyHeading: "{noun} in der Nähe",
    cityDisclosure: "Kategorien und Städte in der Nähe von {city}",
    categoryDisclosure: "{noun} in {city} als Liste",
    listHeading: "{qualifier} {noun} in {city}",
    citySummary: "{count} verzeichnete Punkte in {categories} {unit} in {city}, {country}.",
    cityFallbackTitle: "Interessante Orte in {city} | {site}",
    cityDescription: "{count} verzeichnete Punkte in {city}: {named}{more}, auf einer Karte aus OpenStreetMap. Die kleinen Dinge, die anderswo kaum nachzuschlagen sind.",
    cityDescriptionMore: " und {rest} weitere Kategorien",
    sheetFreshnessBefore: "Anzahl und Namen oben stammen aus dem Auszug vom",
    sheetFreshnessAfter: ". Die Karte selbst ist live.",
    pageFreshnessBefore: "Die Punkte stammen von den Mitwirkenden von",
    pageFreshnessLink: "OpenStreetMap",
    pageFreshnessMiddle: "und wurden zuletzt aktualisiert am",
    pageFreshnessAfter:
      ". Fehlt etwas? Trage es dort ein, dann erscheint es beim nächsten Abgleich auch hier.",
  },

  poi: {
    stepFree: "Barrierefrei",
    partlyStepFree: "Teilweise barrierefrei",
    free: "Kostenlos",
    fee: "Gebührenpflichtig",
    unnamedPlace: "Unbenannter Ort",
    inPlace: "{noun} in {place}",
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
    values: {
      yes: "Ja",
      no: "Nein",
      limited: "Eingeschränkt",
      designated: "Ausgewiesen",
      customers: "Nur für Kunden",
      permissive: "Öffentlich zugänglich",
      private: "Privat",
      unknown: "Unbekannt",
      public: "Öffentlich",
      only: "Nur",
      seasonal: "Saisonal",
      permanent: "Ganzjährig",
      free: "Kostenlos",
      none: "Keine",
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
    sameLanguage: "Bereits auf Deutsch",
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

export const de: LocaleDeck = { categories: deCategories, commonFaq: deCommonFaq, ui };

export default de;
