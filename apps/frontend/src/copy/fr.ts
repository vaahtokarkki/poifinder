/**
 * The French deck: app chrome plus nouns.
 *
 * French is the first language added on the traveller finding rather than on a
 * home market. Ask Google for "toilettes publiques" and the first city it
 * offers is Berlin, ahead of any French one; "fontaine à eau potable"
 * completes to Paris, Rome and Toulouse in the same breath. So this deck
 * serves two trees — thirteen French-speaking cities in depth, and the tier-1
 * European cities in the three categories French searches for abroad.
 *
 * The page prose stays English underneath. `categoryCopy` falls back field by
 * field, so a French page reads French in every title, heading, link and chip
 * and English in the paragraphs behind the disclosure. That is the state
 * Finnish shipped in and it is a deliberate stop, not an unfinished one: the
 * nouns are what a query matches and what a reader scans.
 *
 * French does not inflect place names, so `{city}` takes the bare form and the
 * relation goes in the preposition — "à Berlin", "à Paris". Templates that
 * need it use `{city}` and never `{cityIn}`. The one trap is the contraction
 * before a vowel or a masculine country name, which is why no template here
 * puts a determiner in front of a slot.
 *
 * NOT YET REVIEWED BY A NATIVE SPEAKER, and it should not ship a prose deck
 * without one.
 */
import { frCategories } from "./fr.categories";
import type { LocaleDeck } from "./types";

