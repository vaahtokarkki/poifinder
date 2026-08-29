/**
 * The English copy deck.
 *
 * Migrated out of seo/categories.ts, where these were arrow functions. They are
 * data now for one reason: a translator, and the tooling that checks a
 * translation has not gone stale, can both work on data and neither can work on
 * code. Placeholders are `{city}` and `{count}`.
 *
 * `intro` and the first FAQ answer of each category carry a `one` form because
 * they name the count, and 163 routes hold exactly one point. The rest are
 * plain strings because their wording does not move with it.
 *
 * American English is not a second deck. It is this copy through the US_TERMS
 * transform in seo/categories.ts, which is the right shape for a difference
 * that is a dozen nouns rather than a language.
 */
import type { CopyDeck } from "./types";

const categories: CopyDeck["categories"] = {
  "toilets": {
    plural: "public toilets",
    singular: "public toilet",
    heading: "Public toilets",
    intro: {
      one: "One public toilet is mapped in and around {city}. Where the data says so, you also get its opening hours, whether there is a fee, and whether it is step free.",
      other: "{count} public toilets are mapped in and around {city}. The list below covers the ones that carry a name in OpenStreetMap; the map shows every one, including the unnamed street toilets and the ones inside parks, stations and shopping centres. Where the data says so, you also get opening hours, whether there is a fee, and whether the toilet is step free.",
    },
    faq: [
      {
        q: "Where can I find a public toilet in {city}?",
        a: {
          one: "Open the map above and it centres on {city} with the one mapped toilet on it. Tap the marker for its exact position, opening hours when known, and walking directions. Allow location access and the map follows you instead, which is the faster route when you are already out.",
          other: "Open the map above and it centres on {city} with all {count} mapped toilets on it. Tap any marker for its exact position, opening hours when known, and walking directions. Allow location access and the map follows you instead, which is the faster route when you are already out.",
        },
      },
      {
        q: "Are public toilets in {city} free?",
        a: "It varies by city and by individual toilet. Where OpenStreetMap records a fee, the point is labelled with it. Station and shopping centre toilets are the ones most likely to charge; municipal street toilets and park toilets are usually free.",
      },
      {
        q: "Are there wheelchair accessible toilets in {city}?",
        a: "Yes. Points tagged as step free in OpenStreetMap show their accessibility in the detail panel. Coverage of this tag is uneven, so an unlabelled toilet is not necessarily inaccessible, it may simply be unsurveyed.",
      },
      {
        q: "Why do some toilets show no opening hours?",
        a: "Opening hours are an optional tag in OpenStreetMap and many contributors map the location without them. A missing value means nobody has surveyed it, not that the toilet is open around the clock.",
      },
    ],
  },
  "drinking-water": {
    plural: "drinking water points",
    singular: "drinking water point",
    heading: "Drinking water",
    intro: {
      one: "One place to refill a bottle is mapped in {city}. Points that are tagged as non potable are filtered out, so what you see is water you can actually drink.",
      other: "{count} places to refill a bottle are mapped in {city}: public drinking fountains, tap points, wells, and fountains where the water is confirmed potable. Points that are tagged as non potable are filtered out, so what you see is water you can actually drink.",
    },
    faq: [
      {
        q: "Where can I refill a water bottle in {city}?",
        a: {
          one: "The map shows the one mapped drinking water point in {city}. Tap the marker for directions.",
          other: "The map shows all {count} mapped drinking water points in {city}, most of them in parks, squares and along walking routes. Tap a marker for directions.",
        },
      },
      {
        q: "Is the tap water in these fountains safe to drink?",
        a: "Every point shown here is tagged in OpenStreetMap as drinking water, and sources explicitly marked as not potable are excluded. Fountains can still be seasonal, so in cold climates expect many to be shut off over winter.",
      },
      {
        q: "Are drinking fountains in {city} open all year?",
        a: "In cities with freezing winters, outdoor fountains are usually drained and closed from autumn to spring to stop the pipes bursting. The map does not track the seasonal shutoff, so treat winter results as approximate.",
      },
    ],
  },
  "playgrounds": {
    plural: "playgrounds",
    singular: "playground",
    heading: "Playgrounds",
    intro: {
      one: "One playground is mapped in and around {city}. The map shows it whether or not OpenStreetMap has a name for it.",
      other: "{count} playgrounds are mapped in and around {city}. The list names the ones OpenStreetMap has a name for, usually the larger park playgrounds; the map adds every unnamed neighbourhood one on top of that.",
    },
    faq: [
      {
        q: "How many playgrounds are there in {city}?",
        a: {
          one: "One is currently mapped in OpenStreetMap within the area this page covers. That is an undercount wherever mapping is still thin, which on a count this low is the likely explanation.",
          other: "{count} are currently mapped in OpenStreetMap within the area this page covers. That is close to the real figure in well surveyed cities, and an undercount in places where mapping is still thin.",
        },
      },
      {
        q: "Which playground in {city} is closest to me?",
        a: "Allow location access and the map centres on you, with the nearest playgrounds around it. You can also pair playgrounds with toilets and ice cream using the \"With kids\" preset, which is usually what you actually need on a day out.",
      },
      {
        q: "Do the listings say what equipment a playground has?",
        a: "Only when a contributor surveyed it. OpenStreetMap can record swings, slides, climbing frames and the age range a playground is meant for, but most points carry just the location and sometimes a name.",
      },
    ],
  },
  "parking": {
    plural: "car parks",
    singular: "car park",
    heading: "Parking",
    intro: {
      one: "One car park is mapped in {city}, with private and residents only parking filtered out.",
      other: "{count} car parks and parking areas are mapped in {city}, with private and residents only parking filtered out. That covers street parking areas, surface lots and multi storey garages.",
    },
    faq: [
      {
        q: "Where can I park in {city}?",
        a: {
          one: "The map shows one publicly usable parking area. Points explicitly tagged as private access are excluded, so what is left is parking you can normally drive into.",
          other: "The map shows {count} publicly usable parking areas. Points explicitly tagged as private access are excluded, so what is left is parking you can normally drive into.",
        },
      },
      {
        q: "Does this show parking prices?",
        a: "Only where OpenStreetMap records them, which is a minority of points. Treat the map as a way to find the car parks, then check the price on the sign or the operator's own site.",
      },
      {
        q: "Is free parking marked separately?",
        a: "Where the fee tag exists, it shows in the point details. Uneven coverage means an unlabelled car park could be either, so it is worth checking on arrival.",
      },
    ],
  },
  "charging-stations": {
    plural: "EV charging stations",
    singular: "EV charging station",
    heading: "EV charging stations",
    intro: {
      one: "One electric vehicle charging station is mapped in {city}. OpenStreetMap covers operators that the big proprietary apps often leave out, particularly small municipal and hotel chargers.",
      other: "{count} electric vehicle charging stations are mapped in {city}, from single kerbside points to motorway rapid chargers. OpenStreetMap covers operators that the big proprietary apps often leave out, particularly small municipal and hotel chargers.",
    },
    faq: [
      {
        q: "Where can I charge an electric car in {city}?",
        a: {
          one: "The map shows one mapped charging station. Tap it for its position and whatever the survey recorded about connectors and operator.",
          other: "The map shows {count} mapped charging stations. Tap one for its position and whatever the survey recorded about connectors and operator.",
        },
      },
      {
        q: "Does this show whether a charger is available right now?",
        a: "No. OpenStreetMap is a map of what exists, not a live availability feed. For real time status you still need the operator's own app.",
      },
      {
        q: "Which connector types are shown?",
        a: "Where a contributor recorded them, socket types appear in the point details. Coverage is better for newer and larger installations than for older kerbside points.",
      },
    ],
  },
  "gas-stations": {
    plural: "petrol stations",
    singular: "petrol station",
    heading: "Petrol stations",
    intro: {
      one: "One fuel station is mapped in and around {city}. OpenStreetMap records the unbranded and automated ones that often go missing from brand specific finders.",
      other: "{count} fuel stations are mapped in and around {city}, including the unbranded and automated ones that often go missing from brand specific finders.",
    },
    faq: [
      {
        q: "Where is the nearest petrol station in {city}?",
        a: {
          one: "Allow location access and the map centres on you with the one mapped station on it, or pan to any area and search there.",
          other: "Allow location access and the map centres on you with the nearest of the {count} mapped stations around it, or pan to any area and search there.",
        },
      },
      {
        q: "Are fuel prices shown?",
        a: "No. OpenStreetMap does not carry live pricing, so this is a station finder rather than a price comparison.",
      },
      {
        q: "Can I find stations along a route?",
        a: "Yes. Set a start and a destination with the directions button and the app loads points within 500 m of the route, which is the useful shape for a long drive.",
      },
    ],
  },
  "ice-cream": {
    plural: "ice cream shops",
    singular: "ice cream shop",
    heading: "Ice cream",
    intro: {
      one: "One ice cream shop, gelateria or kiosk is mapped in {city}, covering dedicated shops as well as cafés whose main trade is ice cream.",
      other: "{count} ice cream shops, gelaterias and kiosks are mapped in {city}, covering both dedicated shops and cafés whose main trade is ice cream.",
    },
    faq: [
      {
        q: "Where can I get ice cream in {city}?",
        a: {
          one: "The map shows one mapped spot. Seasonal kiosks are included, so if it is one, expect it to be shut outside summer.",
          other: "The map shows {count} mapped spots. Seasonal kiosks are included, so expect some of them to be shut outside summer.",
        },
      },
      {
        q: "Are opening hours shown?",
        a: "Where OpenStreetMap has them. Ice cream is a strongly seasonal trade and hours change often, so confirm before making a trip.",
      },
    ],
  },
  "dog-parks": {
    plural: "dog parks",
    singular: "dog park",
    heading: "Dog parks",
    intro: {
      one: "One fenced dog park or off leash area is mapped in {city}. These are the enclosures where a dog can run without a lead, as distinct from parks that merely allow dogs.",
      other: "{count} fenced dog parks and off leash areas are mapped in {city}. These are the enclosures where a dog can run without a lead, as distinct from parks that merely allow dogs.",
    },
    faq: [
      {
        q: "Where can I let my dog off the lead in {city}?",
        a: {
          one: "The map shows one mapped dog park or off leash area. Pair it with drinking water and toilets using the \"Dog walk\" preset for a full walk route.",
          other: "The map shows {count} mapped dog parks and off leash areas. Pair them with drinking water and toilets using the \"Dog walk\" preset for a full walk route.",
        },
      },
      {
        q: "Are these areas fenced?",
        a: "Most points tagged as dog parks are enclosed, but OpenStreetMap does not always record the fence separately. Check on arrival if your dog needs a secure boundary.",
      },
    ],
  },
  "picnic-spots": {
    plural: "picnic spots",
    singular: "picnic spot",
    heading: "Picnic spots",
    intro: {
      one: "One picnic spot is mapped around {city}, which may be a single table by a path or a laid out picnic site with several tables and a fireplace.",
      other: "{count} picnic spots are mapped around {city}, from a single table by a path to a laid out picnic site with several tables and a fireplace.",
    },
    faq: [
      {
        q: "Where can I have a picnic in {city}?",
        a: {
          one: "The map shows one mapped picnic table or picnic site, most likely in a park or along a walking or cycling route.",
          other: "The map shows {count} mapped picnic tables and picnic sites, most of them in parks and along walking and cycling routes.",
        },
      },
      {
        q: "Do picnic sites have barbecue facilities?",
        a: "Some do, and where a contributor recorded a fireplace or barbecue it shows in the point details. Check local fire restrictions before lighting anything.",
      },
    ],
  },
  "viewpoints": {
    plural: "viewpoints",
    singular: "viewpoint",
    heading: "Viewpoints",
    intro: {
      one: "One viewpoint is mapped around {city}: a marked spot where the view is the point, whether an observation tower, a terrace, a bird hide or an unmarked ridge somebody surveyed.",
      other: "{count} viewpoints are mapped around {city}: the marked spots where the view is the point, from observation towers and terraces to bird hides and unmarked ridges that locals have surveyed.",
    },
    faq: [
      {
        q: "What are the best viewpoints in {city}?",
        a: {
          one: "The map shows one mapped viewpoint. OpenStreetMap does not rank them, so the value here is finding the ones no guidebook lists rather than the famous terrace everyone already knows.",
          other: "The map shows {count} mapped viewpoints. OpenStreetMap does not rank them, so the value here is finding the ones no guidebook lists rather than the famous terrace everyone already knows.",
        },
      },
      {
        q: "Are these viewpoints free to visit?",
        a: "Most outdoor viewpoints are, but towers and observation decks often charge. Where the fee tag exists it shows in the details.",
      },
    ],
  },
  "beaches": {
    plural: "beaches and swimming spots",
    singular: "beach or swimming spot",
    heading: "Beaches and swimming",
    intro: {
      one: "One beach or designated swimming area is mapped around {city}, covering lake and river swimming spots as well as coastline.",
      other: "{count} beaches and designated swimming areas are mapped around {city}, covering lake and river swimming spots as well as coastline.",
    },
    faq: [
      {
        q: "Where can I swim in {city}?",
        a: {
          one: "The map shows one mapped beach or swimming area. Pair it with toilets, parking and ice cream using the \"Beach day\" preset.",
          other: "The map shows {count} mapped beaches and swimming areas. Pair them with toilets, parking and ice cream using the \"Beach day\" preset.",
        },
      },
      {
        q: "Is the water quality shown?",
        a: "No. Water quality is monitored by local authorities and changes through the season, so check their current advisories before swimming.",
      },
      {
        q: "Are these beaches supervised?",
        a: "OpenStreetMap sometimes records a lifeguard, but coverage is patchy. Assume a beach is unsupervised unless you can see otherwise on site.",
      },
    ],
  },
  "atms": {
    plural: "ATMs",
    singular: "ATM",
    heading: "ATMs",
    intro: {
      one: "One cash machine is mapped in {city}, whether standalone or inside a bank or a shop.",
      other: "{count} cash machines are mapped in {city}, both standalone ATMs and the ones inside banks and shops.",
    },
    faq: [
      {
        q: "Where is the nearest ATM in {city}?",
        a: {
          one: "Allow location access and the map centres on you with the one mapped machine on it.",
          other: "Allow location access and the map centres on you with the closest of the {count} mapped machines around it.",
        },
      },
      {
        q: "Do these ATMs charge a fee?",
        a: "Where OpenStreetMap records a fee it shows in the details, but coverage is thin. Independent machines in tourist areas are the ones most likely to charge.",
      },
    ],
  },
  "post-boxes": {
    plural: "post boxes",
    singular: "post box",
    heading: "Post boxes",
    intro: {
      one: "One post box is mapped in {city}. Street letter boxes are exactly the kind of small fixture that general purpose map apps skip and OpenStreetMap surveys thoroughly.",
      other: "{count} post boxes are mapped in {city}. Street letter boxes are exactly the kind of small fixture that general purpose map apps skip and OpenStreetMap surveys thoroughly.",
    },
    faq: [
      {
        q: "Where is the nearest post box in {city}?",
        a: {
          one: "The map shows the one mapped box. This is one of the categories where OpenStreetMap is clearly the better source, since mainstream map apps rarely carry individual letter boxes at all.",
          other: "The map shows all {count} mapped boxes. This is one of the categories where OpenStreetMap is clearly the better source, since mainstream map apps rarely carry individual letter boxes at all.",
        },
      },
      {
        q: "Are collection times shown?",
        a: "Occasionally. Where a contributor surveyed the collection schedule it appears in the point details, but most boxes carry only their location.",
      },
    ],
  },
  "recycling": {
    plural: "recycling points",
    singular: "recycling point",
    heading: "Recycling",
    intro: {
      one: "One recycling point is mapped in {city}, which may be a single glass bank on a street corner or a full recycling centre.",
      other: "{count} recycling points are mapped in {city}, from a single glass bank on a street corner to a full recycling centre.",
    },
    faq: [
      {
        q: "Where can I recycle in {city}?",
        a: {
          one: "The map shows one mapped recycling point. Tap it to see which materials the survey recorded.",
          other: "The map shows {count} mapped recycling points. Tap one to see which materials the survey recorded.",
        },
      },
      {
        q: "Which materials are accepted?",
        a: "OpenStreetMap records accepted materials per point, so glass, paper, plastic and clothing banks are often distinguishable. Coverage of the detail varies by country.",
      },
    ],
  },
  "luggage-storage": {
    plural: "luggage storage points",
    singular: "luggage storage point",
    heading: "Luggage storage",
    intro: {
      one: "One luggage locker or left luggage office is mapped in {city}, most likely at a station, airport or transport hub. Useful on the day you check out but your train is not until evening.",
      other: "{count} luggage lockers and left luggage offices are mapped in {city}, mostly at stations, airports and transport hubs. Useful on the day you check out but your train is not until evening.",
    },
    faq: [
      {
        q: "Where can I leave my bags in {city}?",
        a: {
          one: "The map shows one mapped locker bank or left luggage counter. Main railway stations are the reliable option in most cities.",
          other: "The map shows {count} mapped locker banks and left luggage counters. Main railway stations are the reliable option in most cities.",
        },
      },
      {
        q: "How much does luggage storage cost?",
        a: "Prices are set per operator and are rarely in OpenStreetMap. Expect station lockers to be priced by size and by day.",
      },
    ],
  },
  "libraries": {
    plural: "libraries",
    singular: "library",
    heading: "Libraries",
    intro: {
      one: "One library is mapped in {city}, which may be the main city library, a branch, a mobile library stop or a street bookcase where books are swapped for free. Where the data says so, you also get opening hours and whether the building is step free.",
      other: "{count} libraries are mapped in {city}, from the main city library to branch libraries, mobile library stops and the street bookcases where books are swapped for free. Where the data says so, you also get opening hours and whether the building is step free.",
    },
    faq: [
      {
        q: "Where is the nearest library in {city}?",
        a: {
          one: "Allow location access and the map centres on you with the one mapped library on it, or pan to any area and search there. Tap the marker for its position, opening hours when known, and walking directions.",
          other: "Allow location access and the map centres on you with the closest of the {count} mapped libraries around it, or pan to any area and search there. Tap a marker for its position, opening hours when known, and walking directions.",
        },
      },
      {
        q: "Are the libraries in {city} free to use?",
        a: "Public libraries normally are, both for reading on site and for using the toilets, wifi and workspace. Borrowing usually needs a library card, which is typically free for residents.",
      },
      {
        q: "Are opening hours shown?",
        a: "Where OpenStreetMap has them. Branch libraries often keep shorter and more variable hours than the main library, and some have self service hours outside staffed times, so confirm before a special trip.",
      },
      {
        q: "What is a public bookcase?",
        a: "A street cabinet or shelf where anyone can take a book and leave one, sometimes called a little free library. They are included here alongside proper libraries, and they are the kind of small fixture only OpenStreetMap bothers to map.",
      },
    ],
  },
  "outdoor-gyms": {
    plural: "outdoor gyms",
    singular: "outdoor gym",
    heading: "Outdoor gyms",
    intro: {
      one: "One outdoor gym or fitness station is mapped around {city}: free open air equipment in a park or along a running route, which may be a calisthenics frame or a trim trail.",
      other: "{count} outdoor gyms and fitness stations are mapped around {city}: the free open air equipment in parks and along running routes, including calisthenics frames and trim trails.",
    },
    faq: [
      {
        q: "Where are the outdoor gyms in {city}?",
        a: {
          one: "The map shows one mapped fitness station. They are almost always free to use and open at all hours.",
          other: "The map shows {count} mapped fitness stations. They are almost always free to use and open at all hours.",
        },
      },
      {
        q: "What equipment do they have?",
        a: "It ranges from a couple of pull up bars to a full circuit. Where a contributor recorded the equipment it appears in the point details.",
      },
    ],
  },
  "camp-sites": {
    plural: "camp sites",
    singular: "camp site",
    heading: "Camp sites",
    intro: {
      one: "One camp or caravan site is mapped around {city}, which may be a commercial campground, a motorhome stop, or a basic tent pitch that only a local survey would record.",
      other: "{count} camp and caravan sites are mapped around {city}, from commercial campgrounds and motorhome stops to the basic tent pitches that only a local survey would record.",
    },
    faq: [
      {
        q: "Where can I camp near {city}?",
        a: {
          one: "The map shows one mapped camp or caravan site. Pair it with shelters, drinking water and toilets using the \"Camping\" preset.",
          other: "The map shows {count} mapped camp and caravan sites. Pair them with shelters, drinking water and toilets using the \"Camping\" preset.",
        },
      },
      {
        q: "Are motorhome and caravan sites included?",
        a: "Yes. Sites tagged for caravans are shown alongside the tent ones, which is the difference between arriving somewhere you can park a van and arriving at a field. The \"Van life\" preset adds dump stations, water and showers on top.",
      },
      {
        q: "Do I need to book?",
        a: "Commercial campgrounds usually take bookings and the informal pitches do not. OpenStreetMap rarely records booking policy, so check with the operator.",
      },
    ],
  },
  "shelters": {
    plural: "shelters and huts",
    singular: "shelter",
    heading: "Shelters and huts",
    intro: {
      one: "One shelter, lean to, wilderness hut or alpine hut is mapped around {city}. These are the trailside structures you plan a hike around, and they are close to impossible to find on a commercial map.",
      other: "{count} shelters, lean tos, wilderness huts and alpine huts are mapped around {city}. These are the trailside structures you plan a hike around, and they are close to impossible to find on a commercial map.",
    },
    faq: [
      {
        q: "Where are the wilderness huts near {city}?",
        a: {
          one: "The map shows one mapped shelter or hut, which may be a lean to, a weather shelter, an open wilderness hut or an alpine hut.",
          other: "The map shows {count} mapped shelters and huts, including lean tos, weather shelters, open wilderness huts and alpine huts.",
        },
      },
      {
        q: "Are they free to use?",
        a: "Open wilderness huts and lean tos generally are, on a first come basis. Alpine and reservable huts are a separate thing and usually charge.",
      },
      {
        q: "Can I light a fire?",
        a: "Fireplaces and barbecue spots have their own category now, so turn that on as well: many shelters have one beside them, but plenty stand alone. Regional fire bans override anything a map says, so check local restrictions, particularly in summer.",
      },
      {
        q: "Why are bus stop shelters not included?",
        a: "Because a shelter is only useful here if you know what it is. Points that record their type as a hut, lean to, picnic or weather shelter are shown; the untyped ones, which in towns are mostly bus stops, are left out.",
      },
    ],
  },
  "rest-areas": {
    plural: "rest areas",
    singular: "rest area",
    heading: "Rest areas",
    intro: {
      one: "One rest area is mapped around {city}: a layby, a stopping place along a main road, or a full service area with fuel and a building, which is where you actually want toilets and a break on a long drive.",
      other: "{count} rest areas and motorway services are mapped around {city}: the laybys and stopping places along main roads, and the full service areas with fuel and a building, which is where you actually want toilets and a break on a long drive.",
    },
    faq: [
      {
        q: "Where are the rest areas near {city}?",
        a: {
          one: "The map shows one mapped rest area. The \"Road trip\" preset combines it with fuel, charging and toilets, which is the more useful view when driving.",
          other: "The map shows {count} mapped rest areas and service areas. The \"Road trip\" preset combines them with fuel, charging and toilets, which is the more useful view when driving.",
        },
      },
      {
        q: "What is the difference between a rest area and services?",
        a: "A rest area is usually a layby with parking and maybe a toilet block. Services is the larger stop with a fuel station, food and staffed facilities. Both are shown here, because at hour four of a drive you want whichever comes first.",
      },
      {
        q: "Do rest areas have toilets?",
        a: "Larger ones and service areas usually do, smaller laybys often do not. Turn on the toilets category as well and you can see both layers at once.",
      },
    ],
  },
  "dump-stations": {
    plural: "sanitary dump stations",
    singular: "sanitary dump station",
    heading: "Dump stations",
    intro: {
      one: "One sanitary dump station is mapped around {city}, where a campervan or motorhome can empty waste tanks. A category almost no mainstream map covers, and a hard requirement if you are living in a van.",
      other: "{count} sanitary dump stations are mapped around {city}, where a campervan or motorhome can empty waste tanks. A category almost no mainstream map covers, and a hard requirement if you are living in a van.",
    },
    faq: [
      {
        q: "Where can I empty a campervan waste tank near {city}?",
        a: {
          one: "The map shows one mapped sanitary dump station. The \"Van life\" preset adds drinking water, toilets, parking and recycling alongside it.",
          other: "The map shows {count} mapped sanitary dump stations. The \"Van life\" preset adds drinking water, toilets, parking and recycling alongside them.",
        },
      },
      {
        q: "Are dump stations free?",
        a: "Campsite ones usually charge, municipal and fuel station ones are often free or cheap. OpenStreetMap rarely records the fee, so carry change.",
      },
    ],
  },
  "post-offices": {
    plural: "post offices",
    singular: "post office",
    heading: "Post offices",
    intro: {
      one: "One post office is mapped in {city}, which may be a counter inside a supermarket or kiosk that carries the postal service without looking like a post office from the street. Where the data says so, you also get opening hours and whether the entrance is step free.",
      other: "{count} post offices are mapped in {city}, including the counters inside supermarkets and kiosks that carry the postal service without looking like a post office from the street. Where the data says so, you also get opening hours and whether the entrance is step free.",
    },
    faq: [
      {
        q: "Where is the nearest post office in {city}?",
        a: {
          one: "The map shows one mapped post office. Allow location access and it centres on you with it nearby. Tap the marker for opening hours, when a contributor recorded them, and walking directions.",
          other: "The map shows {count} mapped post offices. Allow location access and it centres on you with the closest ones around it. Tap a marker for opening hours, when a contributor recorded them, and walking directions.",
        },
      },
      {
        q: "How is this different from the post boxes category?",
        a: "A post box is a slot in a wall for letters you have already stamped, and there are far more of them. A post office is a staffed counter where you can weigh a parcel, buy postage and collect something. They are separate categories here because they answer different errands.",
      },
      {
        q: "Are post office opening hours reliable?",
        a: "Treat them as a guide. Hours are an optional tag, counters inside shops often follow the shop's hours rather than their own, and neither updates the moment an operator changes them. Check before a special trip.",
      },
    ],
  },
  "showers": {
    plural: "public showers",
    singular: "public shower",
    heading: "Showers",
    intro: {
      one: "One public shower is mapped in and around {city}: at a beach or lido, a campsite or marina, or in a sports facility that lets anyone in. A category almost no mainstream map bothers with, and the one you want after a long drive or a swim.",
      other: "{count} public showers are mapped in and around {city}: the ones at beaches and lidos, at campsites and marinas, and in the sports facilities that let anyone in. A category almost no mainstream map bothers with, and the one you want after a long drive or a swim.",
    },
    faq: [
      {
        q: "Where can I take a shower in {city}?",
        a: {
          one: "The map shows one mapped shower. Beach and pool showers are usually cold and open air, while campsite and marina ones are enclosed and often heated, so it is worth tapping the marker before making the trip.",
          other: "The map shows {count} mapped showers. Beach and pool showers are usually cold and open air, while campsite and marina ones are enclosed and often heated, so it is worth tapping the marker before making the trip.",
        },
      },
      {
        q: "Are they free?",
        a: "Beach rinse showers normally are. Campsite, marina and station showers usually charge, sometimes by coin or token. OpenStreetMap records the fee only some of the time, so carry change.",
      },
      {
        q: "Can I shower if I am travelling in a van?",
        a: "Campsites and marinas are the reliable options, and both are on this map alongside dump stations and drinking water in the \"Van life\" preset. Some fuel stations along motorways also have showers for drivers.",
      },
    ],
  },
  "fireplaces": {
    plural: "fireplaces and barbecue spots",
    singular: "fireplace or barbecue spot",
    heading: "Fireplaces and BBQ spots",
    intro: {
      one: "One public fireplace or barbecue spot is mapped around {city}: a fire ring at a hiking shelter, a built grill in a park, or a maintained cooking spot along a trail. These are exactly the fixtures a local survey records and a commercial map never does.",
      other: "{count} public fireplaces and barbecue spots are mapped around {city}: the fire rings at hiking shelters, the built grills in parks, and the maintained cooking spots along trails. These are exactly the fixtures a local survey records and a commercial map never does.",
    },
    faq: [
      {
        q: "Where can I grill or make a fire near {city}?",
        a: {
          one: "The map shows one mapped fireplace or barbecue spot. It may sit beside a shelter or a picnic site, so turning those categories on too gives you the whole stopping place rather than just the fire ring.",
          other: "The map shows {count} mapped fireplaces and barbecue spots. Many sit beside a shelter or a picnic site, so turning those categories on too gives you the whole stopping place rather than just the fire ring.",
        },
      },
      {
        q: "Am I allowed to light a fire there?",
        a: "A mapped fireplace means the structure exists, not that a fire is legal today. Regional fire bans in dry weather override everything, and in some countries they are announced daily. Check the local restriction before you strike a match.",
      },
      {
        q: "Is firewood provided?",
        a: "At maintained wilderness sites in the Nordics and the Alps it often is, in a woodshed beside the fireplace. Elsewhere assume not. OpenStreetMap rarely records it either way.",
      },
    ],
  },
  "compressed-air": {
    plural: "compressed air points",
    singular: "compressed air point",
    heading: "Compressed air",
    intro: {
      one: "One place to inflate a tyre is mapped in {city}: a compressed air point at a fuel station or car park, or a public pump a cyclist can use. Usually free, usually unsigned, and near impossible to search for anywhere else.",
      other: "{count} places to inflate a tyre are mapped in {city}: the compressed air points at fuel stations and car parks, and the public pumps cyclists can use. Usually free, usually unsigned, and near impossible to search for anywhere else.",
    },
    faq: [
      {
        q: "Where can I pump up a tyre in {city}?",
        a: {
          one: "The map shows one mapped air point. Most are at fuel stations, tucked at the edge of the forecourt where the sign is easy to miss from the road.",
          other: "The map shows {count} mapped air points. Most are at fuel stations, tucked at the edge of the forecourt where the sign is easy to miss from the road.",
        },
      },
      {
        q: "Do they work for bicycles?",
        a: "Many forecourt units have a Presta or Schrader adapter and plenty of cyclists use them, but the pressure gauges are made for cars and read poorly at road bike pressures. Dedicated bicycle pumps are tagged separately in OpenStreetMap and are not all included here.",
      },
      {
        q: "Are they free?",
        a: "Often, though some are coin operated or need a purchase at the till. Where OpenStreetMap records a fee it shows in the point details.",
      },
    ],
  },
  "benches": {
    plural: "benches",
    singular: "bench",
    heading: "Benches",
    intro: {
      one: "One public bench is mapped in {city}. If you are walking with a bad knee, a small child or a heavy bag, knowing where the next place to sit down is changes the route you take.",
      other: "{count} public benches are mapped in {city}. It is the largest category here and the most quietly useful one: if you are walking with a bad knee, a small child or a heavy bag, knowing where the next place to sit down is changes the route you take.",
    },
    faq: [
      {
        q: "Where are the benches in {city}?",
        a: {
          one: "The map shows the one mapped bench. Parks, promenades and bus stops are where they concentrate.",
          other: "The map shows {count} mapped benches, clustered until you zoom in far enough for them to separate. Parks, promenades and bus stops are where they concentrate.",
        },
      },
      {
        q: "Is every bench in {city} on the map?",
        a: "No. Benches are mapped by whoever walked past and cared, so coverage swings hard between neighbourhoods: a well surveyed park can have every one recorded while the next street over has none. Absence here is weaker evidence than in any other category.",
      },
      {
        q: "Does it say whether a bench has a backrest?",
        a: "Sometimes. OpenStreetMap can record a backrest, the material and how many people fit, and surveyors who map benches deliberately tend to add them. Where they exist, they show in the point details.",
      },
    ],
  },
};

