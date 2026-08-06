/**
 * The cities that get a prerendered page of their own.
 *
 * Coordinates live here rather than being geocoded, for two reasons: the
 * prerender has to run without the network being able to change its output
 * between builds, and a city in the path should center the map immediately
 * instead of waiting for a Photon round trip.
 *
 * Adding a city here is all it takes to put it in the build: the POI refresh,
 * the prerender and the sitemap all read this list.
 */
export type City = {
  /** URL segment, lowercase a-z and dashes */
  slug: string;
  /** Display name, as it should read in a heading */
  name: string;
  country: string;
  /** ISO 3166-1 alpha-2, used for the schema.org address */
  countryCode: string;
  lat: number;
  lon: number;
  /**
   * Radius in metres the prerendered POI list covers. Sprawling cities need a
   * wider net than compact ones, otherwise the count reads as suspiciously low
   */
  radius?: number;
  /**
   * 1 is a city we expect to compete in right away, 3 is a long tail one.
   * Only the sitemap priority reads this, nothing is excluded by tier
   */
  tier: 1 | 2 | 3;
};

/** Radius used when a city does not set one */
export const DEFAULT_CITY_RADIUS = 8000;

export const CITIES: City[] = [
  // ---- Europe: Nordics ----
  { slug: "helsinki", name: "Helsinki", country: "Finland", countryCode: "FI", lat: 60.1699, lon: 24.9384, tier: 1 },
  { slug: "espoo", name: "Espoo", country: "Finland", countryCode: "FI", lat: 60.2055, lon: 24.6559, tier: 3 },
  { slug: "tampere", name: "Tampere", country: "Finland", countryCode: "FI", lat: 61.4978, lon: 23.761, tier: 3 },
  { slug: "turku", name: "Turku", country: "Finland", countryCode: "FI", lat: 60.4518, lon: 22.2666, tier: 3 },
  { slug: "stockholm", name: "Stockholm", country: "Sweden", countryCode: "SE", lat: 59.3293, lon: 18.0686, tier: 1 },
  { slug: "gothenburg", name: "Gothenburg", country: "Sweden", countryCode: "SE", lat: 57.7089, lon: 11.9746, tier: 2 },
  { slug: "malmo", name: "Malmö", country: "Sweden", countryCode: "SE", lat: 55.605, lon: 13.0038, tier: 3 },
  { slug: "oslo", name: "Oslo", country: "Norway", countryCode: "NO", lat: 59.9139, lon: 10.7522, tier: 1 },
  { slug: "bergen", name: "Bergen", country: "Norway", countryCode: "NO", lat: 60.3913, lon: 5.3221, tier: 3 },
  { slug: "copenhagen", name: "Copenhagen", country: "Denmark", countryCode: "DK", lat: 55.6761, lon: 12.5683, tier: 1 },
  { slug: "aarhus", name: "Aarhus", country: "Denmark", countryCode: "DK", lat: 56.1629, lon: 10.2039, tier: 3 },
  { slug: "reykjavik", name: "Reykjavík", country: "Iceland", countryCode: "IS", lat: 64.1466, lon: -21.9426, tier: 2 },

  // ---- Europe: Baltics and Central ----
  { slug: "tallinn", name: "Tallinn", country: "Estonia", countryCode: "EE", lat: 59.437, lon: 24.7536, tier: 2 },
  { slug: "riga", name: "Riga", country: "Latvia", countryCode: "LV", lat: 56.9496, lon: 24.1052, tier: 3 },
  { slug: "vilnius", name: "Vilnius", country: "Lithuania", countryCode: "LT", lat: 54.6872, lon: 25.2797, tier: 3 },
  { slug: "warsaw", name: "Warsaw", country: "Poland", countryCode: "PL", lat: 52.2297, lon: 21.0122, tier: 2 },
  { slug: "krakow", name: "Kraków", country: "Poland", countryCode: "PL", lat: 50.0647, lon: 19.945, tier: 2 },
  { slug: "prague", name: "Prague", country: "Czechia", countryCode: "CZ", lat: 50.0755, lon: 14.4378, tier: 1 },
  { slug: "budapest", name: "Budapest", country: "Hungary", countryCode: "HU", lat: 47.4979, lon: 19.0402, tier: 1 },
  { slug: "bratislava", name: "Bratislava", country: "Slovakia", countryCode: "SK", lat: 48.1486, lon: 17.1077, tier: 3 },
  { slug: "ljubljana", name: "Ljubljana", country: "Slovenia", countryCode: "SI", lat: 46.0569, lon: 14.5058, tier: 3 },
  { slug: "zagreb", name: "Zagreb", country: "Croatia", countryCode: "HR", lat: 45.815, lon: 15.9819, tier: 3 },
  { slug: "bucharest", name: "Bucharest", country: "Romania", countryCode: "RO", lat: 44.4268, lon: 26.1025, tier: 3 },
  { slug: "sofia", name: "Sofia", country: "Bulgaria", countryCode: "BG", lat: 42.6977, lon: 23.3219, tier: 3 },
  { slug: "athens", name: "Athens", country: "Greece", countryCode: "GR", lat: 37.9838, lon: 23.7275, tier: 2 },

  // ---- Europe: German speaking ----
  { slug: "berlin", name: "Berlin", country: "Germany", countryCode: "DE", lat: 52.52, lon: 13.405, radius: 12000, tier: 1 },
  { slug: "munich", name: "Munich", country: "Germany", countryCode: "DE", lat: 48.1351, lon: 11.582, tier: 1 },
  { slug: "hamburg", name: "Hamburg", country: "Germany", countryCode: "DE", lat: 53.5511, lon: 9.9937, tier: 2 },
  { slug: "cologne", name: "Cologne", country: "Germany", countryCode: "DE", lat: 50.9375, lon: 6.9603, tier: 2 },
  { slug: "frankfurt", name: "Frankfurt", country: "Germany", countryCode: "DE", lat: 50.1109, lon: 8.6821, tier: 2 },
  { slug: "stuttgart", name: "Stuttgart", country: "Germany", countryCode: "DE", lat: 48.7758, lon: 9.1829, tier: 3 },
  { slug: "dusseldorf", name: "Düsseldorf", country: "Germany", countryCode: "DE", lat: 51.2277, lon: 6.7735, tier: 3 },
  { slug: "vienna", name: "Vienna", country: "Austria", countryCode: "AT", lat: 48.2082, lon: 16.3738, tier: 1 },
  { slug: "salzburg", name: "Salzburg", country: "Austria", countryCode: "AT", lat: 47.8095, lon: 13.055, tier: 3 },
  { slug: "zurich", name: "Zurich", country: "Switzerland", countryCode: "CH", lat: 47.3769, lon: 8.5417, tier: 1 },
  { slug: "geneva", name: "Geneva", country: "Switzerland", countryCode: "CH", lat: 46.2044, lon: 6.1432, tier: 2 },
  { slug: "basel", name: "Basel", country: "Switzerland", countryCode: "CH", lat: 47.5596, lon: 7.5886, tier: 3 },
  { slug: "bern", name: "Bern", country: "Switzerland", countryCode: "CH", lat: 46.948, lon: 7.4474, tier: 3 },

  // ---- Europe: Low Countries ----
  { slug: "amsterdam", name: "Amsterdam", country: "Netherlands", countryCode: "NL", lat: 52.3676, lon: 4.9041, tier: 1 },
  { slug: "rotterdam", name: "Rotterdam", country: "Netherlands", countryCode: "NL", lat: 51.9244, lon: 4.4777, tier: 2 },
  { slug: "utrecht", name: "Utrecht", country: "Netherlands", countryCode: "NL", lat: 52.0907, lon: 5.1214, tier: 3 },
  { slug: "the-hague", name: "The Hague", country: "Netherlands", countryCode: "NL", lat: 52.0705, lon: 4.3007, tier: 3 },
  { slug: "brussels", name: "Brussels", country: "Belgium", countryCode: "BE", lat: 50.8476, lon: 4.3572, tier: 1 },
  { slug: "antwerp", name: "Antwerp", country: "Belgium", countryCode: "BE", lat: 51.2194, lon: 4.4025, tier: 3 },
  { slug: "ghent", name: "Ghent", country: "Belgium", countryCode: "BE", lat: 51.0543, lon: 3.7174, tier: 3 },
  { slug: "luxembourg", name: "Luxembourg", country: "Luxembourg", countryCode: "LU", lat: 49.6116, lon: 6.1319, tier: 3 },

  // ---- Europe: British Isles ----
  { slug: "london", name: "London", country: "United Kingdom", countryCode: "GB", lat: 51.5074, lon: -0.1278, radius: 12000, tier: 1 },
  { slug: "manchester", name: "Manchester", country: "United Kingdom", countryCode: "GB", lat: 53.4808, lon: -2.2426, tier: 2 },
  { slug: "birmingham", name: "Birmingham", country: "United Kingdom", countryCode: "GB", lat: 52.4862, lon: -1.8904, tier: 2 },
  { slug: "edinburgh", name: "Edinburgh", country: "United Kingdom", countryCode: "GB", lat: 55.9533, lon: -3.1883, tier: 1 },
  { slug: "glasgow", name: "Glasgow", country: "United Kingdom", countryCode: "GB", lat: 55.8642, lon: -4.2518, tier: 2 },
  { slug: "bristol", name: "Bristol", country: "United Kingdom", countryCode: "GB", lat: 51.4545, lon: -2.5879, tier: 3 },
  { slug: "leeds", name: "Leeds", country: "United Kingdom", countryCode: "GB", lat: 53.8008, lon: -1.5491, tier: 3 },
  { slug: "liverpool", name: "Liverpool", country: "United Kingdom", countryCode: "GB", lat: 53.4084, lon: -2.9916, tier: 3 },
  { slug: "brighton", name: "Brighton", country: "United Kingdom", countryCode: "GB", lat: 50.8225, lon: -0.1372, tier: 3 },
  { slug: "oxford", name: "Oxford", country: "United Kingdom", countryCode: "GB", lat: 51.752, lon: -1.2577, tier: 3 },
  { slug: "cambridge", name: "Cambridge", country: "United Kingdom", countryCode: "GB", lat: 52.2053, lon: 0.1218, tier: 3 },
  { slug: "york", name: "York", country: "United Kingdom", countryCode: "GB", lat: 53.96, lon: -1.0873, tier: 3 },
  { slug: "cardiff", name: "Cardiff", country: "United Kingdom", countryCode: "GB", lat: 51.4816, lon: -3.1791, tier: 3 },
  { slug: "belfast", name: "Belfast", country: "United Kingdom", countryCode: "GB", lat: 54.5973, lon: -5.9301, tier: 3 },
  { slug: "dublin", name: "Dublin", country: "Ireland", countryCode: "IE", lat: 53.3498, lon: -6.2603, tier: 1 },
  { slug: "cork", name: "Cork", country: "Ireland", countryCode: "IE", lat: 51.8985, lon: -8.4756, tier: 3 },

  // ---- Europe: France ----
  { slug: "paris", name: "Paris", country: "France", countryCode: "FR", lat: 48.8566, lon: 2.3522, tier: 1 },
  { slug: "lyon", name: "Lyon", country: "France", countryCode: "FR", lat: 45.764, lon: 4.8357, tier: 2 },
  { slug: "marseille", name: "Marseille", country: "France", countryCode: "FR", lat: 43.2965, lon: 5.3698, tier: 2 },
  { slug: "bordeaux", name: "Bordeaux", country: "France", countryCode: "FR", lat: 44.8378, lon: -0.5792, tier: 2 },
  { slug: "nice", name: "Nice", country: "France", countryCode: "FR", lat: 43.7102, lon: 7.262, tier: 2 },
  { slug: "toulouse", name: "Toulouse", country: "France", countryCode: "FR", lat: 43.6047, lon: 1.4442, tier: 3 },
  { slug: "nantes", name: "Nantes", country: "France", countryCode: "FR", lat: 47.2184, lon: -1.5536, tier: 3 },
  { slug: "strasbourg", name: "Strasbourg", country: "France", countryCode: "FR", lat: 48.5734, lon: 7.7521, tier: 3 },
  { slug: "lille", name: "Lille", country: "France", countryCode: "FR", lat: 50.6292, lon: 3.0573, tier: 3 },
  { slug: "montpellier", name: "Montpellier", country: "France", countryCode: "FR", lat: 43.6108, lon: 3.8767, tier: 3 },

  // ---- Europe: Iberia and Italy ----
  { slug: "madrid", name: "Madrid", country: "Spain", countryCode: "ES", lat: 40.4168, lon: -3.7038, tier: 1 },
  { slug: "barcelona", name: "Barcelona", country: "Spain", countryCode: "ES", lat: 41.3874, lon: 2.1686, tier: 1 },
  { slug: "valencia", name: "Valencia", country: "Spain", countryCode: "ES", lat: 39.4699, lon: -0.3763, tier: 2 },
  { slug: "seville", name: "Seville", country: "Spain", countryCode: "ES", lat: 37.3891, lon: -5.9845, tier: 2 },
  { slug: "malaga", name: "Málaga", country: "Spain", countryCode: "ES", lat: 36.7213, lon: -4.4214, tier: 3 },
  { slug: "bilbao", name: "Bilbao", country: "Spain", countryCode: "ES", lat: 43.263, lon: -2.935, tier: 3 },
  { slug: "lisbon", name: "Lisbon", country: "Portugal", countryCode: "PT", lat: 38.7223, lon: -9.1393, tier: 1 },
  { slug: "porto", name: "Porto", country: "Portugal", countryCode: "PT", lat: 41.1579, lon: -8.6291, tier: 2 },
  { slug: "rome", name: "Rome", country: "Italy", countryCode: "IT", lat: 41.9028, lon: 12.4964, tier: 1 },
  { slug: "milan", name: "Milan", country: "Italy", countryCode: "IT", lat: 45.4642, lon: 9.19, tier: 1 },
  { slug: "florence", name: "Florence", country: "Italy", countryCode: "IT", lat: 43.7696, lon: 11.2558, tier: 2 },
  { slug: "venice", name: "Venice", country: "Italy", countryCode: "IT", lat: 45.4408, lon: 12.3155, radius: 6000, tier: 2 },
  { slug: "naples", name: "Naples", country: "Italy", countryCode: "IT", lat: 40.8518, lon: 14.2681, tier: 2 },
  { slug: "turin", name: "Turin", country: "Italy", countryCode: "IT", lat: 45.0703, lon: 7.6869, tier: 3 },
  { slug: "bologna", name: "Bologna", country: "Italy", countryCode: "IT", lat: 44.4949, lon: 11.3426, tier: 3 },

  // ---- North America ----
  { slug: "new-york", name: "New York", country: "United States", countryCode: "US", lat: 40.7128, lon: -74.006, radius: 12000, tier: 1 },
  { slug: "los-angeles", name: "Los Angeles", country: "United States", countryCode: "US", lat: 34.0522, lon: -118.2437, radius: 15000, tier: 1 },
  { slug: "chicago", name: "Chicago", country: "United States", countryCode: "US", lat: 41.8781, lon: -87.6298, radius: 12000, tier: 1 },
  { slug: "san-francisco", name: "San Francisco", country: "United States", countryCode: "US", lat: 37.7749, lon: -122.4194, tier: 1 },
  { slug: "seattle", name: "Seattle", country: "United States", countryCode: "US", lat: 47.6062, lon: -122.3321, tier: 1 },
  { slug: "boston", name: "Boston", country: "United States", countryCode: "US", lat: 42.3601, lon: -71.0589, tier: 1 },
  { slug: "washington", name: "Washington, D.C.", country: "United States", countryCode: "US", lat: 38.9072, lon: -77.0369, tier: 1 },
  { slug: "portland", name: "Portland", country: "United States", countryCode: "US", lat: 45.5152, lon: -122.6784, tier: 2 },
  { slug: "austin", name: "Austin", country: "United States", countryCode: "US", lat: 30.2672, lon: -97.7431, tier: 2 },
  { slug: "denver", name: "Denver", country: "United States", countryCode: "US", lat: 39.7392, lon: -104.9903, tier: 2 },
  { slug: "philadelphia", name: "Philadelphia", country: "United States", countryCode: "US", lat: 39.9526, lon: -75.1652, tier: 2 },
  { slug: "miami", name: "Miami", country: "United States", countryCode: "US", lat: 25.7617, lon: -80.1918, tier: 2 },
  { slug: "san-diego", name: "San Diego", country: "United States", countryCode: "US", lat: 32.7157, lon: -117.1611, radius: 12000, tier: 2 },
  { slug: "atlanta", name: "Atlanta", country: "United States", countryCode: "US", lat: 33.749, lon: -84.388, tier: 2 },
  { slug: "houston", name: "Houston", country: "United States", countryCode: "US", lat: 29.7604, lon: -95.3698, radius: 15000, tier: 2 },
  { slug: "dallas", name: "Dallas", country: "United States", countryCode: "US", lat: 32.7767, lon: -96.797, radius: 12000, tier: 3 },
  { slug: "phoenix", name: "Phoenix", country: "United States", countryCode: "US", lat: 33.4484, lon: -112.074, radius: 15000, tier: 3 },
  { slug: "minneapolis", name: "Minneapolis", country: "United States", countryCode: "US", lat: 44.9778, lon: -93.265, tier: 3 },
  { slug: "new-orleans", name: "New Orleans", country: "United States", countryCode: "US", lat: 29.9511, lon: -90.0715, tier: 3 },
  { slug: "nashville", name: "Nashville", country: "United States", countryCode: "US", lat: 36.1627, lon: -86.7816, tier: 3 },
  { slug: "las-vegas", name: "Las Vegas", country: "United States", countryCode: "US", lat: 36.1699, lon: -115.1398, tier: 3 },
  { slug: "pittsburgh", name: "Pittsburgh", country: "United States", countryCode: "US", lat: 40.4406, lon: -79.9959, tier: 3 },
  { slug: "detroit", name: "Detroit", country: "United States", countryCode: "US", lat: 42.3314, lon: -83.0458, tier: 3 },
  { slug: "honolulu", name: "Honolulu", country: "United States", countryCode: "US", lat: 21.3099, lon: -157.8581, tier: 3 },
  { slug: "toronto", name: "Toronto", country: "Canada", countryCode: "CA", lat: 43.6532, lon: -79.3832, radius: 12000, tier: 1 },
  { slug: "vancouver", name: "Vancouver", country: "Canada", countryCode: "CA", lat: 49.2827, lon: -123.1207, tier: 1 },
  { slug: "montreal", name: "Montreal", country: "Canada", countryCode: "CA", lat: 45.5017, lon: -73.5673, tier: 2 },
  { slug: "ottawa", name: "Ottawa", country: "Canada", countryCode: "CA", lat: 45.4215, lon: -75.6972, tier: 3 },
  { slug: "calgary", name: "Calgary", country: "Canada", countryCode: "CA", lat: 51.0447, lon: -114.0719, tier: 3 },
  { slug: "mexico-city", name: "Mexico City", country: "Mexico", countryCode: "MX", lat: 19.4326, lon: -99.1332, radius: 12000, tier: 2 },

  // ---- Oceania ----
  { slug: "sydney", name: "Sydney", country: "Australia", countryCode: "AU", lat: -33.8688, lon: 151.2093, radius: 12000, tier: 1 },
  { slug: "melbourne", name: "Melbourne", country: "Australia", countryCode: "AU", lat: -37.8136, lon: 144.9631, radius: 12000, tier: 1 },
  { slug: "brisbane", name: "Brisbane", country: "Australia", countryCode: "AU", lat: -27.4698, lon: 153.0251, tier: 2 },
  { slug: "perth", name: "Perth", country: "Australia", countryCode: "AU", lat: -31.9505, lon: 115.8605, tier: 2 },
  { slug: "adelaide", name: "Adelaide", country: "Australia", countryCode: "AU", lat: -34.9285, lon: 138.6007, tier: 2 },
  { slug: "canberra", name: "Canberra", country: "Australia", countryCode: "AU", lat: -35.2809, lon: 149.13, tier: 3 },
  { slug: "hobart", name: "Hobart", country: "Australia", countryCode: "AU", lat: -42.8821, lon: 147.3272, tier: 3 },
  { slug: "auckland", name: "Auckland", country: "New Zealand", countryCode: "NZ", lat: -36.8485, lon: 174.7633, tier: 1 },
  { slug: "wellington", name: "Wellington", country: "New Zealand", countryCode: "NZ", lat: -41.2866, lon: 174.7756, tier: 2 },
  { slug: "christchurch", name: "Christchurch", country: "New Zealand", countryCode: "NZ", lat: -43.5321, lon: 172.6362, tier: 3 },

  // ---- Asia and the rest ----
  { slug: "tokyo", name: "Tokyo", country: "Japan", countryCode: "JP", lat: 35.6762, lon: 139.6503, radius: 12000, tier: 1 },
  { slug: "osaka", name: "Osaka", country: "Japan", countryCode: "JP", lat: 34.6937, lon: 135.5023, tier: 1 },
  { slug: "kyoto", name: "Kyoto", country: "Japan", countryCode: "JP", lat: 35.0116, lon: 135.7681, tier: 1 },
  { slug: "yokohama", name: "Yokohama", country: "Japan", countryCode: "JP", lat: 35.4437, lon: 139.638, tier: 3 },
  { slug: "nagoya", name: "Nagoya", country: "Japan", countryCode: "JP", lat: 35.1815, lon: 136.9066, tier: 3 },
  { slug: "sapporo", name: "Sapporo", country: "Japan", countryCode: "JP", lat: 43.0618, lon: 141.3545, tier: 3 },
  { slug: "fukuoka", name: "Fukuoka", country: "Japan", countryCode: "JP", lat: 33.5904, lon: 130.4017, tier: 3 },
  { slug: "seoul", name: "Seoul", country: "South Korea", countryCode: "KR", lat: 37.5665, lon: 126.978, radius: 12000, tier: 2 },
  { slug: "taipei", name: "Taipei", country: "Taiwan", countryCode: "TW", lat: 25.033, lon: 121.5654, tier: 2 },
  { slug: "hong-kong", name: "Hong Kong", country: "Hong Kong", countryCode: "HK", lat: 22.3193, lon: 114.1694, tier: 2 },
  { slug: "singapore", name: "Singapore", country: "Singapore", countryCode: "SG", lat: 1.3521, lon: 103.8198, radius: 12000, tier: 2 },
  { slug: "bangkok", name: "Bangkok", country: "Thailand", countryCode: "TH", lat: 13.7563, lon: 100.5018, radius: 12000, tier: 3 },
  { slug: "kuala-lumpur", name: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", lat: 3.139, lon: 101.6869, tier: 3 },
  { slug: "istanbul", name: "Istanbul", country: "Turkey", countryCode: "TR", lat: 41.0082, lon: 28.9784, radius: 12000, tier: 3 },
  { slug: "tel-aviv", name: "Tel Aviv", country: "Israel", countryCode: "IL", lat: 32.0853, lon: 34.7818, tier: 3 },
  { slug: "dubai", name: "Dubai", country: "United Arab Emirates", countryCode: "AE", lat: 25.2048, lon: 55.2708, radius: 12000, tier: 3 },
  { slug: "cape-town", name: "Cape Town", country: "South Africa", countryCode: "ZA", lat: -33.9249, lon: 18.4241, tier: 3 },
  { slug: "buenos-aires", name: "Buenos Aires", country: "Argentina", countryCode: "AR", lat: -34.6037, lon: -58.3816, radius: 12000, tier: 3 },
  { slug: "santiago", name: "Santiago", country: "Chile", countryCode: "CL", lat: -33.4489, lon: -70.6693, tier: 3 },
  { slug: "sao-paulo", name: "São Paulo", country: "Brazil", countryCode: "BR", lat: -23.5505, lon: -46.6333, radius: 12000, tier: 3 },
  { slug: "rio-de-janeiro", name: "Rio de Janeiro", country: "Brazil", countryCode: "BR", lat: -22.9068, lon: -43.1729, radius: 12000, tier: 3 },
];

export const CITY_BY_SLUG: Record<string, City> = Object.fromEntries(
  CITIES.map((city) => [city.slug, city])
);

/** The city of a URL slug, or undefined when the slug is not one we cover */
export function findCity(slug: string): City | undefined {
  return CITY_BY_SLUG[slug.toLowerCase()];
}

export function cityRadius(city: City): number {
  return city.radius ?? DEFAULT_CITY_RADIUS;
}

/**
 * The cities closest to the given one, by great circle distance. Used for the
 * "nearby cities" links, which are what makes the page set a graph rather than
 * a pile of orphans.
 */
export function nearbyCities(city: City, limit = 6): City[] {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const distance = (other: City) => {
    const dLat = toRad(other.lat - city.lat);
    const dLon = toRad(other.lon - city.lon);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(city.lat)) * Math.cos(toRad(other.lat)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return CITIES.filter((other) => other.slug !== city.slug)
    .map((other) => ({ city: other, km: distance(other) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
    .map((entry) => entry.city);
}
