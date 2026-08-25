/**
 * The Finnish deck: app chrome only.
 *
 * No `categories`, so every page keeps its English copy and falls back key by
 * key. That is deliberate and is the shape most locales will arrive in — the
 * chrome is ~500 words and helps in all 148 cities, the page copy is ~3,800
 * and only earns its keep where the search demand is in that language.
 *
 * Finnish is here as much to stress the machinery as to serve Finnish readers.
 * It is the language in this project that breaks a naive `{city}` placeholder:
 * "in Helsinki" is "Helsingissä", an inflected form of the name rather than a
 * preposition in front of it. Nothing in `ui` interpolates a city today, and
 * `page.cityTitle` and `page.allPointsIn` are the two that would — they are
 * left in English here rather than written as something a Finnish speaker
 * would not say. When a Finnish `categories` deck is written, that is the
 * problem to solve first, and it will need case forms on the city rather than
 * a second copy of the sentence.
 */
import type { LocaleDeck } from "./types";

const ui: NonNullable<LocaleDeck["ui"]> = {
  categoryNames: {
    toilets: "Vessat",
    "drinking-water": "Juomavesi",
    playgrounds: "Leikkipuistot",
    parking: "Pysäköinti",
    "charging-stations": "Latauspisteet",
    "gas-stations": "Huoltoasemat",
    "ice-cream": "Jäätelö",
    "dog-parks": "Koirapuisto",
    "picnic-spots": "Eväspaikat",
    viewpoints: "Näköalapaikat",
    beaches: "Rannat ja uinti",
    atms: "Pankkiautomaatti",
    "post-boxes": "Postilaatikot",
    recycling: "Kierrätys",
    "luggage-storage": "Matkatavarasäilytys",
    libraries: "Kirjastot",
    "outdoor-gyms": "Ulkokuntosalit",
    "camp-sites": "Leirintäalueet",
    shelters: "Laavut ja majat",
    "rest-areas": "Levähdysalueet",
    "dump-stations": "Jätevesipisteet",
    "post-offices": "Postit",
    showers: "Suihkut",
    fireplaces: "Nuotiopaikat",
    "compressed-air": "Paineilma",
    benches: "Penkit",
  },

  groups: {
    essentials: "Perusasiat",
    car: "Auto",
    food: "Ruoka",
    nature: "Luonto",
  },

  presets: {
    family: "Perhe",
    "road-trip": "Automatka",
    camping: "Retkeily",
    "van-life": "Matkailuauto",
    outdoors: "Ulkoilu",
    "dog-walk": "Koiralenkki",
    errands: "Asiointi",
  },

  sheet: {
    summary:
      "Wayside kartoittaa ne pienet asiat, joita on vaikea löytää liikkeellä ollessa: vessat, leikkipuistot, juomavesipisteet, pysäköinti ja muut. Valitse valmis kokoelma tai omat kategoriasi, ja hae mistä tahansa kartan kohdasta.",
    howItWorksHeading: "Näin se toimii",
    steps: [
      {
        title: "Valitse mitä tarvitset",
        text: "Käytä valmista kokoelmaa kuten Perhe tai Automatka, tai valitse kategoriat itse.",
      },
      {
        title: "Liikuta karttaa",
        text: "Siirrä tai zoomaa minne tahansa, ja uuden näkymän pisteet latautuvat itsestään heti kun kartta pysähtyy.",
      },
      {
        title: "Avaa piste",
        text: "Napauta merkkiä nähdäksesi tiedot, aukioloajat kun ne tiedetään, ja reittiohjeet.",
      },
    ],
    presetsHeading: "Kokoelmat",
    presetsNote: "Eikö sopivaa löytynyt? Valitsimesta saa jokaisen kategorian erikseen.",
    goodToKnowHeading: "Hyvä tietää",
    tips: [
      "Hae kaupunkia tai osoitetta hakupainikkeella.",
      "Seuraa reittiä: aseta lähtö- ja määränpää nähdäksesi matkan varrella olevat pisteet.",
      "Jaa nykyinen näkymä kategorioineen jakopainikkeella.",
    ],
    creditsSourceBefore: "Pisteet ovat",
    creditsSourceLink: "OpenStreetMapin",
    creditsSourceAfter: "tekijöiltä. Puuttuuko jokin? Lisää se sinne, niin se näkyy täällä.",
    creditsCodeBefore: "Wayside on avointa lähdekoodia:",
    creditsCodeLink: "koodi on GitHubissa",
    creditsCodeAfter: ".",
  },

  // Left in English on purpose: these render on the prerendered pages, whose
  // copy has no Finnish deck behind it. Translating the frame around English
  // paragraphs would make one page read in two languages
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
    stepFree: "Esteetön",
    partlyStepFree: "Osittain esteetön",
    free: "Maksuton",
    fee: "Maksullinen",
    unnamedPlace: "Nimetön paikka",
    noExtraDetails: "{name} — ei lisätietoja",
    address: "Osoite",
    fromBuilding: "Tästä rakennuksesta",
    lastChecked: "Tarkistettu viimeksi",
    lastEdited: "Muokattu viimeksi",
    hours: {
      Mo: "ma", Tu: "ti", We: "ke", Th: "to", Fr: "pe", Sa: "la", Su: "su",
      PH: "pyhäpäivinä", SH: "koulujen lomilla", closed: "suljettu",
    },
    age: {
      withinMonth: "viimeisen kuukauden aikana",
      months: { one: "kuukausi sitten", other: "{count} kuukautta sitten" },
      years: { one: "vuosi sitten", other: "{count} vuotta sitten" },
    },
    keyLabels: {
      changing_table: "HoitopÃ¶ytÃ¤",
      "toilets:disposal": "Vessatyyppi",
      "ramp:wheelchair": "PyÃ¶rÃ¤tuoliramppi",
      building_levels: "Kerroksia",
      "building:levels": "Kerroksia",
      collection_times: "Tyhjennys",
      "socket:type2": "Type 2 -liittimet",
      "socket:type2_combo": "CCS-liittimet",
      "socket:chademo": "CHAdeMO-liittimet",
      "socket:schuko": "Schuko-pistorasiat",
      backrest: "SelkÃ¤noja",
      wikipedia: "Wikipedia",
      wikidata: "Wikidata",
    },
    inThisBuilding: "TÃ¤ssÃ¤ rakennuksessa",
    inBuilding: "Rakennuksessa {building}",
    buildingLastChecked: "Rakennus tarkistettu viimeksi",
    buildingLastEdited: "Rakennusta muokattu viimeksi",
  },

  translate: {
    action: "Käännä",
    pending: "Käännetään…",
    showOriginal: "Näytä alkuperäinen",
    showTranslation: "Näytä käännös",
    sameLanguage: "Jo englanniksi",
    quota: "Päivän käännösraja täynnä",
    failed: "Käännös ei onnistunut",
  },

  controls: {
    about: "Tietoa sovelluksesta",
    closeSearch: "Sulje haku",
    selectCategories: "Valitse kartalla näytettävät kategoriat",
    zoomInHint: "Lähennä ladataksesi uusia pisteitä",
    routeStart: "Sijaintisi",
    routeEnd: "Määränpää",
    chooseCategories: "Valitse kategoriat",
    clearAll: "Tyhjennä valinnat",
    presetTitle: "Näytä kartalla: {preset}",
    showMapTools: "Näytä karttatyökalut",
    hideMapTools: "Piilota karttatyökalut",
    myLocation: "Keskitä kartta sijaintiisi",
    share: "Jaa tämä näkymä",
    toggleSearch: "Näytä tai piilota hakupalkki",
    directions: "Reittiohjeet",
    language: "Kieli",
    searchPlaceholder: "Hae sijaintia",
    routeHeading: "Hae pisteitä reitin varrelta",
    routeSubmit: "Hae reitti",
    routeReset: "Tyhjennä reitti",
    routeActive: "Näytetään pisteet reitiltä {start} – {end}",
    routeYourLocation: "sijaintisi",
    typeLocation: "Kirjoita sijainti",
    dragDownToClose: "Vedä alas sulkeaksesi",
    dragUpForMore: "Vedä ylös nähdäksesi lisää",
  },

  notices: {
    fetchFailed: "Pisteiden haku Overpass-rajapinnasta epäonnistui. Yritä uudelleen.",
    linkCopied: "Linkki kopioitu leikepöydälle",
    copyFailed: "Linkin kopiointi leikepöydälle ei onnistunut.",
    shareRouteMissing: "Lähtö- tai määränpään koordinaatteja ei saatu.",
    routeFailed: "Reitin haku epäonnistui: ",
    fallbackTitle: "Kohteet",
    fallbackSubtitle: "Löydä hyödylliset paikat ympäriltäsi",
  },
};

export const fi: LocaleDeck = { ui };

export default fi;