const commonFaq: CopyDeck["commonFaq"] = [
  {
    q: "Where does this {plural} data come from?",
    a: "From OpenStreetMap, a map built by volunteer surveyors and maintained continuously. It is the best available source for small fixtures like this one, because they are the things commercial map providers do not bother collecting.",
  },
  {
    q: "Something is missing or wrong. Can I fix it?",
    a: "Yes, and it is the fastest way to get it corrected. Edit the point on openstreetmap.org and the change flows through to this page on the next refresh. There is no separate database here to correct.",
  },
  {
    q: "Is the list of {plural} in {city} complete?",
    a: "It is as complete as the local survey effort. Densely mapped cities are close to exhaustive; elsewhere expect gaps. The map is always the fuller view, since the list on this page only names the points that have a name.",
  },
];

const ui: CopyDeck["ui"] = {
  categoryNames: {
    toilets: "Toilets",
    "drinking-water": "Drinking water",
    playgrounds: "Playgrounds",
    parking: "Parking",
    "charging-stations": "Charging stations",
    "gas-stations": "Gas stations",
    "ice-cream": "Ice cream",
    "dog-parks": "Dog park",
    "picnic-spots": "Picnic spots",
    viewpoints: "Viewpoints",
    beaches: "Beach & swimming",
    atms: "ATM",
    "post-boxes": "Post boxes",
    recycling: "Recycling",
    "luggage-storage": "Luggage storage",
    libraries: "Libraries",
    "outdoor-gyms": "Outdoor gym",
    "camp-sites": "Camp site",
    shelters: "Shelter",
    "rest-areas": "Rest area",
    "dump-stations": "Dump station",
    "post-offices": "Post offices",
    showers: "Showers",
    fireplaces: "Fireplaces & BBQ",
    "compressed-air": "Compressed air",
    benches: "Benches",
  },

  groups: {
    essentials: "Essentials",
    car: "Car",
    food: "Food",
    nature: "Nature",
  },

  presets: {
    family: "Family",
    "road-trip": "Road trip",
    camping: "Camping",
    "van-life": "Van life",
    outdoors: "Outdoors",
    "dog-walk": "Dog walk",
    errands: "Errands",
  },

  sheet: {
    summary:
      "Wayside maps the small things that are hard to find when you are out: toilets, playgrounds, drinking water, parking etc. Pick a preset or your own categories, and search any area of the map.",
    howItWorksHeading: "How it works",
    steps: [
      {
        title: "Pick what you need",
        text: "Use a ready made preset such as Family or Road trip, or choose the categories yourself.",
      },
      {
        title: "Move the map",
        text: "Pan or zoom anywhere and the points of the new view load on their own, as soon as the map settles.",
      },
      {
        title: "Open a point",
        text: "Tap a marker for its details, opening hours when known, and directions.",
      },
    ],
    presetsHeading: "Presets",
    presetsNote: "Not what you are after? The picker has every category on its own.",
    goodToKnowHeading: "Good to know",
    tips: [
      "Search for a city or an address with the search button.",
      "Follow a route: set a start and a destination to see the points along the way.",
      "Share the current view, categories included, with the share button.",
    ],
    creditsSourceBefore: "Points come from",
    creditsSourceLink: "OpenStreetMap",
    creditsSourceAfter: "contributors. Something missing? Add it there and it shows up here.",
    creditsCodeBefore: "Wayside is open source:",
    creditsCodeLink: "the code is on GitHub",
    creditsCodeAfter: ".",
  },

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
    viewInThisLanguage: "This page in English",
    categoryTitle: "{noun} in {city} — {count} on the map | {site}",
    categoryDescription:
      "{count} {noun} in {city} on one map, with opening hours, fees and accessibility where OpenStreetMap has them. Free to use, no signup, works on your phone.",
    categoryHeading: "{noun} in {city}",
    moreInCity: "More in {city}",
    nearbyHeading: "{noun} nearby",
    cityDisclosure: "Categories and nearby cities in {city}",
    categoryDisclosure: "List of {noun} in {city}",
    listHeading: "{qualifier} {noun} in {city}",
    citySummary: "{count} mapped points across {categories} {unit} in {city}, {country}.",
    cityFallbackTitle: "Points of interest in {city} | {site}",
    cityDescription: "{count} mapped points in {city}: {named}{more}, on one map built from OpenStreetMap. The small things that are hard to look up anywhere else.",
    cityDescriptionMore: " and {rest} more categories",
    sheetFreshnessBefore: "Counts and names above are from the extract of",
    sheetFreshnessAfter: ". The map itself is live.",
    pageFreshnessBefore: "Points come from",
    pageFreshnessLink: "OpenStreetMap",
    pageFreshnessMiddle: "contributors, last refreshed",
    pageFreshnessAfter: ". Something missing? Add it there and it shows up here on the next refresh.",
  },

  poi: {
    stepFree: "Step free",
    partlyStepFree: "Partly step free",
    free: "Free",
    fee: "Fee",
    unnamedPlace: "Unnamed place",
    inPlace: "{noun} in {place}",
    onStreet: "{noun} on {street}",
    noExtraDetails: "{name} — no extra details",
    address: "Address",
    fromBuilding: "From this building",
    lastChecked: "Last checked",
    lastEdited: "Last edited",
    editInOsm: "Edit this point in OpenStreetMap",
    hours: {
      Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun",
      PH: "public holidays", SH: "school holidays", closed: "closed",
    },
    age: {
      withinMonth: "within the last month",
      months: { one: "a month ago", other: "{count} months ago" },
      years: { one: "a year ago", other: "{count} years ago" },
    },
    keyLabels: {
      changing_table: "Baby changing",
      "toilets:disposal": "Toilet type",
      "ramp:wheelchair": "Wheelchair ramp",
      building_levels: "Floors",
      "building:levels": "Floors",
      collection_times: "Emptied",
      "socket:type2": "Type 2 sockets",
      "socket:type2_combo": "CCS sockets",
      "socket:chademo": "CHAdeMO sockets",
      "socket:schuko": "Schuko sockets",
      backrest: "Backrest",
      wikipedia: "Wikipedia",
      wikidata: "Wikidata",
    },
    values: {
      yes: "Yes",
      no: "No",
      limited: "Limited",
      designated: "Designated",
      customers: "Customers only",
      permissive: "Open to the public",
      private: "Private",
      unknown: "Unknown",
      public: "Public",
      only: "Only",
      seasonal: "Seasonal",
      permanent: "Permanent",
      free: "Free",
      none: "None",
    },
    inThisBuilding: "In this building",
    inBuilding: "In {building}",
    buildingLastChecked: "Building last checked",
    buildingLastEdited: "Building last edited",
    editBuildingInOsm: "Edit the building in OpenStreetMap",
  },

  translate: {
    action: "Translate",
    pending: "Translating…",
    showOriginal: "Show original",
    showTranslation: "Show translation",
    sameLanguage: "Already in English",
    quota: "Translation limit reached for today",
    failed: "Translation unavailable",
  },

  controls: {
    about: "About this app",
    closeSearch: "Close search",
    selectCategories: "Select the categories to show on the map",
    zoomInHint: "Zoom in to load new points",
    routeStart: "Your location",
    routeEnd: "Destination location",
    chooseCategories: "Choose categories",
    clearAll: "Clear all selections",
    presetTitle: "Show {preset} points on the map",
    showMapTools: "Show map tools",
    hideMapTools: "Hide map tools",
    myLocation: "Center map to your location",
    share: "Share this view",
    toggleSearch: "Show/hide search bar",
    directions: "Directions",
    language: "Language",
    searchPlaceholder: "Search for location",
    routeHeading: "Search points along route",
    routeSubmit: "Search route",
    routeReset: "Reset route",
    routeActive: "Displaying points along route from {start} to {end}",
    routeYourLocation: "your location",
    typeLocation: "Type a location",
    dragDownToClose: "Drag down to close",
    dragUpForMore: "Drag up for more",
    loading: "Loading…",
    loadingServer: "{server}/{total}",
    loadingFallback: "Our own server is not answering, so this is going through the public ones",
    gpsWaiting: "Waiting for GPS…",
    gpsWaitingHint: "Looking for a satellite fix. The blue dot turns blue once your device knows where it is",
  },

  notices: {
    fetchFailed: "Failed to fetch markers from Overpass API. Please try again.",
    linkCopied: "Link copied to clipboard",
    copyFailed: "Could not copy the link to the clipboard.",
    shareRouteMissing: "Could not get start or end location coordinates.",
    routeFailed: "Failed to fetch route: ",
    fallbackTitle: "Points of interest",
    fallbackSubtitle: "Find the useful places around you",
  },
};

export const en: CopyDeck = { categories, commonFaq, ui };

export default en;
