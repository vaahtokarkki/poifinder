/**
 * The Spanish deck: app chrome plus nouns.
 *
 * Spanish carries both trees at once, which none of the other new languages
 * does. "punto limpio" completes to Madrid, Sevilla, Zaragoza and Valladolid
 * — a home market, city after city — while "baños públicos mapa" completes to
 * Paris, Nueva York and Roma alongside Madrid and Barcelona. So the nine home
 * cities and the tier-1 traveller set both have demand behind them.
 *
 * The autocomplete behind this deck was pulled without a region parameter, so
 * it leans to Spain rather than to Mexico. That is the right bias for a
 * European rollout and the wrong one the day Mexico City, Buenos Aires and
 * Santiago become the point — they are in the catalogue and they are not what
 * these nouns were chosen against. "Aparcamiento" is the clearest case: Latin
 * America says "estacionamiento".
 *
 * The page prose stays English underneath, the same field-by-field fallback
 * the other decks use.
 *
 * Spanish does not inflect place names — "en Berlín", "en Roma" — so `{city}`
 * is the bare form and the relation is the preposition.
 *
 * NOT YET REVIEWED BY A NATIVE SPEAKER.
 */
import { esCategories } from "./es.categories";
import type { LocaleDeck } from "./types";

const ui: NonNullable<LocaleDeck["ui"]> = {
  categoryNames: {
    toilets: "Baños",
    "drinking-water": "Agua potable",
    playgrounds: "Parques infantiles",
    parking: "Aparcamiento",
    "charging-stations": "Puntos de recarga",
    "gas-stations": "Gasolineras",
    "ice-cream": "Heladerías",
    "dog-parks": "Parque para perros",
    "picnic-spots": "Picnic",
    viewpoints: "Miradores",
    beaches: "Playas y baño",
    atms: "Cajero",
    "post-boxes": "Buzones",
    recycling: "Reciclaje",
    "luggage-storage": "Consigna",
    libraries: "Bibliotecas",
    "outdoor-gyms": "Gimnasios al aire libre",
    "camp-sites": "Campings",
    shelters: "Refugios",
    "rest-areas": "Áreas de descanso",
    "dump-stations": "Áreas de vaciado",
    "post-offices": "Oficinas de correos",
    showers: "Duchas",
    fireplaces: "Barbacoa",
    "bicycle-repair": "Reparación de bicicletas",
    benches: "Bancos",
  },

  groups: {
    essentials: "Lo esencial",
    car: "Coche",
    food: "Comida",
    nature: "Naturaleza",
  },

  presets: {
    family: "Familia",
    "road-trip": "Viaje por carretera",
    camping: "Camping",
    "van-life": "Furgoneta",
    outdoors: "Aire libre",
    "dog-walk": "Paseo con el perro",
    errands: "Recados",
  },

  sheet: {
    summary:
      "Wayside cartografía las cosas pequeñas que cuesta encontrar cuando estás fuera: baños, parques infantiles, agua potable, aparcamiento y más. Elige una selección ya hecha o tus propias categorías, y busca en cualquier punto del mapa.",
    howItWorksHeading: "Cómo funciona",
    steps: [
      {
        title: "Elige lo que necesitas",
        text: "Usa una selección ya hecha como Familia o Viaje por carretera, o elige tú las categorías.",
      },
      {
        title: "Mueve el mapa",
        text: "Arrastra o amplía donde quieras: los puntos del nuevo encuadre se cargan solos en cuanto el mapa se detiene.",
      },
      {
        title: "Abre un punto",
        text: "Toca un marcador para ver los detalles, el horario cuando se conoce y cómo llegar.",
      },
    ],
    presetsHeading: "Selecciones",
    presetsNote: "¿No hay ninguna que encaje? En el selector está cada categoría por separado.",
    goodToKnowHeading: "Conviene saber",
    tips: [
      "Busca una ciudad o una dirección con el botón de búsqueda.",
      "Sigue una ruta: indica origen y destino para ver los puntos por el camino.",
      "Comparte el encuadre actual y sus categorías con el botón de compartir.",
    ],
    creditsSourceBefore: "Los puntos vienen de",
    creditsSourceLink: "OpenStreetMap",
    creditsSourceAfter:
      "y de quienes colaboran. ¿Falta algo? Añádelo allí y aparecerá aquí.",
    creditsCodeBefore: "Wayside es de código abierto:",
    creditsCodeLink: "el código está en GitHub",
    creditsCodeAfter: ".",
  },

  page: {
    homeTitle: "Encuentra las cosas pequeñas, en cualquier sitio",
    homeMetaTitle: "Wayside — baños públicos, agua potable y parques infantiles en un mapa",
    homeMetaDescription:
      "Encuentra los puntos de interés pequeños que cuesta buscar en otro sitio: baños " +
      "públicos, agua potable, parques infantiles, buzones y 16 categorías más, en todo el " +
      "mundo. Gratis, sin registro, construido sobre OpenStreetMap.",
    citiesMetaTitle: "Ciudades en {site} — {count} mapas de ciudades",
    citiesMetaDescription:
      "Cada ciudad con mapa propio en {site}: {count} {cityUnit} en {countries} " +
      "{countryUnit}, cada una con baños públicos, agua potable, parques infantiles y 17 " +
      "categorías más de OpenStreetMap. Gratis y sin registro.",
    browseCitiesBefore: "Explora",
    browseCitiesAfter: "que tienen página propia",
    citiesTitle: "Ciudades en Wayside",
    cityUnit: { one: "ciudad", other: "ciudades" },
    countryUnit: { one: "país", other: "países" },
    citiesSummaryIn: "en",
    citiesSummaryAfter:
      "tienen página propia, con lo que hay cartografiado allí: baños públicos, agua potable, parques infantiles y 17 categorías más. En el resto el mapa funciona igual, sencillamente todavía no hay página.",
    cityTitle: "Puntos de interés en {city}",
    cityCategoriesHeading: "Categorías en {city}",
    categoryUnit: { one: "categoría", other: "categorías" },
    citySummaryAfter:
      "Son las pequeñas instalaciones que cuesta buscar en cualquier otro sitio. Elige una para verla en el mapa.",
    mapped: "cartografiados",
    namedHeading: "Con nombre",
    individualHeading: "Individuales",
    showingSome: "{listed} de los {total} que los datos distinguen.",
    mapHasAll: "El mapa los tiene todos, los {count}",
    includingUnplaced:
      ", incluidos los {unlisted} que no llevan nombre ni un edificio o parque que los sitúe.",
    questionsHeading: "Preguntas",
    allPointsIn: "Todos los puntos de interés en {city}",
    allCities: "Todas las ciudades en Wayside",
    nearbyCities: "Ciudades cercanas",
    viewInThisLanguage: "Esta página en español",
    categoryTitle: "{noun} en {city} — {count} en el mapa | {site}",
    categoryDescription:
      "{count} {noun} en {city} en un solo mapa, con horarios, tarifas y accesibilidad donde OpenStreetMap los conoce. Gratis, sin registro, funciona en el móvil.",
    categoryHeading: "{noun} en {city}",
    countryTitle:
      "{noun} en {countryIn} en un mapa — {count} en {cities} {cityUnit} | {site}",
    countryDescription:
      "{count} {noun} en {countryIn}, cartografiados en {cities} {cityUnit} y reunidos en un solo mapa. A partir de OpenStreetMap. Gratis, sin registro, funciona en el móvil.",
    countryHeading: "{noun} en {countryIn}",
    countrySummary: "{count} puntos cartografiados en {cities} {cityUnit} en {countryIn}.",
    countryCitiesHeading: "Ciudades en {countryIn}",
    allInCountry: "{noun} en {countryIn}",
    moreInCity: "Más en {city}",
    nearbyHeading: "{noun} cerca",
    cityDisclosure: "Categorías y ciudades cercanas a {city}",
    categoryDisclosure: "Lista de {noun} en {city}",
    listHeading: "{qualifier} {noun} en {city}",
    citySummary: "{count} puntos cartografiados en {categories} {unit} en {city}, {country}.",
    cityFallbackTitle: "Puntos de interés en {city} | {site}",
    cityDescription:
      "{count} puntos cartografiados en {city}: {named}{more}, en un mapa construido a partir de OpenStreetMap. Las cosas pequeñas que cuesta buscar en otro sitio.",
    cityDescriptionMore: " y {rest} categorías más",
    sheetFreshnessBefore: "Las cifras y los nombres de arriba son del extracto del",
    sheetFreshnessAfter: ". El mapa en sí está en vivo.",
    pageFreshnessBefore: "Los puntos vienen de",
    pageFreshnessLink: "OpenStreetMap",
    pageFreshnessMiddle: "y de quienes colaboran, actualizados el",
    pageFreshnessAfter:
      ". ¿Falta algo? Añádelo allí y aparecerá aquí tras la próxima actualización.",
  },

  poi: {
    stepFree: "Sin escalones",
    partlyStepFree: "Parcialmente sin escalones",
    free: "Gratis",
    fee: "De pago",
    unnamedPlace: "Lugar sin nombre",
    inPlace: "{noun}, {place}",
    onStreet: "{noun}, {street}",
    noExtraDetails: "{name} — sin más detalles",
    address: "Dirección",
    fromBuilding: "De este edificio",
    lastChecked: "Última comprobación",
    lastEdited: "Última modificación",
    editInOsm: "Editar este punto en OpenStreetMap",
    noise: {
      label: "Ruido del tráfico",
      quiet: "Tranquilo",
      moderate: "Moderado",
      noisy: "Ruidoso",
      modelled: "Modelado a partir de las carreteras de OpenStreetMap, no medido",
      about: "Cómo funciona",
      aboutTitle: "Ruido de tráfico modelado",
      aboutIntro:
        "Es una estimación, no una medición. Se calcula a partir de las carreteras y las vías férreas alrededor del punto en OpenStreetMap: qué tipo de vía es, a qué velocidad se circula, cuántos carriles tiene y a qué distancia está. Las carreteras en túnel quedan fuera.",
      aboutBandsHeading: "Tres niveles",
      aboutQuiet: "Tranquilo — por debajo de 55 dB. Calle residencial: se conversa sin esfuerzo.",
      aboutModerate:
        "Moderado — entre 55 y 65 dB. Calle transitada cerca: el tráfico se oye con claridad.",
      aboutNoisy: "Ruidoso — más de 65 dB. Junto a una vía principal: hay que alzar la voz.",
      aboutLimit:
        "OpenStreetMap no recoge cuánto tráfico pasa realmente por una vía. Por eso se muestran solo tres niveles aproximados y ningún número. La estimación trata además cada vía por separado, así que donde se cruzan varias transitadas tiende a quedarse corta: un sitio marcado como tranquilo puede ser más ruidoso de lo que parece.",
      aboutSource: "Carreteras y vías férreas de quienes colaboran en OpenStreetMap.",
      aboutClose: "Cerrar",
    },
    hours: {
      Mo: "lun", Tu: "mar", We: "mié", Th: "jue", Fr: "vie", Sa: "sáb", Su: "dom",
      PH: "festivos", SH: "vacaciones escolares", closed: "cerrado",
    },
    age: {
      withinMonth: "en el último mes",
      months: { one: "hace un mes", other: "hace {count} meses" },
      years: { one: "hace un año", other: "hace {count} años" },
    },
    keyLabels: {
      changing_table: "Cambiador",
      "toilets:disposal": "Tipo de baño",
      "ramp:wheelchair": "Rampa para silla de ruedas",
      building_levels: "Plantas",
      "building:levels": "Plantas",
      collection_times: "Horas de recogida",
      "socket:type2": "Tomas Type 2",
      "socket:type2_combo": "Tomas CCS",
      "socket:chademo": "Tomas CHAdeMO",
      "socket:schuko": "Tomas Schuko",
      backrest: "Respaldo",
      wikipedia: "Wikipedia",
      wikidata: "Wikidata",
    },
    values: {
      yes: "Sí",
      no: "No",
      limited: "Limitado",
      designated: "Reservado a este uso",
      customers: "Solo clientes",
      permissive: "Abierto al público",
      private: "Privado",
      unknown: "Se desconoce",
      public: "Público",
      only: "Solo",
      seasonal: "De temporada",
      permanent: "Todo el año",
      free: "Gratis",
      none: "Ninguno",
    },
    inThisBuilding: "En este edificio",
    inBuilding: "En el edificio {building}",
    buildingLastChecked: "Edificio comprobado el",
    buildingLastEdited: "Edificio modificado el",
    editBuildingInOsm: "Editar el edificio en OpenStreetMap",
  },

  translate: {
    action: "Traducir",
    pending: "Traduciendo…",
    showOriginal: "Ver el original",
    showTranslation: "Ver la traducción",
    sameLanguage: "Ya está en español",
    quota: "Límite de traducción del día alcanzado",
    failed: "La traducción no funcionó",
  },

  controls: {
    about: "Acerca de la aplicación",
    closeSearch: "Cerrar la búsqueda",
    selectCategories: "Elige las categorías que se muestran en el mapa",
    zoomInHint: "Amplía para cargar puntos nuevos",
    routeStart: "Tu ubicación",
    routeEnd: "Destino",
    chooseCategories: "Elegir categorías",
    clearAll: "Borrar todo",
    presetTitle: "Mostrar en el mapa: {preset}",
    showMapTools: "Mostrar las herramientas del mapa",
    hideMapTools: "Ocultar las herramientas del mapa",
    layers: {
      open: "Capas del mapa",
      title: "Capas del mapa",
      close: "Cerrar",
      mapType: "Tipo de mapa",
      basemapDefault: "Predeterminado",
      mapDetails: "Detalles del mapa",
      trafficNoise: "Ruido del tráfico",
      noCoverage: "Sin cobertura en esta zona",
    },
    myLocation: "Centrar el mapa en tu ubicación",
    share: "Compartir esta vista",
    toggleSearch: "Mostrar u ocultar la barra de búsqueda",
    directions: "Cómo llegar",
    language: "Idioma",
    searchPlaceholder: "Buscar un lugar",
    routeHeading: "Buscar puntos a lo largo de una ruta",
    routeSubmit: "Calcular la ruta",
    routeReset: "Borrar la ruta",
    routeActive: "Puntos mostrados entre {start} y {end}",
    routeYourLocation: "tu ubicación",
    typeLocation: "Escribe un lugar",
    dragDownToClose: "Arrastra hacia abajo para cerrar",
    dragUpForMore: "Arrastra hacia arriba para ver más",
    loading: "Cargando…",
    loadingServer: "{server}/{total}",
    loadingFallback:
      "Nuestro servidor no responde, así que la búsqueda pasa por los servidores públicos",
    gpsWaiting: "Esperando al GPS…",
    gpsWaitingHint:
      "Buscando la señal de los satélites. El punto se vuelve azul en cuanto el dispositivo sabe dónde está",
  },

  notices: {
    fetchFailed: "No se pudieron cargar los puntos desde Overpass. Inténtalo de nuevo.",
    linkCopied: "Enlace copiado al portapapeles",
    copyFailed: "No se pudo copiar el enlace al portapapeles.",
    shareRouteMissing: "No se encontraron las coordenadas de origen o de destino.",
    routeFailed: "No se pudo calcular la ruta: ",
    fallbackTitle: "Puntos de interés",
    fallbackSubtitle: "Encuentra los lugares útiles a tu alrededor",
  },
};

export const es: LocaleDeck = { categories: esCategories, ui };
