/**
 * The Finnish deck: app chrome only.
 *
 * The chrome. The category nouns are in fi.categories.ts and the prose in
 * fi.prose.ts, split because they were written at different times and are
 * reviewed as different jobs.
 *
 * Finnish has a URL tree now — /fi/helsinki/toilets and the other three
 * Finnish cities — which is why the prose had to exist: an indexed page that
 * declares lang="fi" and then reads English is a page whose markup contradicts
 * itself, and hreflang would be asserting it as the Finnish alternate.
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
import { fiCategories } from "./fi.categories";
import { fiCommonFaq } from "./fi.prose";
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
    "bicycle-repair": "Pyöränhuolto",
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

  /**
   * Finnish, now that City carries case forms.
   *
   * This section was English while `{city}` could only produce "Helsinki", and
   * Finnish does not say "in Helsinki" — it says "Helsingissä", putting the
   * relation on the noun rather than in a preposition. Templates that mean
   * "in this city" therefore ask for `{cityIn}` and the deck gets the
   * inflected form; templates that name a city on its own still ask for
   * `{city}`. See CityName in seo/cities.ts.
   *
   * The categories deck is still English, so a category page reads Finnish
   * around English paragraphs until that is written.
   */
  page: {
    homeTitle: "Löydä pienet asiat, missä tahansa",
    browseCitiesBefore: "Selaa",
    browseCitiesAfter: "joilla on oma sivunsa",
    citiesTitle: "Kaupungit Waysidessa",
    cityUnit: { one: "kaupunki", other: "kaupunkia" },
    countryUnit: { one: "maassa", other: "maassa" },
    citiesSummaryAfter:
      "on oma sivunsa, jolla näkyy mitä alueelta on kartoitettu: yleiset käymälät, juomavesipisteet, leikkipuistot ja 17 muuta kategoriaa. Muualla kartta toimii aivan samoin, sivua siitä ei vain vielä ole.",
    cityTitle: "Kohteet {cityIn}",
    cityCategoriesHeading: "Kategoriat {cityIn}",
    categoryUnit: { one: "kategoria", other: "kategoriaa" },
    citySummaryAfter:
      "Nämä ovat niitä pieniä asioita, joita on vaikea etsiä mistään muualta. Valitse yksi nähdäksesi sen kartalla.",
    mapped: "kartoitettu",
    namedHeading: "Nimetyt",
    individualHeading: "Yksittäiset",
    showingSome: "Näytetään {listed} / {total} erotettavissa olevasta.",
    mapHasAll: "Kartalla ovat kaikki {count}",
    includingUnplaced:
      ", mukaan lukien ne {unlisted}, joilla ei ole nimeä eikä rakennusta tai puistoa, joka sijoittaisi ne.",
    questionsHeading: "Kysymykset",
    allPointsIn: "Kaikki kohteet {cityIn}",
    allCities: "Kaikki kaupungit Waysidessa",
    nearbyCities: "Lähikaupungit",
    viewInThisLanguage: "Tämä sivu suomeksi",
    categoryTitle: "{noun} {cityIn} — {count} kartalla | {site}",
    categoryDescription:
      "{noun} {cityIn}: {count} kartalla, aukioloaikoineen, maksuineen ja esteettömyystietoineen sikäli kuin OpenStreetMap ne tuntee. Maksuton, ilman kirjautumista, toimii puhelimella.",
    categoryHeading: "{noun} {cityIn}",
    moreInCity: "Lisää {cityIn}",
    nearbyHeading: "{noun} lähistöllä",
    cityDisclosure: "Kategoriat ja lähikaupungit {cityIn}",
    categoryDisclosure: "{noun} {cityIn} listana",
    listHeading: "{qualifier} {noun} {cityIn}",
    citySummary: "{cityIn} on kartoitettu {count} kohdetta {categories} kategoriassa.",
    cityFallbackTitle: "Kohteet {cityIn} | {site}",
    cityDescription: "{count} kartoitettua kohdetta {cityIn}: {named}{more}, yhdellä kartalla OpenStreetMapin pohjalta. Ne pienet asiat, joita on vaikea etsiä mistään muualta.",
    cityDescriptionMore: " ja {rest} muuta kategoriaa",
    sheetFreshnessBefore: "Yllä olevat määrät ja nimet ovat poiminnasta",
    sheetFreshnessAfter: ". Kartta itsessään on live.",
    pageFreshnessBefore: "Pisteet ovat",
    pageFreshnessLink: "OpenStreetMapin",
    pageFreshnessMiddle: "tekijöiltä, päivitetty viimeksi",
    pageFreshnessAfter:
      ". Puuttuuko jokin? Lisää se sinne, niin se näkyy täällä seuraavan päivityksen jälkeen.",
  },

  poi: {
    stepFree: "Esteetön",
    partlyStepFree: "Osittain esteetön",
    free: "Maksuton",
    fee: "Maksullinen",
    unnamedPlace: "Nimetön paikka",
    inPlace: "{noun}, {place}",
    // The same comma form as inPlace. Finnish would need the street name in the
    // adessive to say "on", and a comma places the point without inflecting it
    onStreet: "{noun}, {street}",
    noExtraDetails: "{name} — ei lisätietoja",
    address: "Osoite",
    fromBuilding: "Tästä rakennuksesta",
    lastChecked: "Tarkistettu viimeksi",
    lastEdited: "Muokattu viimeksi",
    editInOsm: "Muokkaa pistettä OpenStreetMapissa",
    noise: {
      label: "Liikennemelu",
      quiet: "Hiljainen",
      moderate: "Kohtalainen",
      noisy: "Meluisa",
      modelled: "Mallinnettu OpenStreetMapin tiestöstä, ei mitattu",
      about: "Miten tämä toimii",
      aboutTitle: "Mallinnettu liikennemelu",
      aboutIntro:
        "Tämä on arvio, ei mittaus. Se lasketaan pisteen ympärillä olevista teistä ja rautateistä OpenStreetMapissa: millainen tie on, kuinka kovaa siellä ajetaan, montako kaistaa siinä on ja kuinka kaukana se on. Tunneleissa kulkevat tiet jätetään pois.",
      aboutBandsHeading: "Kolme tasoa",
      aboutQuiet:
        "Hiljainen — alle 55 dB. Asuinkatu: keskustelu sujuu vaivatta.",
      aboutModerate:
        "Kohtalainen — 55–65 dB. Vilkas katu lähellä: liikenne kuuluu selvästi.",
      aboutNoisy:
        "Meluisa — yli 65 dB. Pääkadun varrella: ääntä pitää korottaa.",
      aboutLimit:
        "OpenStreetMapissa ei ole tietoa siitä, kuinka paljon liikennettä tiellä todella kulkee. Siksi näytetään vain kolme karkeaa tasoa eikä lukua. Arvio käsittelee lisäksi jokaisen tien erikseen, joten siellä missä useampi vilkas tie kohtaa, se jää ennemmin alakanttiin: hiljaiseksi merkitty paikka voi olla meluisampi kuin miltä näyttää.",
      aboutSource: "Tiet ja rautatiet OpenStreetMapin tekijöiltä.",
      aboutClose: "Sulje",
    },
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
      changing_table: "Hoitopöytä",
      "toilets:disposal": "Vessatyyppi",
      "ramp:wheelchair": "Pyörätuoliramppi",
      building_levels: "Kerroksia",
      "building:levels": "Kerroksia",
      collection_times: "Tyhjennys",
      "socket:type2": "Type 2 -liittimet",
      "socket:type2_combo": "CCS-liittimet",
      "socket:chademo": "CHAdeMO-liittimet",
      "socket:schuko": "Schuko-pistorasiat",
      backrest: "Selkänoja",
      wikipedia: "Wikipedia",
      wikidata: "Wikidata",
    },
    values: {
      yes: "Kyllä",
      no: "Ei",
      limited: "Rajoitettu",
      designated: "Varattu tähän",
      customers: "Vain asiakkaille",
      permissive: "Avoin yleisölle",
      private: "Yksityinen",
      unknown: "Ei tiedossa",
      public: "Julkinen",
      only: "Vain",
      seasonal: "Kausiluonteinen",
      permanent: "Ympärivuotinen",
      free: "Maksuton",
      none: "Ei mitään",
    },
    inThisBuilding: "Tässä rakennuksessa",
    inBuilding: "Rakennuksessa {building}",
    buildingLastChecked: "Rakennus tarkistettu viimeksi",
    buildingLastEdited: "Rakennusta muokattu viimeksi",
    editBuildingInOsm: "Muokkaa rakennusta OpenStreetMapissa",
  },

  translate: {
    action: "Käännä",
    pending: "Käännetään…",
    showOriginal: "Näytä alkuperäinen",
    showTranslation: "Näytä käännös",
    sameLanguage: "Jo suomeksi",
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
    layers: {
      open: "Kartan tasot",
      title: "Kartan tasot",
      close: "Sulje",
      mapType: "Kartan tyyppi",
      basemapDefault: "Oletus",
      mapDetails: "Kartan tiedot",
      trafficNoise: "Liikennemelu",
    },
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
    loading: "Ladataan…",
    loadingServer: "{server}/{total}",
    loadingFallback: "Oma palvelimemme ei vastaa, joten haku kiertää julkisten kautta",
    gpsWaiting: "Odotetaan GPS-paikannusta…",
    gpsWaitingHint: "Haetaan satelliittipaikannusta. Piste muuttuu siniseksi, kun laite tietää sijaintinsa",
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

export const fi: LocaleDeck = { categories: fiCategories, commonFaq: fiCommonFaq, ui };

export default fi;
