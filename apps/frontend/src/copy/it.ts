/**
 * The Italian deck: app chrome plus nouns.
 *
 * Italian has the strongest traveller signal of any language measured. Ask for
 * "fontanelle acqua potabile" and autocomplete offers Berlino, Monaco di
 * Baviera, Vienna and Parigi before it reaches an Italian city; "bagni
 * pubblici mappa" offers Parigi, Tokyo, Londra, Amsterdam, Firenze and Roma.
 * The home tree is seven cities; the traveller tree is the reason this deck
 * was written first of the three.
 *
 * The page prose stays English underneath, the same field-by-field fallback
 * Finnish and French use.
 *
 * Italian does not inflect place names, so `{city}` is the bare form and the
 * relation lives in the preposition — "a Roma", "a Berlino". No template here
 * puts an article in front of a slot, which is what keeps "a" from having to
 * become "all'" or "alla" depending on the noun behind it.
 *
 * NOT YET REVIEWED BY A NATIVE SPEAKER.
 */
import { itCategories } from "./it.categories";
import type { LocaleDeck } from "./types";

const ui: NonNullable<LocaleDeck["ui"]> = {
  categoryNames: {
    toilets: "Bagni",
    "drinking-water": "Acqua potabile",
    playgrounds: "Parchi giochi",
    parking: "Parcheggi",
    "charging-stations": "Colonnine",
    "gas-stations": "Distributori",
    "ice-cream": "Gelaterie",
    "dog-parks": "Area cani",
    "picnic-spots": "Picnic",
    viewpoints: "Punti panoramici",
    beaches: "Spiagge",
    atms: "Bancomat",
    "post-boxes": "Cassette postali",
    recycling: "Riciclo",
    "luggage-storage": "Deposito bagagli",
    libraries: "Biblioteche",
    "outdoor-gyms": "Palestre all'aperto",
    "camp-sites": "Campeggi",
    shelters: "Ripari",
    "rest-areas": "Aree di sosta",
    "dump-stations": "Scarico camper",
    "post-offices": "Uffici postali",
    showers: "Docce",
    fireplaces: "Barbecue",
    "bicycle-repair": "Riparazione bici",
    benches: "Panchine",
  },

  groups: {
    essentials: "Essenziali",
    car: "Auto",
    food: "Cibo",
    nature: "Natura",
  },

  presets: {
    family: "Famiglia",
    "road-trip": "Viaggio in auto",
    camping: "Campeggio",
    "van-life": "Vanlife",
    outdoors: "All'aperto",
    "dog-walk": "Passeggiata col cane",
    errands: "Commissioni",
  },

  sheet: {
    summary:
      "Wayside mappa le piccole cose difficili da trovare quando sei in giro: bagni, parchi giochi, acqua potabile, parcheggi e altro. Scegli una selezione già pronta o le tue categorie, e cerca in qualsiasi punto della mappa.",
    howItWorksHeading: "Come funziona",
    steps: [
      {
        title: "Scegli cosa ti serve",
        text: "Usa una selezione già pronta come Famiglia o Viaggio in auto, oppure scegli tu le categorie.",
      },
      {
        title: "Sposta la mappa",
        text: "Trascina o ingrandisci dove vuoi: i punti della nuova inquadratura si caricano da soli appena la mappa si ferma.",
      },
      {
        title: "Apri un punto",
        text: "Tocca un indicatore per i dettagli, gli orari quando sono noti e le indicazioni stradali.",
      },
    ],
    presetsHeading: "Selezioni",
    presetsNote: "Non trovi quella giusta? Nel selettore c'è ogni categoria singolarmente.",
    goodToKnowHeading: "Da sapere",
    tips: [
      "Cerca una città o un indirizzo con il pulsante di ricerca.",
      "Segui un percorso: imposta partenza e arrivo per vedere i punti lungo la strada.",
      "Condividi l'inquadratura attuale con le sue categorie usando il pulsante di condivisione.",
    ],
    creditsSourceBefore: "I punti vengono da",
    creditsSourceLink: "OpenStreetMap",
    creditsSourceAfter:
      "e dai suoi contributori. Manca qualcosa? Aggiungilo là e comparirà anche qui.",
    creditsCodeBefore: "Wayside è open source:",
    creditsCodeLink: "il codice è su GitHub",
    creditsCodeAfter: ".",
  },

  page: {
    homeTitle: "Trova le piccole cose, ovunque",
    homeMetaTitle: "Wayside — bagni pubblici, acqua potabile e parchi giochi su una mappa",
    homeMetaDescription:
      "Trova i piccoli punti di interesse difficili da cercare altrove: bagni pubblici, " +
      "acqua potabile, parchi giochi, cassette postali e altre 16 categorie, in tutto il " +
      "mondo. Gratis, senza registrazione, basato su OpenStreetMap.",
    citiesMetaTitle: "Città su {site} — {count} mappe di città",
    citiesMetaDescription:
      "Ogni città con una mappa propria su {site}: {count} {cityUnit} in {countries} " +
      "{countryUnit}, ciascuna con bagni pubblici, acqua potabile, parchi giochi e altre 17 " +
      "categorie da OpenStreetMap. Gratis e senza registrazione.",
    browseCitiesBefore: "Sfoglia",
    browseCitiesAfter: "che hanno una pagina propria",
    citiesTitle: "Città su Wayside",
    cityUnit: { one: "città", other: "città" },
    countryUnit: { one: "paese", other: "paesi" },
    citiesSummaryIn: "in",
    citiesSummaryAfter:
      "hanno una pagina propria, con l'elenco di ciò che vi è mappato: bagni pubblici, acqua potabile, parchi giochi e altre 17 categorie. Altrove la mappa funziona lo stesso, semplicemente non c'è ancora una pagina.",
    cityTitle: "Punti di interesse a {city}",
    cityCategoriesHeading: "Categorie a {city}",
    categoryUnit: { one: "categoria", other: "categorie" },
    citySummaryAfter:
      "Sono le piccole strutture difficili da cercare altrove. Scegline una per vederla sulla mappa.",
    mapped: "mappati",
    namedHeading: "Con nome",
    individualHeading: "Singoli",
    showingSome: "{listed} di {total} che i dati riescono a distinguere.",
    mapHasAll: "La mappa li ha tutti e {count}",
    includingUnplaced:
      ", compresi i {unlisted} che non hanno né un nome né un edificio o un parco che li collochi.",
    questionsHeading: "Domande",
    allPointsIn: "Tutti i punti di interesse a {city}",
    allCities: "Tutte le città su Wayside",
    nearbyCities: "Città vicine",
    viewInThisLanguage: "Questa pagina in italiano",
    categoryTitle: "{noun} a {city} — {count} sulla mappa | {site}",
    categoryDescription:
      "{count} {noun} a {city} su un'unica mappa, con orari, tariffe e accessibilità dove OpenStreetMap li conosce. Gratis, senza registrazione, funziona sul telefono.",
    categoryHeading: "{noun} a {city}",
    countryTitle:
      "{noun} in {countryIn} sulla mappa — {count} in {cities} {cityUnit} | {site}",
    countryDescription:
      "{count} {noun} in {countryIn}, mappati in {cities} {cityUnit} e riuniti su un'unica mappa. Da OpenStreetMap. Gratis, senza registrazione, funziona sul telefono.",
    countryHeading: "{noun} in {countryIn}",
    countrySummary: "{count} punti mappati in {cities} {cityUnit} in {countryIn}.",
    countryCitiesHeading: "Città in {countryIn}",
    allInCountry: "{noun} in {countryIn}",
    moreInCity: "Altro a {city}",
    nearbyHeading: "{noun} nelle vicinanze",
    cityDisclosure: "Categorie e città vicine a {city}",
    categoryDisclosure: "Elenco di {noun} a {city}",
    listHeading: "{qualifier} {noun} a {city}",
    citySummary: "{count} punti mappati in {categories} {unit} a {city}, {country}.",
    cityFallbackTitle: "Punti di interesse a {city} | {site}",
    cityDescription:
      "{count} punti mappati a {city}: {named}{more}, su una mappa costruita da OpenStreetMap. Le piccole cose difficili da cercare altrove.",
    cityDescriptionMore: " e altre {rest} categorie",
    sheetFreshnessBefore: "I numeri e i nomi qui sopra vengono dall'estrazione del",
    sheetFreshnessAfter: ". La mappa in sé è aggiornata in tempo reale.",
    pageFreshnessBefore: "I punti vengono da",
    pageFreshnessLink: "OpenStreetMap",
    pageFreshnessMiddle: "e dai suoi contributori, aggiornati il",
    pageFreshnessAfter:
      ". Manca qualcosa? Aggiungilo là e comparirà qui dopo il prossimo aggiornamento.",
  },

  poi: {
    stepFree: "Senza gradini",
    partlyStepFree: "Parzialmente senza gradini",
    free: "Gratuito",
    fee: "A pagamento",
    unnamedPlace: "Luogo senza nome",
    inPlace: "{noun}, {place}",
    onStreet: "{noun}, {street}",
    noExtraDetails: "{name} — nessun altro dettaglio",
    address: "Indirizzo",
    fromBuilding: "Da questo edificio",
    lastChecked: "Ultimo controllo",
    lastEdited: "Ultima modifica",
    editInOsm: "Modifica questo punto su OpenStreetMap",
    noise: {
      label: "Rumore del traffico",
      quiet: "Silenzioso",
      moderate: "Moderato",
      noisy: "Rumoroso",
      modelled: "Modellato dalle strade di OpenStreetMap, non misurato",
      about: "Come funziona",
      aboutTitle: "Rumore stradale modellato",
      aboutIntro:
        "È una stima, non una misura. Si calcola dalle strade e dalle ferrovie intorno al punto in OpenStreetMap: che tipo di strada è, a che velocità si viaggia, quante corsie ha e quanto dista. Le strade in galleria sono escluse.",
      aboutBandsHeading: "Tre livelli",
      aboutQuiet: "Silenzioso — sotto i 55 dB. Strada residenziale: si conversa senza sforzo.",
      aboutModerate:
        "Moderato — tra 55 e 65 dB. Strada trafficata vicina: il traffico si sente chiaramente.",
      aboutNoisy: "Rumoroso — oltre 65 dB. Lungo un asse principale: bisogna alzare la voce.",
      aboutLimit:
        "OpenStreetMap non sa quanto traffico passi davvero su una strada. Per questo si mostrano solo tre livelli approssimativi e nessun numero. La stima tratta inoltre ogni strada separatamente, quindi dove più assi trafficati si incrociano tende a sottostimare: un posto segnato come silenzioso può essere più rumoroso di quanto sembri.",
      aboutSource: "Strade e ferrovie dai contributori di OpenStreetMap.",
      aboutClose: "Chiudi",
    },
    air: {
      label: "Qualità dell'aria",
      good: "Buona",
      fair: "Discreta",
      moderate: "Moderata",
      poor: "Scadente",
      veryPoor: "Molto scadente",
      extremelyPoor: "Pessima",
      unit: "µg/m³",
      measuredAt: "Particolato fine, misurato a {distance} km, {age}",
      ageMinutes: { one: "1 min fa", other: "{count} min fa" },
      ageHours: { one: "1 h fa", other: "{count} h fa" },
      about: "Come funziona",
      aboutTitle: "Qualità dell'aria nei dintorni",
      aboutIntro:
        "È una misurazione reale, ma non presa qui. È il dato più recente di particolato fine (PM2.5) della stazione di misura più vicina, e la riga qui sopra dice quanto dista. Le stazioni sono poche: la maggior parte dei comuni non ne ha nessuna, e una grande città ne ha una manciata.",
      aboutBandsHeading: "I sei livelli",
      aboutGood: "Buona — sotto 10 µg/m³.",
      aboutFair: "Discreta — da 10 a 20 µg/m³.",
      aboutModerate: "Moderata — da 20 a 25 µg/m³. Le persone sensibili possono avvertirla.",
      aboutPoor: "Scadente — da 25 a 50 µg/m³. Meglio accorciare l'attività fisica intensa all'aperto.",
      aboutVeryPoor: "Molto scadente — da 50 a 75 µg/m³.",
      aboutExtremelyPoor: "Pessima — oltre 75 µg/m³.",
      aboutLimit:
        "Il particolato fine viaggia per centinaia di chilometri, ed è proprio per questo che vale la pena mostrare il dato della città vicina. Quello che non coglie è tutto ciò che è locale: una strada trafficata, una stufa a legna, una sera senza vento in una valle. Più la stazione è lontana, più ne manca — e nulla di questo rende l'aria di qui più pulita di quanto dica il numero.",
      aboutSource:
        "Misurazioni da OpenAQ e dalle reti di monitoraggio che aggrega. I livelli seguono l'Indice Europeo di Qualità dell'Aria.",
      aboutClose: "Chiudi",
    },
    hours: {
      Mo: "lun", Tu: "mar", We: "mer", Th: "gio", Fr: "ven", Sa: "sab", Su: "dom",
      PH: "festivi", SH: "vacanze scolastiche", closed: "chiuso",
    },
    age: {
      withinMonth: "nell'ultimo mese",
      months: { one: "un mese fa", other: "{count} mesi fa" },
      years: { one: "un anno fa", other: "{count} anni fa" },
    },
    keyLabels: {
      changing_table: "Fasciatoio",
      "toilets:disposal": "Tipo di bagno",
      "ramp:wheelchair": "Rampa per sedia a rotelle",
      building_levels: "Piani",
      "building:levels": "Piani",
      collection_times: "Orari di raccolta",
      "socket:type2": "Prese Type 2",
      "socket:type2_combo": "Prese CCS",
      "socket:chademo": "Prese CHAdeMO",
      "socket:schuko": "Prese Schuko",
      backrest: "Schienale",
      wikipedia: "Wikipedia",
      wikidata: "Wikidata",
    },
    values: {
      yes: "Sì",
      no: "No",
      limited: "Limitato",
      designated: "Riservato a questo uso",
      customers: "Solo clienti",
      permissive: "Aperto al pubblico",
      private: "Privato",
      unknown: "Non noto",
      public: "Pubblico",
      only: "Solo",
      seasonal: "Stagionale",
      permanent: "Tutto l'anno",
      free: "Gratuito",
      none: "Nessuno",
    },
    inThisBuilding: "In questo edificio",
    inBuilding: "Nell'edificio {building}",
    buildingLastChecked: "Edificio controllato il",
    buildingLastEdited: "Edificio modificato il",
    editBuildingInOsm: "Modifica l'edificio su OpenStreetMap",
  },

  translate: {
    action: "Traduci",
    pending: "Traduzione…",
    showOriginal: "Mostra l'originale",
    showTranslation: "Mostra la traduzione",
    sameLanguage: "Già in italiano",
    quota: "Limite di traduzioni giornaliero raggiunto",
    failed: "La traduzione non è riuscita",
  },

  controls: {
    about: "Informazioni sull'app",
    closeSearch: "Chiudi la ricerca",
    selectCategories: "Scegli le categorie da mostrare sulla mappa",
    zoomInHint: "Ingrandisci per caricare nuovi punti",
    routeStart: "La tua posizione",
    routeEnd: "Destinazione",
    chooseCategories: "Scegli le categorie",
    clearAll: "Cancella tutto",
    presetTitle: "Mostra sulla mappa: {preset}",
    showMapTools: "Mostra gli strumenti della mappa",
    hideMapTools: "Nascondi gli strumenti della mappa",
    layers: {
      open: "Livelli della mappa",
      title: "Livelli della mappa",
      close: "Chiudi",
      mapType: "Tipo di mappa",
      basemapDefault: "Predefinito",
      mapDetails: "Dettagli della mappa",
      trafficNoise: "Rumore del traffico",
      airQuality: "Qualità dell'aria",
      noCoverage: "Nessuna copertura in questa zona",
    },
    myLocation: "Centra la mappa sulla tua posizione",
    share: "Condividi questa vista",
    toggleSearch: "Mostra o nascondi la barra di ricerca",
    directions: "Indicazioni stradali",
    language: "Lingua",
    searchPlaceholder: "Cerca un luogo",
    routeHeading: "Cerca punti lungo un percorso",
    routeSubmit: "Calcola il percorso",
    routeReset: "Cancella il percorso",
    routeActive: "Punti mostrati tra {start} e {end}",
    routeYourLocation: "la tua posizione",
    typeLocation: "Scrivi un luogo",
    dragDownToClose: "Trascina in basso per chiudere",
    dragUpForMore: "Trascina in alto per vedere altro",
    loading: "Caricamento…",
    loadingServer: "{server}/{total}",
    loadingFallback:
      "Il nostro server non risponde, quindi la ricerca passa dai server pubblici",
    gpsWaiting: "In attesa del GPS…",
    gpsWaitingHint:
      "Ricerca del segnale satellitare. Il punto diventa blu appena il dispositivo conosce la sua posizione",
  },

  notices: {
    fetchFailed: "Il caricamento dei punti da Overpass non è riuscito. Riprova.",
    linkCopied: "Link copiato negli appunti",
    copyFailed: "Non è stato possibile copiare il link negli appunti.",
    shareRouteMissing: "Coordinate di partenza o di arrivo non trovate.",
    routeFailed: "Il calcolo del percorso non è riuscito: ",
    fallbackTitle: "Punti di interesse",
    fallbackSubtitle: "Trova i luoghi utili intorno a te",
  },
};

export const it: LocaleDeck = { categories: itCategories, ui };
