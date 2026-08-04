import { CATEGORIES } from "../constants";

/**
 * The SEO half of a category: the URL slug it lives under and the copy that
 * makes its page worth landing on. The Overpass filters stay in constants.ts,
 * this module only adds what a page needs on top of them.
 */
export type FaqEntry = { q: string; a: string };

export type CategorySeo = {
  category: CATEGORIES;
  /** URL segment, plural and hyphenated */
  slug: string;
  /** Slugs from earlier sitemaps that must keep resolving */
  aliases?: string[];
  /** Plural noun as it reads mid sentence: "public toilets in Helsinki" */
  plural: string;
  /** Sentence case heading noun */
  heading: string;
  /** schema.org type of a single point, Place when nothing fits better */
  schemaType: string;
  /**
   * The paragraph above the list. `count` arrives already formatted, so the
   * copy never has to think about thousands separators
   */
  intro: (city: string, count: string) => string;
  /** Questions people actually search for, answered specifically */
  faq: (city: string, count: string) => FaqEntry[];
};

const CATEGORY_SEO_LIST: CategorySeo[] = [
  {
    category: CATEGORIES.Toilets,
    slug: "toilets",
    plural: "public toilets",
    heading: "Public toilets",
    schemaType: "PublicToilet",
    intro: (city, count) =>
      `${count} public toilets are mapped in and around ${city}. The list below covers the ones that carry a name in OpenStreetMap; the map shows every one, including the unnamed street toilets and the ones inside parks, stations and shopping centres. Where the data says so, you also get opening hours, whether there is a fee, and whether the toilet is step free.`,
    faq: (city, count) => [
      {
        q: `Where can I find a public toilet in ${city}?`,
        a: `Open the map above and it centres on ${city} with all ${count} mapped toilets on it. Tap any marker for its exact position, opening hours when known, and walking directions. Allow location access and the map follows you instead, which is the faster route when you are already out.`,
      },
      {
        q: `Are public toilets in ${city} free?`,
        a: `It varies by city and by individual toilet. Where OpenStreetMap records a fee, the point is labelled with it. Station and shopping centre toilets are the ones most likely to charge; municipal street toilets and park toilets are usually free.`,
      },
      {
        q: `Are there wheelchair accessible toilets in ${city}?`,
        a: `Yes. Points tagged as step free in OpenStreetMap show their accessibility in the detail panel. Coverage of this tag is uneven, so an unlabelled toilet is not necessarily inaccessible, it may simply be unsurveyed.`,
      },
      {
        q: `Why do some toilets show no opening hours?`,
        a: `Opening hours are an optional tag in OpenStreetMap and many contributors map the location without them. A missing value means nobody has surveyed it, not that the toilet is open around the clock.`,
      },
    ],
  },
  {
    category: CATEGORIES.DrinkingWater,
    slug: "drinking-water",
    plural: "drinking water points",
    heading: "Drinking water",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} places to refill a bottle are mapped in ${city}: public drinking fountains, tap points, and fountains where the water is confirmed potable. Points that are tagged as non potable are filtered out, so what you see is water you can actually drink.`,
    faq: (city, count) => [
      {
        q: `Where can I refill a water bottle in ${city}?`,
        a: `The map shows all ${count} mapped drinking water points in ${city}, most of them in parks, squares and along walking routes. Tap a marker for directions.`,
      },
      {
        q: `Is the tap water in these fountains safe to drink?`,
        a: `Every point shown here is tagged in OpenStreetMap as drinking water, and sources explicitly marked as not potable are excluded. Fountains can still be seasonal, so in cold climates expect many to be shut off over winter.`,
      },
      {
        q: `Are drinking fountains in ${city} open all year?`,
        a: `In cities with freezing winters, outdoor fountains are usually drained and closed from autumn to spring to stop the pipes bursting. The map does not track the seasonal shutoff, so treat winter results as approximate.`,
      },
    ],
  },
  {
    category: CATEGORIES.Playgrounds,
    slug: "playgrounds",
    plural: "playgrounds",
    heading: "Playgrounds",
    schemaType: "Playground",
    intro: (city, count) =>
      `${count} playgrounds are mapped in and around ${city}. The list names the ones OpenStreetMap has a name for, usually the larger park playgrounds; the map adds every unnamed neighbourhood one on top of that.`,
    faq: (city, count) => [
      {
        q: `How many playgrounds are there in ${city}?`,
        a: `${count} are currently mapped in OpenStreetMap within the area this page covers. That is close to the real figure in well surveyed cities, and an undercount in places where mapping is still thin.`,
      },
      {
        q: `Which playground in ${city} is closest to me?`,
        a: `Allow location access and the map centres on you, with the nearest playgrounds around it. You can also pair playgrounds with toilets and ice cream using the "With kids" preset, which is usually what you actually need on a day out.`,
      },
      {
        q: `Do the listings say what equipment a playground has?`,
        a: `Only when a contributor surveyed it. OpenStreetMap can record swings, slides, climbing frames and the age range a playground is meant for, but most points carry just the location and sometimes a name.`,
      },
    ],
  },
  {
    category: CATEGORIES.Parking,
    slug: "parking",
    plural: "car parks",
    heading: "Parking",
    schemaType: "ParkingFacility",
    intro: (city, count) =>
      `${count} car parks and parking areas are mapped in ${city}, with private and residents only parking filtered out. That covers street parking areas, surface lots and multi storey garages.`,
    faq: (city, count) => [
      {
        q: `Where can I park in ${city}?`,
        a: `The map shows ${count} publicly usable parking areas. Points explicitly tagged as private access are excluded, so what is left is parking you can normally drive into.`,
      },
      {
        q: `Does this show parking prices?`,
        a: `Only where OpenStreetMap records them, which is a minority of points. Treat the map as a way to find the car parks, then check the price on the sign or the operator's own site.`,
      },
      {
        q: `Is free parking marked separately?`,
        a: `Where the fee tag exists, it shows in the point details. Uneven coverage means an unlabelled car park could be either, so it is worth checking on arrival.`,
      },
    ],
  },
  {
    category: CATEGORIES.ChargingStation,
    slug: "charging-stations",
    plural: "EV charging stations",
    heading: "EV charging stations",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} electric vehicle charging stations are mapped in ${city}, from single kerbside points to motorway rapid chargers. OpenStreetMap covers operators that the big proprietary apps often leave out, particularly small municipal and hotel chargers.`,
    faq: (city, count) => [
      {
        q: `Where can I charge an electric car in ${city}?`,
        a: `The map shows ${count} mapped charging stations. Tap one for its position and whatever the survey recorded about connectors and operator.`,
      },
      {
        q: `Does this show whether a charger is available right now?`,
        a: `No. OpenStreetMap is a map of what exists, not a live availability feed. For real time status you still need the operator's own app.`,
      },
      {
        q: `Which connector types are shown?`,
        a: `Where a contributor recorded them, socket types appear in the point details. Coverage is better for newer and larger installations than for older kerbside points.`,
      },
    ],
  },
  {
    category: CATEGORIES.GasStation,
    slug: "gas-stations",
    plural: "petrol stations",
    heading: "Petrol stations",
    schemaType: "GasStation",
    intro: (city, count) =>
      `${count} fuel stations are mapped in and around ${city}, including the unbranded and automated ones that often go missing from brand specific finders.`,
    faq: (city, count) => [
      {
        q: `Where is the nearest petrol station in ${city}?`,
        a: `Allow location access and the map centres on you with the nearest of the ${count} mapped stations around it, or pan to any area and search there.`,
      },
      {
        q: `Are fuel prices shown?`,
        a: `No. OpenStreetMap does not carry live pricing, so this is a station finder rather than a price comparison.`,
      },
      {
        q: `Can I find stations along a route?`,
        a: `Yes. Set a start and a destination with the directions button and the app loads points within 500 m of the route, which is the useful shape for a long drive.`,
      },
    ],
  },
  {
    category: CATEGORIES.Icecream,
    slug: "ice-cream",
    plural: "ice cream shops",
    heading: "Ice cream",
    schemaType: "IceCreamShop",
    intro: (city, count) =>
      `${count} ice cream shops, gelaterias and kiosks are mapped in ${city}, covering both dedicated shops and cafés whose main trade is ice cream.`,
    faq: (city, count) => [
      {
        q: `Where can I get ice cream in ${city}?`,
        a: `The map shows ${count} mapped spots. Seasonal kiosks are included, so expect some of them to be shut outside summer.`,
      },
      {
        q: `Are opening hours shown?`,
        a: `Where OpenStreetMap has them. Ice cream is a strongly seasonal trade and hours change often, so confirm before making a trip.`,
      },
    ],
  },
  {
    category: CATEGORIES.DogPark,
    slug: "dog-parks",
    aliases: ["dog-park"],
    plural: "dog parks",
    heading: "Dog parks",
    schemaType: "Park",
    intro: (city, count) =>
      `${count} fenced dog parks and off leash areas are mapped in ${city}. These are the enclosures where a dog can run without a lead, as distinct from parks that merely allow dogs.`,
    faq: (city, count) => [
      {
        q: `Where can I let my dog off the lead in ${city}?`,
        a: `The map shows ${count} mapped dog parks and off leash areas. Pair them with drinking water and toilets using the "Dog walk" preset for a full walk route.`,
      },
      {
        q: `Are these areas fenced?`,
        a: `Most points tagged as dog parks are enclosed, but OpenStreetMap does not always record the fence separately. Check on arrival if your dog needs a secure boundary.`,
      },
    ],
  },
  {
    category: CATEGORIES.Picnic,
    slug: "picnic-spots",
    plural: "picnic spots",
    heading: "Picnic spots",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} picnic spots are mapped around ${city}, from a single table by a path to a laid out picnic site with several tables and a fireplace.`,
    faq: (city, count) => [
      {
        q: `Where can I have a picnic in ${city}?`,
        a: `The map shows ${count} mapped picnic tables and picnic sites, most of them in parks and along walking and cycling routes.`,
      },
      {
        q: `Do picnic sites have barbecue facilities?`,
        a: `Some do, and where a contributor recorded a fireplace or barbecue it shows in the point details. Check local fire restrictions before lighting anything.`,
      },
    ],
  },
  {
    category: CATEGORIES.Viewpoint,
    slug: "viewpoints",
    plural: "viewpoints",
    heading: "Viewpoints",
    schemaType: "TouristAttraction",
    intro: (city, count) =>
      `${count} viewpoints are mapped around ${city}: the marked spots where the view is the point, from towers and terraces to unmarked ridges that locals have surveyed.`,
    faq: (city, count) => [
      {
        q: `What are the best viewpoints in ${city}?`,
        a: `The map shows ${count} mapped viewpoints. OpenStreetMap does not rank them, so the value here is finding the ones no guidebook lists rather than the famous terrace everyone already knows.`,
      },
      {
        q: `Are these viewpoints free to visit?`,
        a: `Most outdoor viewpoints are, but towers and observation decks often charge. Where the fee tag exists it shows in the details.`,
      },
    ],
  },
  {
    category: CATEGORIES.Beach,
    slug: "beaches",
    plural: "beaches and swimming spots",
    heading: "Beaches and swimming",
    schemaType: "Beach",
    intro: (city, count) =>
      `${count} beaches and designated swimming areas are mapped around ${city}, covering lake and river swimming spots as well as coastline.`,
    faq: (city, count) => [
      {
        q: `Where can I swim in ${city}?`,
        a: `The map shows ${count} mapped beaches and swimming areas. Pair them with toilets, parking and ice cream using the "Beach day" preset.`,
      },
      {
        q: `Is the water quality shown?`,
        a: `No. Water quality is monitored by local authorities and changes through the season, so check their current advisories before swimming.`,
      },
      {
        q: `Are these beaches supervised?`,
        a: `OpenStreetMap sometimes records a lifeguard, but coverage is patchy. Assume a beach is unsupervised unless you can see otherwise on site.`,
      },
    ],
  },
  {
    category: CATEGORIES.Atm,
    slug: "atms",
    plural: "ATMs",
    heading: "ATMs",
    schemaType: "AutomatedTeller",
    intro: (city, count) =>
      `${count} cash machines are mapped in ${city}, both standalone ATMs and the ones inside banks and shops.`,
    faq: (city, count) => [
      {
        q: `Where is the nearest ATM in ${city}?`,
        a: `Allow location access and the map centres on you with the closest of the ${count} mapped machines around it.`,
      },
      {
        q: `Do these ATMs charge a fee?`,
        a: `Where OpenStreetMap records a fee it shows in the details, but coverage is thin. Independent machines in tourist areas are the ones most likely to charge.`,
      },
    ],
  },
  {
    category: CATEGORIES.PostBoxes,
    slug: "post-boxes",
    plural: "post boxes",
    heading: "Post boxes",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} post boxes are mapped in ${city}. Street letter boxes are exactly the kind of small fixture that general purpose map apps skip and OpenStreetMap surveys thoroughly.`,
    faq: (city, count) => [
      {
        q: `Where is the nearest post box in ${city}?`,
        a: `The map shows all ${count} mapped boxes. This is one of the categories where OpenStreetMap is clearly the better source, since mainstream map apps rarely carry individual letter boxes at all.`,
      },
      {
        q: `Are collection times shown?`,
        a: `Occasionally. Where a contributor surveyed the collection schedule it appears in the point details, but most boxes carry only their location.`,
      },
    ],
  },
  {
    category: CATEGORIES.Recycling,
    slug: "recycling",
    plural: "recycling points",
    heading: "Recycling",
    schemaType: "RecyclingCenter",
    intro: (city, count) =>
      `${count} recycling points are mapped in ${city}, from a single glass bank on a street corner to a full recycling centre.`,
    faq: (city, count) => [
      {
        q: `Where can I recycle in ${city}?`,
        a: `The map shows ${count} mapped recycling points. Tap one to see which materials the survey recorded.`,
      },
      {
        q: `Which materials are accepted?`,
        a: `OpenStreetMap records accepted materials per point, so glass, paper, plastic and clothing banks are often distinguishable. Coverage of the detail varies by country.`,
      },
    ],
  },
  {
    category: CATEGORIES.LuggageStorage,
    slug: "luggage-storage",
    plural: "luggage storage points",
    heading: "Luggage storage",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} luggage lockers and left luggage offices are mapped in ${city}, mostly at stations, airports and transport hubs. Useful on the day you check out but your train is not until evening.`,
    faq: (city, count) => [
      {
        q: `Where can I leave my bags in ${city}?`,
        a: `The map shows ${count} mapped locker banks and left luggage counters. Main railway stations are the reliable option in most cities.`,
      },
      {
        q: `How much does luggage storage cost?`,
        a: `Prices are set per operator and are rarely in OpenStreetMap. Expect station lockers to be priced by size and by day.`,
      },
    ],
  },
  {
    category: CATEGORIES.OutdoorGym,
    slug: "outdoor-gyms",
    plural: "outdoor gyms",
    heading: "Outdoor gyms",
    schemaType: "ExerciseGym",
    intro: (city, count) =>
      `${count} outdoor gyms and fitness stations are mapped around ${city}: the free open air equipment in parks and along running routes, including calisthenics frames and trim trails.`,
    faq: (city, count) => [
      {
        q: `Where are the outdoor gyms in ${city}?`,
        a: `The map shows ${count} mapped fitness stations. They are almost always free to use and open at all hours.`,
      },
      {
        q: `What equipment do they have?`,
        a: `It ranges from a couple of pull up bars to a full circuit. Where a contributor recorded the equipment it appears in the point details.`,
      },
    ],
  },
  {
    category: CATEGORIES.TentSite,
    slug: "camp-sites",
    plural: "camp sites",
    heading: "Camp sites",
    schemaType: "Campground",
    intro: (city, count) =>
      `${count} camp sites are mapped around ${city}, from commercial campgrounds to the basic tent pitches that only a local survey would record.`,
    faq: (city, count) => [
      {
        q: `Where can I camp near ${city}?`,
        a: `The map shows ${count} mapped camp sites. Pair them with shelters, drinking water and toilets using the "Camping" preset.`,
      },
      {
        q: `Do I need to book?`,
        a: `Commercial campgrounds usually take bookings and the informal pitches do not. OpenStreetMap rarely records booking policy, so check with the operator.`,
      },
    ],
  },
  {
    category: CATEGORIES.Shelter,
    slug: "shelters",
    plural: "shelters and huts",
    heading: "Shelters and huts",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} shelters, lean tos, wilderness huts and public fireplaces are mapped around ${city}. These are the trailside structures you plan a hike around, and they are close to impossible to find on a commercial map.`,
    faq: (city, count) => [
      {
        q: `Where are the wilderness huts near ${city}?`,
        a: `The map shows ${count} mapped shelters and huts, including lean tos, weather shelters and open wilderness huts.`,
      },
      {
        q: `Are they free to use?`,
        a: `Open wilderness huts and lean tos generally are, on a first come basis. Reservable huts are a separate thing and usually charge.`,
      },
      {
        q: `Can I light a fire?`,
        a: `Points tagged with a fireplace are included here, but regional fire bans override anything a map says. Check local restrictions, particularly in summer.`,
      },
    ],
  },
  {
    category: CATEGORIES.RestArea,
    slug: "rest-areas",
    plural: "rest areas",
    heading: "Rest areas",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} highway rest areas are mapped around ${city}: the laybys and stopping places along main roads, which is where you actually want toilets and a break on a long drive.`,
    faq: (city, count) => [
      {
        q: `Where are the rest areas near ${city}?`,
        a: `The map shows ${count} mapped rest areas. The "Road trip" preset combines them with fuel, charging and toilets, which is the more useful view when driving.`,
      },
      {
        q: `Do rest areas have toilets?`,
        a: `Larger ones usually do, smaller laybys often do not. Turn on the toilets category as well and you can see both layers at once.`,
      },
    ],
  },
  {
    category: CATEGORIES.SanitaryDumpStation,
    slug: "dump-stations",
    plural: "sanitary dump stations",
    heading: "Dump stations",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} sanitary dump stations are mapped around ${city}, where a campervan or motorhome can empty waste tanks. A category almost no mainstream map covers, and a hard requirement if you are living in a van.`,
    faq: (city, count) => [
      {
        q: `Where can I empty a campervan waste tank near ${city}?`,
        a: `The map shows ${count} mapped sanitary dump stations. The "Van life" preset adds drinking water, toilets, parking and recycling alongside them.`,
      },
      {
        q: `Are dump stations free?`,
        a: `Campsite ones usually charge, municipal and fuel station ones are often free or cheap. OpenStreetMap rarely records the fee, so carry change.`,
      },
    ],
  },
];

