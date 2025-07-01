import React from "react";
import { OverpassMarkerData } from "../api/overpass";
import { parseCityFromPath, parseCategoryFromPath } from "../utils";
import { fetchSuggestions } from "../api/geocode";

type JsonLdSeoProps = {
  markers: OverpassMarkerData[];
};

const JsonLdSeo: React.FC<JsonLdSeoProps> = ({ markers }) => {
  const [cityCoords, setCityCoords] = React.useState<[number, number] | null>(null);
  const [city, setCity] = React.useState<string>("");
  const [category, setCategory] = React.useState<string>("");

  React.useEffect(() => {
    const cityStr = parseCityFromPath(window.location.pathname);
    const categoryStr = parseCategoryFromPath(window.location.pathname);
    setCity(cityStr);
    setCategory(categoryStr);

    if (cityStr && categoryStr) {
      fetchSuggestions(cityStr).then(results => {
        if (results && results.length > 0) {
          setCityCoords(results[0].coords);
        }
      });
    } else {
      setCityCoords(null);
    }
  }, [window.location.pathname]);

  // Only render if both city and category are present and geocoded
  if (!city || !category || !cityCoords) return null;

  // Pick 5 markers with name defined
  const pois = markers
    .filter(m => typeof m.name === "string" && m.name.trim())
    .slice(0, 5);

  const title = `${category.charAt(0).toUpperCase() + category.slice(1)} in ${city.charAt(0).toUpperCase() + city.slice(1)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": `Interactive map of ${category} in ${city} powered by OpenStreetMap.`,
    "url": `https://poifinder.app/${city}/${category.replace(/\s+/g, "-")}`,
    "mainEntity": {
      "@type": "Place",
      "name": title,
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": cityCoords[0],
        "longitude": cityCoords[1]
      }
    },
    "hasPart": pois.map((poi) => ({
      "@type": "Place",
      "name": poi.name,
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": poi.position[0],
        "longitude": poi.position[1]
      }
    }))
  };

  return (
    <>
      <title>{title}</title>
      <script className='structured-data-list'  type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </>
  );
};

export default JsonLdSeo;
