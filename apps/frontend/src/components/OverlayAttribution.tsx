import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { AIR_ATTRIBUTION, airTilesConfigured } from "../map/airTiles";
import { NOISE_ATTRIBUTION, noiseTilesConfigured } from "../map/noiseTiles";

/**
 * The overlays' credits, in Leaflet's control, for as long as they are drawn.
 *
 * Two problems, and this fixes both.
 *
 * The first is that setting `attribution` on a MapLibre source does nothing
 * here. The Leaflet adapter walks the style's sources once, when the style
 * loads, and hands what it finds to the control — but both overlays are added
 * deliberately *after* that, so their tiles do not compete with the basemap for
 * the connection. Their attributions were set on sources nobody ever read, and
 * the map credited CARTO and OpenStreetMap alone. That is a licence term rather
 * than a courtesy: the air tiles carry ODC-BY and CC BY data, both of which
 * require naming the source, and the noise tiles are an ODbL derivative.
 *
 * The second is what happened when that was fixed by adding both credits
 * permanently: the attribution line wrapped onto two rows and took a strip of
 * the map with it, on every screen, to credit two layers most readers never
 * switch on. So a credit appears only while its layer is drawn.
 *
 * Which leaves one honest wrinkle worth naming. The data is fetched whether the
 * wash is drawn or not — a popup reads the station snapshot with the air layer
 * off, and the noise band is queried from tiles that load at zero opacity — so
 * for those readers the sources are used without being named on the map. The
 * "How this works" dialog in each popup carries the same credit for exactly
 * that case, which is where a reader who saw a number is told where it came
 * from.
 */
const OverlayAttribution: React.FC<{
  noiseVisible: boolean;
  airVisible: boolean;
}> = ({ noiseVisible, airVisible }) => {
  const map = useMap();

  useEffect(() => {
    const shown = [
      noiseTilesConfigured && noiseVisible ? NOISE_ATTRIBUTION : null,
      airTilesConfigured && airVisible ? AIR_ATTRIBUTION : null,
    ].filter((credit): credit is string => credit !== null);

    for (const credit of shown) {
      try {
        map.attributionControl?.addAttribution(credit);
      } catch {
        // A map with no attribution control has nothing to add to, which is
        // not worth breaking a render over
      }
    }

    return () => {
      for (const credit of shown) {
        try {
          map.attributionControl?.removeAttribution(credit);
        } catch {
          /* nothing to remove from */
        }
      }
    };
  }, [map, noiseVisible, airVisible]);

  return null;
};

export default OverlayAttribution;