export const CATEGORY_SEO: CategorySeo[] = CATEGORY_SEO_LIST;

/** Every category page slug, in the order the pages should be linked */
export const CATEGORY_SEO_BY_SLUG: Record<string, CategorySeo> = Object.fromEntries(
  CATEGORY_SEO_LIST.flatMap((entry) => [
    [entry.slug, entry] as const,
    ...(entry.aliases ?? []).map((alias) => [alias, entry] as const),
  ])
);

export const CATEGORY_SEO_BY_CATEGORY: Partial<Record<CATEGORIES, CategorySeo>> =
  Object.fromEntries(CATEGORY_SEO_LIST.map((entry) => [entry.category, entry]));

/**
 * The category of a URL slug. Accepts the aliases too, so links that were
 * indexed under the first sitemap keep working.
 */
export function findCategorySeo(slug: string): CategorySeo | undefined {
  return CATEGORY_SEO_BY_SLUG[slug.toLowerCase()];
}

/**
 * Questions that hold for every category, appended after the specific ones.
 * They carry the OpenStreetMap provenance, which is the honest answer to "how
 * do you know this" and also the reason the coverage is what it is.
 */
export function commonFaq(city: string, categoryPlural: string): FaqEntry[] {
  return [
    {
      q: `Where does this ${categoryPlural} data come from?`,
      a: `From OpenStreetMap, a map built by volunteer surveyors and maintained continuously. It is the best available source for small fixtures like this one, because they are the things commercial map providers do not bother collecting.`,
    },
    {
      q: `Something is missing or wrong. Can I fix it?`,
      a: `Yes, and it is the fastest way to get it corrected. Edit the point on openstreetmap.org and the change flows through to this page on the next refresh. There is no separate database here to correct.`,
    },
    {
      q: `Is the list of ${categoryPlural} in ${city} complete?`,
      a: `It is as complete as the local survey effort. Densely mapped cities are close to exhaustive; elsewhere expect gaps. The map is always the fuller view, since the list on this page only names the points that have a name.`,
    },
  ];
}
