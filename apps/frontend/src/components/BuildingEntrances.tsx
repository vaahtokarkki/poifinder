import React from "react";
import { divIcon } from "leaflet";
import { Marker, useMap, useMapEvent } from "react-leaflet";
import { useBuildingEntrances } from "../hooks/useOsmElement";
import { shapeContains } from "../api/overpass";
import type { BuildingEntrance, OsmRef, OverpassShape } from "../api/overpass";

/**
 * From how far out the doors are drawn.
 *
 * The question they answer is asked before the reader is anywhere near the
 * building — which side of the shopping centre do I walk to — so drawing them
 * only once somebody has zoomed to the door is drawing them after the decision
 * has been made. What stops it going further out is when the doors stop being
 * separate marks, and that is set by the gap between neighbouring doors rather
 * than by the size of the building: a mall is 200 m across but its doors are
 * not spread evenly over it.
 *
 * Measured, over the 476 nearest-neighbour gaps between drawn doors on the
 * buildings our Finland import keeps: median 21 m, a quarter of them under
 * 9 m. Two 20 px circles need 20 px between their centres to stay clear, which
 * at latitude 60 is 96 m at z14, 48 m at z15, 24 m at z16 and 12 m at z17 — so
 * 4% of neighbours are clear at z14, 21% at z15, 43% at z16 and 69% at z17.
 *
 * z14 was the first guess here and it was wrong: it drew a whole mall's doors
 * as one green smudge, which says less than nothing. z16 is the point where
 * the marks start being marks. Clustered doors still overlap there — z17 is
 * where that mostly resolves — but the one on top of a pile is the main door,
 * which is the one worth seeing.
 */
const MIN_ZOOM = 16;

/**
 * Green, and not the category's colour.
 *
 * Everything else drawn for an open popup is in the colour of the category
 * that was searched for — the marker, the outline, the dashed building around
 * it — and all of it is saying "this is the thing you asked about". A door is
 * not that. It is the way in, which is the same instruction whatever the
 * reader came looking for, and it earns a colour that says go rather than a
 * colour that says toilet.
 */
const GREEN = "#188038";

/**
 * The mark: a circle on the wall, with an arrow across it pointing in.
 *
 * A dot on the doorway says a door is there and stops. What the reader is
 * actually working out from the far side of a car park is which face of the
 * building to walk to, and that is a direction rather than a point — so the
 * mark carries one, aimed through the wall it opens.
 *
 * One size for every door, and it is the larger of the two sizes there used to
 * be. `entrance=main` was drawn bigger than the rest, and the bigger circle
 * read as the more important place rather than as the front door — which is a
 * claim about the building the tag does not make. Levelling them up rather
 * than down keeps the arrow inside readable, which is the part that has to
 * survive: a direction drawn too small to see is a dot.
 *
 * Where a door is main it still comes out on top of anything it overlaps, and
 * that is the whole of what the tag is allowed to say here.
 */
const SIZE = 20;

/** Pointing right at rest, which is what the rotation below is measured from */
const ARROW_PATH = "M9.5 6.2 17.4 12 9.5 17.8Z";

