import React from "react";
import { Polygon, Polyline } from "react-leaflet";
import { fetchOverpassShape } from "../api/overpass";
import type { OverpassMarkerData, OverpassShape } from "../api/overpass";

/**
 * How solidly the area is filled in. Low on purpose: the outline is what says
 * where the place ends, and the fill is only there to say which side of it is
 * inside. Anything heavier hides the map the reader is using to walk there.
 */
const FILL_OPACITY = 0.15;

/** Thick enough to read as a boundary on a phone, thin enough not to cover a path */
const STROKE_WEIGHT = 3;

/**
 * Outlines already fetched, kept for the life of the page.
 *
 * Reopening a popup is the common case — a reader compares two car parks, or
 * taps back to the one they had — and the geometry of a way does not change
 * while they are looking at it. A point with no geometry to draw is cached as
 * null, so a relation nobody can render is not asked for again either.
 */
const shapeCache = new Map<string, OverpassShape | null>();

const cacheKey = (marker: OverpassMarkerData) => `${marker.type}/${marker.id}`;

/**
 * The outline of the point whose popup is open, if it has one.
 *
 * Only one is ever on the map: a point is drawn while it is being read about
 * and disappears with its popup. Leaving them behind would build up an area
 * map nobody asked for, and the colours it is drawn in are the categories',
 * so several at once stop meaning anything.
 */
const PoiShape: React.FC<{ marker: OverpassMarkerData; color: string }> = ({
  marker,
  color,
}) => {
  const key = cacheKey(marker);
  const [shape, setShape] = React.useState<OverpassShape | null>(
    () => shapeCache.get(key) ?? null
  );

  React.useEffect(() => {
    if (shapeCache.has(key)) {
      setShape(shapeCache.get(key) ?? null);
      return;
    }

    // The popup can be closed again long before Overpass answers, and a point
    // whose outline arrives after the reader has moved on must not draw itself
    let current = true;
    setShape(null);

    fetchOverpassShape(marker.type as "way" | "relation", marker.id).then(
      result => {
        shapeCache.set(key, result);
        if (current) setShape(result);
      },
      error => {
        // Nothing is said about this. The outline is an extra on top of a popup
        // that is already open and already answering the question that was
        // asked, and a failure notice over the map would be worse than the
        // missing shape
        console.debug("[Overpass] Could not load the outline of the point", error);
      }
    );

    return () => {
      current = false;
    };
  }, [key, marker.id, marker.type]);

  if (!shape) return null;

  const pathOptions = {
    color,
    weight: STROKE_WEIGHT,
    fillColor: color,
    fillOpacity: FILL_OPACITY,
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
