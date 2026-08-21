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
      `${count} places to refill a bottle are mapped in ${city}: public drinking fountains, tap points, wells, and fountains where the water is confirmed potable. Points that are tagged as non potable are filtered out, so what you see is water you can actually drink.`,
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
      `${count} viewpoints are mapped around ${city}: the marked spots where the view is the point, from observation towers and terraces to bird hides and unmarked ridges that locals have surveyed.`,
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
    category: CATEGORIES.Library,
    slug: "libraries",
    plural: "libraries",
    heading: "Libraries",
    schemaType: "Library",
    intro: (city, count) =>
      `${count} libraries are mapped in ${city}, from the main city library to branch libraries, mobile library stops and the street bookcases where books are swapped for free. Where the data says so, you also get opening hours and whether the building is step free.`,
    faq: (city, count) => [
      {
        q: `Where is the nearest library in ${city}?`,
        a: `Allow location access and the map centres on you with the closest of the ${count} mapped libraries around it, or pan to any area and search there. Tap a marker for its position, opening hours when known, and walking directions.`,
      },
      {
        q: `Are the libraries in ${city} free to use?`,
        a: `Public libraries normally are, both for reading on site and for using the toilets, wifi and workspace. Borrowing usually needs a library card, which is typically free for residents.`,
      },
      {
        q: `Are opening hours shown?`,
        a: `Where OpenStreetMap has them. Branch libraries often keep shorter and more variable hours than the main library, and some have self service hours outside staffed times, so confirm before a special trip.`,
      },
      {
        q: `What is a public bookcase?`,
        a: `A street cabinet or shelf where anyone can take a book and leave one, sometimes called a little free library. They are included here alongside proper libraries, and they are the kind of small fixture only OpenStreetMap bothers to map.`,
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
      `${count} camp and caravan sites are mapped around ${city}, from commercial campgrounds and motorhome stops to the basic tent pitches that only a local survey would record.`,
    faq: (city, count) => [
      {
        q: `Where can I camp near ${city}?`,
        a: `The map shows ${count} mapped camp and caravan sites. Pair them with shelters, drinking water and toilets using the "Camping" preset.`,
      },
      {
        q: `Are motorhome and caravan sites included?`,
        a: `Yes. Sites tagged for caravans are shown alongside the tent ones, which is the difference between arriving somewhere you can park a van and arriving at a field. The "Van life" preset adds dump stations, water and showers on top.`,
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
      `${count} shelters, lean tos, wilderness huts and alpine huts are mapped around ${city}. These are the trailside structures you plan a hike around, and they are close to impossible to find on a commercial map.`,
    faq: (city, count) => [
      {
        q: `Where are the wilderness huts near ${city}?`,
        a: `The map shows ${count} mapped shelters and huts, including lean tos, weather shelters, open wilderness huts and alpine huts.`,
      },
      {
        q: `Are they free to use?`,
        a: `Open wilderness huts and lean tos generally are, on a first come basis. Alpine and reservable huts are a separate thing and usually charge.`,
      },
      {
        q: `Can I light a fire?`,
        a: `Fireplaces and barbecue spots have their own category now, so turn that on as well: many shelters have one beside them, but plenty stand alone. Regional fire bans override anything a map says, so check local restrictions, particularly in summer.`,
      },
      {
        q: `Why are bus stop shelters not included?`,
        a: `Because a shelter is only useful here if you know what it is. Points that record their type as a hut, lean to, picnic or weather shelter are shown; the untyped ones, which in towns are mostly bus stops, are left out.`,
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
      `${count} rest areas and motorway services are mapped around ${city}: the laybys and stopping places along main roads, and the full service areas with fuel and a building, which is where you actually want toilets and a break on a long drive.`,
    faq: (city, count) => [
      {
        q: `Where are the rest areas near ${city}?`,
        a: `The map shows ${count} mapped rest areas and service areas. The "Road trip" preset combines them with fuel, charging and toilets, which is the more useful view when driving.`,
      },
      {
        q: `What is the difference between a rest area and services?`,
        a: `A rest area is usually a layby with parking and maybe a toilet block. Services is the larger stop with a fuel station, food and staffed facilities. Both are shown here, because at hour four of a drive you want whichever comes first.`,
      },
      {
        q: `Do rest areas have toilets?`,
        a: `Larger ones and service areas usually do, smaller laybys often do not. Turn on the toilets category as well and you can see both layers at once.`,
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
  {
    category: CATEGORIES.PostOffice,
    slug: "post-offices",
    plural: "post offices",
    heading: "Post offices",
    schemaType: "PostOffice",
    intro: (city, count) =>
      `${count} post offices are mapped in ${city}, including the counters inside supermarkets and kiosks that carry the postal service without looking like a post office from the street. Where the data says so, you also get opening hours and whether the entrance is step free.`,
    faq: (city, count) => [
      {
        q: `Where is the nearest post office in ${city}?`,
        a: `The map shows ${count} mapped post offices. Allow location access and it centres on you with the closest ones around it. Tap a marker for opening hours, when a contributor recorded them, and walking directions.`,
      },
      {
        q: `How is this different from the post boxes category?`,
        a: `A post box is a slot in a wall for letters you have already stamped, and there are far more of them. A post office is a staffed counter where you can weigh a parcel, buy postage and collect something. They are separate categories here because they answer different errands.`,
      },
      {
        q: `Are post office opening hours reliable?`,
        a: `Treat them as a guide. Hours are an optional tag, counters inside shops often follow the shop's hours rather than their own, and neither updates the moment an operator changes them. Check before a special trip.`,
      },
    ],
  },
  {
    category: CATEGORIES.Shower,
    slug: "showers",
    plural: "public showers",
    heading: "Showers",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} public showers are mapped in and around ${city}: the ones at beaches and lidos, at campsites and marinas, and in the sports facilities that let anyone in. A category almost no mainstream map bothers with, and the one you want after a long drive or a swim.`,
    faq: (city, count) => [
      {
        q: `Where can I take a shower in ${city}?`,
        a: `The map shows ${count} mapped showers. Beach and pool showers are usually cold and open air, while campsite and marina ones are enclosed and often heated, so it is worth tapping the marker before making the trip.`,
      },
      {
        q: `Are they free?`,
        a: `Beach rinse showers normally are. Campsite, marina and station showers usually charge, sometimes by coin or token. OpenStreetMap records the fee only some of the time, so carry change.`,
      },
      {
        q: `Can I shower if I am travelling in a van?`,
        a: `Campsites and marinas are the reliable options, and both are on this map alongside dump stations and drinking water in the "Van life" preset. Some fuel stations along motorways also have showers for drivers.`,
      },
    ],
  },
  {
    category: CATEGORIES.Fireplace,
    slug: "fireplaces",
    plural: "fireplaces and barbecue spots",
    heading: "Fireplaces and BBQ spots",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} public fireplaces and barbecue spots are mapped around ${city}: the fire rings at hiking shelters, the built grills in parks, and the maintained cooking spots along trails. These are exactly the fixtures a local survey records and a commercial map never does.`,
    faq: (city, count) => [
      {
        q: `Where can I grill or make a fire near ${city}?`,
        a: `The map shows ${count} mapped fireplaces and barbecue spots. Many sit beside a shelter or a picnic site, so turning those categories on too gives you the whole stopping place rather than just the fire ring.`,
      },
      {
        q: `Am I allowed to light a fire there?`,
        a: `A mapped fireplace means the structure exists, not that a fire is legal today. Regional fire bans in dry weather override everything, and in some countries they are announced daily. Check the local restriction before you strike a match.`,
      },
      {
        q: `Is firewood provided?`,
        a: `At maintained wilderness sites in the Nordics and the Alps it often is, in a woodshed beside the fireplace. Elsewhere assume not. OpenStreetMap rarely records it either way.`,
      },
    ],
  },
  {
    category: CATEGORIES.CompressedAir,
    slug: "compressed-air",
    plural: "compressed air points",
    heading: "Compressed air",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} places to inflate a tyre are mapped in ${city}: the compressed air points at fuel stations and car parks, and the public pumps cyclists can use. Usually free, usually unsigned, and near impossible to search for anywhere else.`,
    faq: (city, count) => [
      {
        q: `Where can I pump up a tyre in ${city}?`,
        a: `The map shows ${count} mapped air points. Most are at fuel stations, tucked at the edge of the forecourt where the sign is easy to miss from the road.`,
      },
      {
        q: `Do they work for bicycles?`,
        a: `Many forecourt units have a Presta or Schrader adapter and plenty of cyclists use them, but the pressure gauges are made for cars and read poorly at road bike pressures. Dedicated bicycle pumps are tagged separately in OpenStreetMap and are not all included here.`,
      },
      {
        q: `Are they free?`,
        a: `Often, though some are coin operated or need a purchase at the till. Where OpenStreetMap records a fee it shows in the point details.`,
      },
    ],
  },
  {
    category: CATEGORIES.Bench,
    slug: "benches",
    plural: "benches",
    heading: "Benches",
    schemaType: "Place",
    intro: (city, count) =>
      `${count} public benches are mapped in ${city}. It is the largest category here and the most quietly useful one: if you are walking with a bad knee, a small child or a heavy bag, knowing where the next place to sit down is changes the route you take.`,
    faq: (city, count) => [
      {
        q: `Where are the benches in ${city}?`,
        a: `The map shows ${count} mapped benches, clustered until you zoom in far enough for them to separate. Parks, promenades and bus stops are where they concentrate.`,
      },
      {
        q: `Is every bench in ${city} on the map?`,
        a: `No. Benches are mapped by whoever walked past and cared, so coverage swings hard between neighbourhoods: a well surveyed park can have every one recorded while the next street over has none. Absence here is weaker evidence than in any other category.`,
      },
      {
        q: `Does it say whether a bench has a backrest?`,
        a: `Sometimes. OpenStreetMap can record a backrest, the material and how many people fit, and surveyors who map benches deliberately tend to add them. Where they exist, they show in the point details.`,
      },
    ],
  },
];

/**
 * Which English a page is written in.
 *
 * The copy in this file was written in international English throughout, and
 * for most of the list that is simply the neutral choice. For a handful of
 * categories it is the wrong word: the largest single block of cities here is
 * American, and "Petrol stations in Dallas" is not a British spelling of an
 * American page, it is a page about something Dallas does not have. Search
 * bears this out — "gas station" outdraws "petrol station" on this site by
 * more than twenty to one, and every one of those impressions lands on a page
 * that never says the word.
 *
 * Two variants rather than one per country, split along the Americas. Canada
 * is on the American side because "petrol station in Toronto" and "car park in
 * Vancouver" are both wrong there, even though a Canadian would say washroom
 * before restroom. Mexico and South America are there for the same reason
 * twice over: American English is the English taught across Latin America, and
 * the English speaker reading a page about Mexico City is usually North
 * American. Everywhere else says petrol and toilet, and so does the English
 * that non-anglophone European and Asian cities are read in.
 *
 * The genuinely arguable cases are in Asia and none of them are here: Japan,
 * Korea, Taiwan and Thailand teach American English while Hong Kong, Singapore
 * and Malaysia inherited British. That is a real split and a small one — the
 * English search demand for those cities is a fraction of the American — so it
 * is left alone deliberately rather than guessed at.
 */
export type Vocab = "us" | "intl";

const US_VOCAB_COUNTRIES: ReadonlySet<string> = new Set(["US", "CA", "MX", "BR", "AR", "CL"]);

/** The English a city's pages are written in, from its ISO country code */
export function vocabFor(countryCode: string): Vocab {
  return US_VOCAB_COUNTRIES.has(countryCode.toUpperCase()) ? "us" : "intl";
}

/**
 * International to American, as a closed dictionary rather than per-entry
 * overrides.
 *
 * Every one of these is a word the copy above actually uses — the list was
 * built by grepping the file, not by importing a general en-GB/en-US table —
 * which is what keeps a blind string replacement honest. Applied only to copy:
 * slugs, schema.org types and the CATEGORIES enum never pass through here, so
 * `PublicToilet` stays `PublicToilet` and /helsinki/toilets/ keeps its URL.
 *
 * Order is longest match first where two rules could overlap. No replacement
 * contains a word a later rule matches, so a single pass is enough.
 */
const US_TERMS: readonly (readonly [RegExp, string])[] = [
  [/\boff the lead\b/gi, "off leash"],
  [/\bcash machines\b/gi, "ATMs"],
  [/\bcash machine\b/gi, "ATM"],
  [/\bpetrol stations\b/gi, "gas stations"],
  [/\bpetrol station\b/gi, "gas station"],
  [/\bcar parks\b/gi, "parking lots"],
  [/\bcar park\b/gi, "parking lot"],
  [/\bpost boxes\b/gi, "mailboxes"],
  [/\bpost box\b/gi, "mailbox"],
  [/\bletter boxes\b/gi, "mailboxes"],
  [/\bletter box\b/gi, "mailbox"],
  [/\bcamp sites\b/gi, "campgrounds"],
  [/\bcamp site\b/gi, "campground"],
  [/\bcaravans\b/gi, "RVs"],
  [/\bcaravan\b/gi, "RV"],
  [/\btoilets\b/gi, "restrooms"],
  [/\btoilet\b/gi, "restroom"],
  [/\bcentres\b/gi, "centers"],
  [/\bcentre\b/gi, "center"],
  [/\bkerbside\b/gi, "curbside"],
  [/\bkerb\b/gi, "curb"],
  [/\bneighbourhoods\b/gi, "neighborhoods"],
  [/\bneighbourhood\b/gi, "neighborhood"],
  [/\bmulti storey\b/gi, "multi story"],
  [/\btyres\b/gi, "tires"],
  [/\btyre\b/gi, "tire"],
];

/**
 * Carry the source's capitalisation onto the replacement, so a heading keeps
 * its initial capital: "Petrol stations" becomes "Gas stations" and not
 * "gas stations" sitting where an h1 should be. Only the first letter is
 * considered, which is all the copy here ever varies.
 */
function matchCase(source: string, replacement: string): string {
  const first = source.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** Any piece of category copy, in the English the city reads it in */
export function localize(text: string, vocab: Vocab): string {
  if (vocab !== "us") return text;
  return US_TERMS.reduce(
    (out, [pattern, replacement]) =>
      out.replace(pattern, (match) => matchCase(match, replacement)),
    text
  );
}

/** The plural noun as it reads mid sentence, in the city's English */
export function categoryPlural(entry: CategorySeo, vocab: Vocab): string {
  return localize(entry.plural, vocab);
}

/** The sentence case heading noun, in the city's English */
export function categoryHeading(entry: CategorySeo, vocab: Vocab): string {
  return localize(entry.heading, vocab);
}

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
export function commonFaq(city: string, plural: string): FaqEntry[] {
  return [
    {
      q: `Where does this ${plural} data come from?`,
      a: `From OpenStreetMap, a map built by volunteer surveyors and maintained continuously. It is the best available source for small fixtures like this one, because they are the things commercial map providers do not bother collecting.`,
    },
    {
      q: `Something is missing or wrong. Can I fix it?`,
      a: `Yes, and it is the fastest way to get it corrected. Edit the point on openstreetmap.org and the change flows through to this page on the next refresh. There is no separate database here to correct.`,
    },
    {
      q: `Is the list of ${plural} in ${city} complete?`,
      a: `It is as complete as the local survey effort. Densely mapped cities are close to exhaustive; elsewhere expect gaps. The map is always the fuller view, since the list on this page only names the points that have a name.`,
    },
  ];
}