const iconFor = (angle: number | null) => {
  const size = SIZE;
  return divIcon({
    className: "",
    iconSize: [size, size],
    /*
     * The middle of the circle, which puts it centred on the door — and so
     * straddling the wall, half of it over the building and half over the
     * street. That is where the thing it marks actually is: a door is a point
     * in a wall rather than something standing beside one, and a circle held
     * off to one side has to be read back onto the outline before it means
     * anything.
     */
    iconAnchor: [size / 2, size / 2],
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg" style="display:block;
      filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35))">
      <circle cx="12" cy="12" r="10.6" fill="${GREEN}" stroke="#fff" stroke-width="2"/>
      ${
        angle === null
          ? ""
          : `<path d="${ARROW_PATH}" fill="#fff" transform="rotate(${angle} 12 12)"/>`
      }
    </svg>`,
  });
};

/**
 * Built once per direction and size rather than per render, on the same
 * grounds as the marker icons in PoiMarkers: a fresh icon every render rebinds
 * every mark on the map, and a rebind mid-gesture eats the gesture. Rounded to
 * five degrees, which no eye can tell from the exact angle and which turns a
 * continuous key into a few dozen.
 */
const iconCache = new Map<string, ReturnType<typeof divIcon>>();

/**
 * A door whose wall could not be worked out gets no arrow at all, rather than
 * one pointing at whatever direction zero happens to be. Now that every circle
 * sits centred on its door, an arrow is the only thing left that could claim a
 * direction, and a bare circle is the honest way to say "a door, here" and
 * nothing more.
 */
const cachedIcon = (inward: [number, number] | null) => {
  const angle = inward
    ? Math.round((Math.atan2(inward[1], inward[0]) * 180) / Math.PI / 5) * 5
    : null;
  const key = String(angle ?? "none");
  const existing = iconCache.get(key);
  if (existing) return existing;
  const icon = iconFor(angle);
  iconCache.set(key, icon);
  return icon;
};

/* ---------- Which way is in ---------- */

/**
 * A step in degrees, small enough to stay inside the thinnest wall anybody
 * draws and large enough to survive the arithmetic. About 11 cm.
 */
const PROBE = 1e-6;

/**
 * Latitude and longitude are not the same distance on the screen, and the arrow
 * is drawn on the screen. A degree of longitude is cos(latitude) of a degree of
 * latitude — a half at 60°N, where most of what this app maps is — so a door on
 * an east wall would point noticeably off the wall without the correction.
 *
 * Y is flipped on the way through: north is up on the map and down the screen.
 */
const toScreen = (
  [lat, lng]: [number, number],
  [fromLat, fromLng]: [number, number]
): [number, number] => [
  (lng - fromLng) * Math.cos((fromLat * Math.PI) / 180),
  -(lat - fromLat),
];

const length = ([x, y]: [number, number]) => Math.hypot(x, y);

/** Every ring of the outline, holes included: a courtyard has doors onto it too */
const ringsOf = (shape: OverpassShape) => [
  ...shape.polygons.flat(),
  ...shape.lines,
];

/**
 * Which way the wall runs at the door, as the direction of the piece of
 * outline it sits closest to.
 *
 * Closest piece rather than the corner it is drawn as, because a door is a
 * node of the building's own way and so falls exactly on a corner between two
 * walls — and the direction of a corner is not a direction. The segment either
 * side of it is a real wall, and the nearer of the two is the one the door
 * opens through.
 */
const wallAt = (rings: [number, number][][], door: [number, number]) => {
  let best: { direction: [number, number]; distance: number } | null = null;

  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      const from = ring[i - 1];
      const to = ring[i];
      const wall = toScreen(to, from);
      const span = length(wall);
      if (span === 0) continue;

      // How far along the wall the door falls, clamped to its ends so that a
      // door beyond either end measures to the corner rather than past it
      const offset = toScreen(door, from);
      const along = Math.min(
        1,
        Math.max(0, (offset[0] * wall[0] + offset[1] * wall[1]) / (span * span))
      );
      const distance = length([
        offset[0] - wall[0] * along,
        offset[1] - wall[1] * along,
      ]);

      if (best === null || distance < best.distance) {
        best = { direction: [wall[0] / span, wall[1] / span], distance };
      }
    }
  }

  return best?.direction ?? null;
};

/**
 * The way the arrow points: across the wall at the door, into the building.
 *
 * A wall has two normals and only one of them is in. Which one is settled by
 * asking the outline itself — step a hand's breadth along each and see which
 * step lands inside — rather than by reading the ring's winding, which a
 * multipolygon's holes reverse and a contributor's unclosed way leaves
 * meaningless.
 *
 * Null when there is nothing to point along: a door that matched no wall, or a
 * wall whose two sides are both outside, which is what an outline drawn as an
 * open line rather than a closed ring gives. The mark is then drawn without a
 * direction rather than with a wrong one.
 */
const inwardAt = (
  shape: OverpassShape,
  door: [number, number]
): [number, number] | null => {
  const wall = wallAt(ringsOf(shape), door);
  if (!wall) return null;

  // The two normals of the wall, in screen terms, and the same two steps in
  // degrees to try them with. The y flip in toScreen is undone for the step
  const normals: [number, number][] = [
    [-wall[1], wall[0]],
    [wall[1], -wall[0]],
  ];
  for (const normal of normals) {
    const probe: [number, number] = [
      door[0] - normal[1] * PROBE,
      door[1] + (normal[0] * PROBE) / Math.cos((door[0] * Math.PI) / 180),
    ];
    if (shapeContains(shape, probe)) return normal;
  }
  return null;
};

/** The map's zoom, as state, so the marks can come and go with it */
const useZoom = () => {
  const map = useMap();
  const [zoom, setZoom] = React.useState(() => map.getZoom());
  useMapEvent("zoomend", () => setZoom(map.getZoom()));
  return zoom;
};

/**
 * The doors into the building under an open popup.
 *
 * The point of the whole thing: a toilet in Iso Omena is a dot in the middle
 * of a shopping centre, and the outline around it says where the centre ends
 * without saying anything at all about how to get inside it. Walking to the
 * nearest edge of that outline is how you end up at a loading bay. These are
 * the doors, so the walk can be aimed at one.
 *
 * Drawn like the outline and on the same terms: they appear with the popup,
 * they go with it, and they do not take clicks — the marker inside the
 * building is what the reader is there to tap, and a second class of tappable
 * thing over the same few hundred pixels would take taps meant for it.
 */
const BuildingEntrances: React.FC<{
  building: OsmRef | null;
  shape: OverpassShape | null;
}> = ({ building, shape }) => {
  const entrances = useBuildingEntrances(building);
  const zoom = useZoom();

  if (zoom < MIN_ZOOM || !shape) return null;

  return (
    <>
      {entrances.map((entrance: BuildingEntrance) => {
        // A door whose wall could not be worked out is still a door worth
        // showing, as a circle with nothing across it: see cachedIcon
        const inward = inwardAt(shape, entrance.position);
        return (
          <Marker
            key={`entrance-${entrance.id}`}
            position={entrance.position}
            icon={cachedIcon(inward)}
            interactive={false}
            /*
             * Under the point's own marker where they overlap, which they do
             * on a toilet mapped in the doorway it stands beside — and, among
             * the doors themselves, a main one over a side one. Two doors five
             * metres apart overlap at this size, and now that they are drawn
             * alike the one underneath is simply hidden; the front door is the
             * better one to leave showing.
             */
            zIndexOffset={entrance.main ? -900 : -1000}
          />
        );
      })}
    </>
  );
};

export default BuildingEntrances;
