import React, { useEffect, useMemo, useRef } from "react";
import { Circle, Marker } from "react-leaflet";
import { divIcon } from "leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import type { LatLng } from "../hooks";
import { useDeviceHeading } from "../hooks/useDeviceHeading";

type UserPositionMarkerProps = {
  position: LatLng;
};

// Grey while the position still comes from the cache, blue once GPS has locked
const NO_GPS_LOCK_COLOR = "#9e9e9e";
const GPS_LOCK_COLOR = "#1976d2";

/** The icon box, big enough for the beam that reaches out of the dot */
const ICON_SIZE = 72;
const CENTER = ICON_SIZE / 2;
/** How far the beam reaches, and how wide it opens, as Google draws it */
const BEAM_RADIUS = 30;
const BEAM_HALF_ANGLE = 30;

/**
 * The cone, drawn pointing north and rotated into place later.
 *
 * An arc rather than a triangle, so the far edge is the curve of a fixed
 * distance from the dot instead of a corner that reads as an arrowhead.
 */
const beamPath = () => {
  const radians = (BEAM_HALF_ANGLE * Math.PI) / 180;
  const dx = BEAM_RADIUS * Math.sin(radians);
  const dy = BEAM_RADIUS * Math.cos(radians);
  const y = (CENTER - dy).toFixed(2);
  return `M${CENTER} ${CENTER} L${(CENTER - dx).toFixed(2)} ${y} A${BEAM_RADIUS} ${BEAM_RADIUS} 0 0 1 ${(CENTER + dx).toFixed(2)} ${y} Z`;
};

/**
 * Where the visitor is, and which way they are facing.
 *
 * The dot is centred on the coordinate rather than sitting above it: this is a
 * position, not a pin dropped on one, and the accuracy circle and the compass
 * cone are both drawn around the same point, so an offset dot would float away
 * from its own circle.
 */
const UserPositionMarker: React.FC<UserPositionMarkerProps> = ({ position }) => {
  const deviceHeading = useDeviceHeading();
  const markerRef = useRef<LeafletMarker | null>(null);

  // The magnetometer knows which way the phone is pointing while standing
  // still; GPS only knows which way it is travelling, and reports null
  // otherwise. Prefer the first and fall back to the second
  const heading =
    deviceHeading ?? (typeof position.heading === "number" ? position.heading : null);

  const color = position.hasGpsLock ? GPS_LOCK_COLOR : NO_GPS_LOCK_COLOR;

  // Built once per colour rather than once per heading: the compass turns
  // several times a second, and rebuilding the icon would tear the marker out
  // of the DOM and put it back at every degree
  const icon = useMemo(
    () =>
      divIcon({
        className: "user-position-icon",
        html: `<svg class="user-position-beam" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}" aria-hidden="true">
            <defs>
              <radialGradient id="user-position-beam-gradient" gradientUnits="userSpaceOnUse" cx="${CENTER}" cy="${CENTER}" r="${BEAM_RADIUS}">
                <stop offset="0%" stop-color="${color}" stop-opacity="0.45" />
                <stop offset="100%" stop-color="${color}" stop-opacity="0" />
              </radialGradient>
            </defs>
            <path d="${beamPath()}" fill="url(#user-position-beam-gradient)" />
          </svg>
          <span class="user-position-dot" style="background:${color}"></span>`,
        iconSize: [ICON_SIZE, ICON_SIZE],
        iconAnchor: [CENTER, CENTER],
        popupAnchor: [0, -CENTER],
      }),
    [color]
  );

  // Turn the cone by hand, on the element Leaflet already has on the map. A
  // heading of null hides it: pointing the cone at north by default would be a
  // claim about where the visitor is facing that nothing has made
  const headingRef = useRef(heading);
  headingRef.current = heading;

  /**
   * The angle actually written to the element, which is deliberately not kept
   * inside 0–360.
   *
   * A transition on `rotate` interpolates the number it is given, and knows
   * nothing about the circle it stands for: handed 359deg and then 1deg it
   * winds 358 degrees backwards, so a compass crossing north spun most of the
   * way round the wrong way for every step across it. Counting on past 360
   * instead — 359, then 361 — leaves the cone in the same place on screen and
   * makes the short way round the only way the transition can read it.
   */
  const rotationRef = useRef(heading ?? 0);

  const applyHeading = (marker: LeafletMarker | null) => {
    const beam = marker?.getElement()?.querySelector<SVGElement>(".user-position-beam");
    if (!beam) return;

    const current = headingRef.current;
    beam.style.opacity = current === null ? "0" : "1";
    if (current === null) return;

    // The signed short way from where the cone is pointing to where it should
    // be, in −180..180
    const delta = ((current - rotationRef.current) % 360 + 540) % 360 - 180;
    rotationRef.current += delta;
    beam.style.transform = `rotate(${rotationRef.current}deg)`;
  };

  // Both halves are needed: the effect for a heading that changes under a
  // marker already on the map, the ref for a marker that mounts after the
  // compass has already found north
  useEffect(() => {
    applyHeading(markerRef.current);
  });

  const setMarker = (marker: LeafletMarker | null) => {
    markerRef.current = marker;
    applyHeading(marker);
  };

  if (!position.initialized || typeof position.lat !== "number" || typeof position.lng !== "number") {
    return null;
  }

  const center: [number, number] = [position.lat, position.lng];
  // Only what the device actually measured. A cached position carries no
  // accuracy, and a circle drawn around a guess would be a lie about it
  const accuracy =
    position.hasGpsLock && typeof position.accuracy === "number" && position.accuracy > 0
      ? position.accuracy
      : null;

  return (
    <>
      {accuracy !== null && (
        <Circle
          center={center}
          radius={accuracy}
          // Faint enough to read the map through, and untouchable: it covers a
          // lot of ground and must not swallow taps meant for the points under it
          pathOptions={{
            color: GPS_LOCK_COLOR,
            weight: 1,
            opacity: 0.25,
            fillColor: GPS_LOCK_COLOR,
            fillOpacity: 0.1,
          }}
          interactive={false}
        />
      )}
      <Marker
        ref={setMarker}
        position={center}
        opacity={position.hasGpsLock ? 1 : 0.75}
        icon={icon}
      />
    </>
  );
};

export default UserPositionMarker;