const ui: NonNullable<LocaleDeck["ui"]> = {
  categoryNames: {
    toilets: "Toilettes",
    "drinking-water": "Eau potable",
    playgrounds: "Aires de jeux",
    parking: "Parking",
    "charging-stations": "Bornes de recharge",
    "gas-stations": "Stations-service",
    "ice-cream": "Glaces",
    "dog-parks": "Parc à chiens",
    "picnic-spots": "Pique-nique",
    viewpoints: "Points de vue",
    beaches: "Plages et baignade",
    atms: "Distributeur",
    "post-boxes": "Boîtes aux lettres",
    recycling: "Déchetteries",
    "luggage-storage": "Consigne à bagages",
    libraries: "Bibliothèques",
    "outdoor-gyms": "Fitness en plein air",
    "camp-sites": "Campings",
    shelters: "Abris",
    "rest-areas": "Aires de repos",
    "dump-stations": "Aires de vidange",
    "post-offices": "Bureaux de poste",
    showers: "Douches",
    fireplaces: "Barbecue",
    "bicycle-repair": "Réparation de vélos",
    benches: "Bancs",
  },

  groups: {
    essentials: "L'essentiel",
    car: "Voiture",
    food: "Manger",
    nature: "Nature",
  },

  presets: {
    family: "Famille",
    "road-trip": "Road trip",
    camping: "Camping",
    "van-life": "Van",
    outdoors: "Plein air",
    "dog-walk": "Promenade du chien",
    errands: "Courses",
  },

  sheet: {
    summary:
      "Wayside cartographie les petites choses difficiles à trouver quand on est dehors : toilettes, aires de jeux, eau potable, parkings et bien d'autres. Choisis une sélection toute faite ou tes propres catégories, et cherche n'importe où sur la carte.",
    howItWorksHeading: "Comment ça marche",
    steps: [
      {
        title: "Choisis ce qu'il te faut",
        text: "Prends une sélection toute faite comme Famille ou Road trip, ou choisis les catégories toi-même.",
      },
      {
        title: "Déplace la carte",
        text: "Fais glisser ou zoome où tu veux : les points du nouveau cadrage se chargent d'eux-mêmes dès que la carte s'arrête.",
      },
      {
        title: "Ouvre un point",
        text: "Touche un marqueur pour les détails, les horaires quand ils sont connus, et l'itinéraire.",
      },
    ],
    presetsHeading: "Sélections",
    presetsNote: "Rien qui convienne ? Le sélecteur propose chaque catégorie séparément.",
    goodToKnowHeading: "Bon à savoir",
    tips: [
      "Cherche une ville ou une adresse avec le bouton de recherche.",
      "Suis un itinéraire : indique un départ et une arrivée pour voir les points le long du trajet.",
      "Partage le cadrage actuel et ses catégories avec le bouton de partage.",
    ],
    creditsSourceBefore: "Les points viennent d'",
    creditsSourceLink: "OpenStreetMap",
    creditsSourceAfter:
      "et de ses contributeurs. Il manque quelque chose ? Ajoute-le là-bas et il apparaîtra ici.",
    creditsCodeBefore: "Wayside est open source :",
    creditsCodeLink: "le code est sur GitHub",
    creditsCodeAfter: ".",
  },

  page: {
    homeTitle: "Trouve les petites choses, partout",
    homeMetaTitle: "Wayside — toilettes publiques, eau potable et aires de jeux sur une carte",
    homeMetaDescription:
      "Trouve les petits points d'intérêt difficiles à chercher ailleurs : toilettes " +
      "publiques, eau potable, aires de jeux, boîtes aux lettres et 16 autres catégories, " +
      "partout dans le monde. Gratuit, sans inscription, basé sur OpenStreetMap.",
    citiesMetaTitle: "Villes sur {site} — {count} cartes de villes",
    citiesMetaDescription:
      "Chaque ville qui a sa propre carte sur {site} : {count} {cityUnit} dans {countries} " +
      "{countryUnit}, chacune avec toilettes publiques, eau potable, aires de jeux et 17 " +
      "autres catégories issues d'OpenStreetMap. Gratuit et sans inscription.",
    browseCitiesBefore: "Parcourir",
    browseCitiesAfter: "qui ont leur propre page",
    citiesTitle: "Villes sur Wayside",
    cityUnit: { one: "ville", other: "villes" },
    countryUnit: { one: "pays", other: "pays" },
    citiesSummaryIn: "dans",
    citiesSummaryAfter:
      "ont leur propre page, qui liste ce qui y est cartographié : toilettes publiques, eau potable, aires de jeux et 17 autres catégories. Ailleurs la carte fonctionne pareil, il n'y a simplement pas encore de page.",
    cityTitle: "Points d'intérêt à {city}",
    cityCategoriesHeading: "Catégories à {city}",
    categoryUnit: { one: "catégorie", other: "catégories" },
    citySummaryAfter:
      "Ce sont les petits équipements qu'on ne trouve nulle part ailleurs. Choisis-en un pour le voir sur la carte.",
    mapped: "cartographiés",
    namedHeading: "Nommés",
    individualHeading: "Individuels",
    showingSome: "{listed} sur {total} que les données distinguent.",
    mapHasAll: "La carte les a tous les {count}",
    includingUnplaced:
      ", y compris les {unlisted} qui ne portent ni un nom ni un bâtiment ou un parc pour les situer.",
    questionsHeading: "Questions",
    allPointsIn: "Tous les points d'intérêt à {city}",
    allCities: "Toutes les villes sur Wayside",
    nearbyCities: "Villes à proximité",
    viewInThisLanguage: "Cette page en français",
    categoryTitle: "{noun} à {city} — {count} sur la carte | {site}",
    categoryDescription:
      "{count} {noun} à {city} sur une seule carte, avec horaires, tarifs et accessibilité quand OpenStreetMap les connaît. Gratuit, sans inscription, fonctionne sur téléphone.",
    categoryHeading: "{noun} à {city}",
    countryTitle:
      "{noun} {countryIn} sur une carte — {count} dans {cities} {cityUnit} | {site}",
    countryDescription:
      "{count} {noun} {countryIn}, cartographiés dans {cities} {cityUnit} et réunis sur une seule carte. À partir d'OpenStreetMap. Gratuit, sans inscription, fonctionne sur téléphone.",
    countryHeading: "{noun} {countryIn}",
    countrySummary: "{count} points cartographiés dans {cities} {cityUnit} {countryIn}.",
    countryCitiesHeading: "Villes {countryIn}",
    allInCountry: "{noun} {countryIn}",
    moreInCity: "Plus à {city}",
    nearbyHeading: "{noun} à proximité",
    cityDisclosure: "Catégories et villes proches de {city}",
    categoryDisclosure: "Liste des {noun} à {city}",
    listHeading: "{qualifier} {noun} à {city}",
    citySummary: "{count} points cartographiés dans {categories} {unit} à {city}, {country}.",
    cityFallbackTitle: "Points d'intérêt à {city} | {site}",
    cityDescription:
      "{count} points cartographiés à {city} : {named}{more}, sur une carte construite à partir d'OpenStreetMap. Les petites choses difficiles à chercher ailleurs.",
    cityDescriptionMore: " et {rest} autres catégories",
    sheetFreshnessBefore: "Les nombres et les noms ci-dessus viennent de l'extrait du",
    sheetFreshnessAfter: ". La carte elle-même est en direct.",
    pageFreshnessBefore: "Les points viennent d'",
    pageFreshnessLink: "OpenStreetMap",
    pageFreshnessMiddle: "et de ses contributeurs, mis à jour le",
    pageFreshnessAfter:
      ". Il manque quelque chose ? Ajoute-le là-bas et il apparaîtra ici après la prochaine mise à jour.",
  },

  poi: {
    stepFree: "Accessible de plain-pied",
    partlyStepFree: "Partiellement accessible",
    free: "Gratuit",
    fee: "Payant",
    unnamedPlace: "Lieu sans nom",
    inPlace: "{noun}, {place}",
    onStreet: "{noun}, {street}",
    noExtraDetails: "{name} — pas d'autres détails",
    address: "Adresse",
    fromBuilding: "De ce bâtiment",
    lastChecked: "Dernière vérification",
    lastEdited: "Dernière modification",
    editInOsm: "Modifier ce point sur OpenStreetMap",
    noise: {
      label: "Bruit de la circulation",
      quiet: "Calme",
      moderate: "Modéré",
      noisy: "Bruyant",
      modelled: "Modélisé à partir des routes d'OpenStreetMap, pas mesuré",
      about: "Comment ça marche",
      aboutTitle: "Bruit routier modélisé",
      aboutIntro:
        "C'est une estimation, pas une mesure. Elle se calcule à partir des routes et des voies ferrées autour du point dans OpenStreetMap : le type de route, la vitesse pratiquée, le nombre de voies et la distance. Les routes en tunnel sont exclues.",
      aboutBandsHeading: "Trois niveaux",
      aboutQuiet: "Calme — moins de 55 dB. Rue résidentielle : on converse sans effort.",
      aboutModerate:
        "Modéré — 55 à 65 dB. Rue passante à proximité : la circulation s'entend nettement.",
      aboutNoisy: "Bruyant — plus de 65 dB. Le long d'un grand axe : il faut hausser la voix.",
      aboutLimit:
        "OpenStreetMap ne dit pas quel trafic passe réellement sur une route. C'est pourquoi on n'affiche que trois niveaux approximatifs et aucun chiffre. L'estimation traite en plus chaque route séparément : là où plusieurs axes se croisent elle sous-estime plutôt, et un endroit marqué calme peut être plus bruyant qu'il n'y paraît.",
      aboutSource: "Routes et voies ferrées par les contributeurs d'OpenStreetMap.",
      aboutClose: "Fermer",
    },
    air: {
      label: "Qualité de l'air",
      good: "Bonne",
      fair: "Moyenne",
      moderate: "Dégradée",
      poor: "Mauvaise",
      veryPoor: "Très mauvaise",
      extremelyPoor: "Extrêmement mauvaise",
      unit: "µg/m³",
      measuredAt: "Particules fines, mesurées à {distance} km, {age}",
      ageMinutes: { one: "il y a 1 min", other: "il y a {count} min" },
      ageHours: { one: "il y a 1 h", other: "il y a {count} h" },
      about: "Comment ça marche",
      aboutTitle: "Qualité de l'air à proximité",
      aboutIntro:
        "Il s'agit d'une vraie mesure, mais pas prise ici. C'est le relevé de particules fines (PM2.5) le plus récent de la station de mesure la plus proche, et la ligne ci-dessus indique à quelle distance elle se trouve. Les stations sont rares : la plupart des communes n'en ont aucune, et une grande ville en compte une poignée.",
      aboutBandsHeading: "Les six niveaux",
      aboutGood: "Bonne — moins de 10 µg/m³.",
      aboutFair: "Moyenne — de 10 à 20 µg/m³.",
      aboutModerate: "Dégradée — de 20 à 25 µg/m³. Les personnes sensibles peuvent la ressentir.",
      aboutPoor: "Mauvaise — de 25 à 50 µg/m³. Mieux vaut écourter le sport intense en plein air.",
      aboutVeryPoor: "Très mauvaise — de 50 à 75 µg/m³.",
      aboutExtremelyPoor: "Extrêmement mauvaise — au-dessus de 75 µg/m³.",
      aboutLimit:
        "Les particules fines se déplacent sur des centaines de kilomètres, et c'est précisément pour cela qu'un relevé de la ville voisine vaut la peine d'être montré. Ce qu'il ne capte pas, c'est tout ce qui est local : une route passante, un feu de bois, un soir sans vent dans une vallée. Plus la station est loin, plus il en manque — et rien de tout cela ne rend l'air d'ici plus propre que ce que dit le chiffre.",
      aboutSource:
        "Mesures d'OpenAQ et des réseaux de surveillance qu'il agrège. Les niveaux suivent l'indice européen de qualité de l'air.",
      aboutClose: "Fermer",
    },
    hours: {
      Mo: "lun", Tu: "mar", We: "mer", Th: "jeu", Fr: "ven", Sa: "sam", Su: "dim",
      PH: "jours fériés", SH: "vacances scolaires", closed: "fermé",
    },
    age: {
      withinMonth: "au cours du dernier mois",
      months: { one: "il y a un mois", other: "il y a {count} mois" },
      years: { one: "il y a un an", other: "il y a {count} ans" },
    },
    keyLabels: {
      changing_table: "Table à langer",
      "toilets:disposal": "Type de toilettes",
      "ramp:wheelchair": "Rampe pour fauteuil roulant",
      building_levels: "Étages",
      "building:levels": "Étages",
      collection_times: "Heures de levée",
      "socket:type2": "Prises Type 2",
      "socket:type2_combo": "Prises CCS",
      "socket:chademo": "Prises CHAdeMO",
      "socket:schuko": "Prises Schuko",
      backrest: "Dossier",
      wikipedia: "Wikipédia",
      wikidata: "Wikidata",
    },
    values: {
      yes: "Oui",
      no: "Non",
      limited: "Limité",
      designated: "Réservé à cet usage",
      customers: "Clients uniquement",
      permissive: "Ouvert au public",
      private: "Privé",
      unknown: "Inconnu",
      public: "Public",
      only: "Seulement",
      seasonal: "Saisonnier",
      permanent: "Toute l'année",
      free: "Gratuit",
      none: "Aucun",
    },
    inThisBuilding: "Dans ce bâtiment",
    inBuilding: "Dans le bâtiment {building}",
    buildingLastChecked: "Bâtiment vérifié le",
    buildingLastEdited: "Bâtiment modifié le",
    editBuildingInOsm: "Modifier le bâtiment sur OpenStreetMap",
  },

  translate: {
    action: "Traduire",
    pending: "Traduction…",
    showOriginal: "Voir l'original",
    showTranslation: "Voir la traduction",
    sameLanguage: "Déjà en français",
    quota: "Limite de traduction du jour atteinte",
    failed: "La traduction a échoué",
  },

  controls: {
    about: "À propos de l'application",
    closeSearch: "Fermer la recherche",
    selectCategories: "Choisir les catégories affichées sur la carte",
    zoomInHint: "Zoome pour charger de nouveaux points",
    routeStart: "Ta position",
    routeEnd: "Destination",
    chooseCategories: "Choisir les catégories",
    clearAll: "Tout effacer",
    presetTitle: "Afficher sur la carte : {preset}",
    showMapTools: "Afficher les outils de carte",
    hideMapTools: "Masquer les outils de carte",
    layers: {
      open: "Couches de la carte",
      title: "Couches de la carte",
      close: "Fermer",
      mapType: "Type de carte",
      basemapDefault: "Par défaut",
      mapDetails: "Détails de la carte",
      trafficNoise: "Bruit de la circulation",
      airQuality: "Qualité de l'air",
      noCoverage: "Pas de couverture dans cette zone",
    },
    myLocation: "Centrer la carte sur ta position",
    share: "Partager cette vue",
    toggleSearch: "Afficher ou masquer la barre de recherche",
    directions: "Itinéraire",
    language: "Langue",
    searchPlaceholder: "Chercher un lieu",
    routeHeading: "Chercher des points le long d'un itinéraire",
    routeSubmit: "Calculer l'itinéraire",
    routeReset: "Effacer l'itinéraire",
    routeActive: "Points affichés entre {start} et {end}",
    routeYourLocation: "ta position",
    typeLocation: "Saisis un lieu",
    dragDownToClose: "Fais glisser vers le bas pour fermer",
    dragUpForMore: "Fais glisser vers le haut pour en voir plus",
    loading: "Chargement…",
    loadingServer: "{server}/{total}",
    loadingFallback:
      "Notre serveur ne répond pas, la recherche passe donc par les serveurs publics",
    gpsWaiting: "En attente du GPS…",
    gpsWaitingHint:
      "Recherche du signal satellite. Le point devient bleu dès que l'appareil connaît sa position",
  },

  notices: {
    fetchFailed: "Le chargement des points depuis Overpass a échoué. Réessaie.",
    linkCopied: "Lien copié dans le presse-papiers",
    copyFailed: "Impossible de copier le lien dans le presse-papiers.",
    shareRouteMissing: "Coordonnées de départ ou d'arrivée introuvables.",
    routeFailed: "Le calcul de l'itinéraire a échoué : ",
    fallbackTitle: "Points d'intérêt",
    fallbackSubtitle: "Trouve les lieux utiles autour de toi",
  },
};

export const fr: LocaleDeck = { categories: frCategories, ui };
