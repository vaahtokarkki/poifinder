import React from "react";
import { Polygon, Polyline } from "react-leaflet";
import { useEnclosingBuilding, useOsmElement } from "../hooks/useOsmElement";
import type { OsmRef } from "../api/overpass";
import type { OverpassMarkerData } from "../api/overpass";

/**
 * How solidly the area is filled in. Low on purpose: the outline is what says
 * where the place ends, and the fill is only there to say which side of it is
 * inside. Anything heavier hides the map the reader is using to walk there.
 */
const FILL_OPACITY = 0.15;

/** Thick enough to read as a boundary on a phone, thin enough not to cover a path */
const STROKE_WEIGHT = 3;

/**
 * The same outline when it belongs to the building a point stands in rather
 * than to the point itself, set a step back in every channel: thinner, dashed,
 * and barely filled.
 *
 * It has to be legible as a different kind of statement. A solid shape in the
 * category's colour says "this is the thing you tapped", and drawing a whole
 * shopping centre that way would claim the centre is the toilet. Dashed and
 * faint says "the toilet is somewhere in here", which is exactly what the
 * containment test knows and the most a building outline can honestly say.
 */
const ENCLOSING_FILL_OPACITY = 0.06;
const ENCLOSING_STROKE_WEIGHT = 2;
const ENCLOSING_DASH = "6 5";

/**
 * The outline on the map under an open popup, if the point turns out to have
 * one.
 *
 * Two different questions, and which one is asked depends on what the point
 * is. A car park drawn as a way has an outline of its own — this is where the
 * place ends — and it is fetched by id. A toilet is a node with no outline at
 * all, and the only shape worth drawing for it is the building it is standing
 * in, which has to be found by looking at what is nearby. Both hooks are
 * called either way, as hooks must be; the one that does not apply is handed a
 * null and asks nothing.
 *
 * Whichever it is, only one is ever on the map: a shape is drawn while its
 * point is being read about and disappears with the popup. Leaving them behind
 * would build up an area map nobody asked for, and the colours they are drawn
 * in are the categories', so several at once stop meaning anything.
 */
const PoiShape: React.FC<{
  marker: OverpassMarkerData;
  color: string;
  /** True for a node, whose outline can only be the building around it */
  enclosing: boolean;
}> = ({ marker, color, enclosing }) => {
  const own = useOsmElement(
    enclosing ? null : (`${marker.type}/${marker.id}` as OsmRef)
  );
  const building = useEnclosingBuilding(
    enclosing && marker.position ? marker.position : null
  );
  const shape = (enclosing ? building?.shape : own?.shape) ?? null;

  if (!shape) return null;

  const pathOptions = {
    color,
    weight: enclosing ? ENCLOSING_STROKE_WEIGHT : STROKE_WEIGHT,
    dashArray: enclosing ? ENCLOSING_DASH : undefined,
    fillColor: color,
    fillOpacity: enclosing ? ENCLOSING_FILL_OPACITY : FILL_OPACITY,
  };

  return (
    <>
      {shape.polygons.map((rings, index) => (
        <Polygon
          key={`polygon-${index}`}
          positions={rings}
          pathOptions={pathOptions}
          // The outline is there to be looked at, not tapped: clicks belong to
          // the marker inside it and to the map underneath
          interactive={false}
        />
      ))}
      {shape.lines.map((line, index) => (
        <Polyline
          key={`line-${index}`}
          positions={line}
          pathOptions={{ ...pathOptions, fill: false }}
          interactive={false}
        />
      ))}
    </>
  );
};

export default PoiShape;
