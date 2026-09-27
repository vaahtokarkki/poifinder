import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { LatLng, Map as LeafletMap, Point } from "leaflet";

/**
 * One finger zoom: tap, then touch again and drag. Down zooms in, up zooms
 * out, around the point that was tapped — the gesture Google Maps and Apple
 * Maps both have, and the one a phone held in one hand needs, because a pinch
 * takes the other hand off the bag, the pram or the railing.
 *
 * Leaflet has the two halves of it and not the whole. A double tap zooms in by
 * one level, and a pinch zooms smoothly; nothing zooms smoothly with one
 * finger. So this watches for the second touch of a double tap and, if it
 * starts to move vertically, takes the gesture over. If it does not move, it
 * lets go and Leaflet's own double tap zoom happens exactly as before.
 *
 * The zooming itself goes through the same private methods Leaflet's pinch
 * handler uses — `_moveStart`, `_move` per animation frame, `_animateZoom` to
 * settle — rather than setZoom per touchmove. That is the path the GL basemap
 * and the marker clusters already follow smoothly during a pinch; setZoom
 * would reset every layer on every frame.
 */

/** How long after the first tap lifts the second may land, in ms */
const DOUBLE_TAP_WINDOW = 300;
/** The first touch counts as a tap only if it was this short, in ms */
const TAP_MAX_DURATION = 250;
/** ...and moved no further than this, in px */
const TAP_MAX_MOVE = 10;
/** How far apart the two taps may land and still be one double tap, in px */
const DOUBLE_TAP_MAX_DISTANCE = 40;
/** Vertical travel before the second touch becomes a zoom rather than a tap */
const DRAG_THRESHOLD = 8;
/** Pixels of drag per zoom level. Google's is in the same range */
const PX_PER_ZOOM_LEVEL = 120;

/** The parts of Leaflet's private API the pinch handler also leans on */
type LeafletInternals = LeafletMap & {
  _stop: () => void;
  _moveStart: (zoomChanged: boolean, noMoveStart: boolean) => LeafletMap;
  _move: (center: LatLng, zoom: number, data?: object) => LeafletMap;
  _animateZoom: (center: LatLng, zoom: number, startAnim: boolean, noUpdate?: number) => void;
  _resetView: (center: LatLng, zoom: number) => void;
  _limitZoom: (zoom: number) => number;
  _animatingZoom?: boolean;
};

type Phase =
  | { kind: "idle" }
  /** A second touch has landed after a tap, and has not moved far yet */
  | {
      kind: "candidate";
      startX: number;
      startY: number;
      anchor: Point;
      anchorLatLng: LatLng;
      startZoom: number;
    }
  /** The drag is under way and this handler owns it */
  | {
      kind: "zooming";
      startY: number;
      anchor: Point;
      anchorLatLng: LatLng;
      startZoom: number;
      zoom: number;
      center: LatLng;
      frame: number | null;
    };

const OneFingerZoom = () => {
  const map = useMap() as LeafletInternals;

  useEffect(() => {
    const container = map.getContainer();
    let phase: Phase = { kind: "idle" };
    let lastTap: { time: number; x: number; y: number } | null = null;
    let touchStart: { time: number; x: number; y: number } | null = null;

    /**
     * Only touches on the map itself. The point panel, the search bar and the
     * controls all live inside the map's container, but outside its map pane,
     * and a double tap on a button there is not a request to zoom
     */
    const onMap = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest(".leaflet-map-pane"));

    const centerFor = (zoom: number, anchor: Point, anchorLatLng: LatLng) => {
      const offset = anchor.subtract(map.getSize().divideBy(2));
      return map.unproject(map.project(anchorLatLng, zoom).subtract(offset), zoom);
    };

    const finishZoom = () => {
      if (phase.kind !== "zooming") return;
      if (phase.frame !== null) cancelAnimationFrame(phase.frame);
      const zoom = map._limitZoom(phase.zoom);
      const center = centerFor(zoom, phase.anchor, phase.anchorLatLng);
      if (map.options.zoomAnimation) {
        map._animateZoom(center, zoom, true, map.options.zoomSnap);
      } else {
        map._resetView(center, zoom);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        // A second finger means a pinch, which Leaflet handles. Settle what
        // this was doing and step aside
        finishZoom();
        phase = { kind: "idle" };
        return;
      }
      const touch = e.touches[0];
      touchStart = { time: e.timeStamp, x: touch.clientX, y: touch.clientY };
      if (!onMap(e.target) || map._animatingZoom) return;

      const recentTap =
        lastTap &&
        e.timeStamp - lastTap.time <= DOUBLE_TAP_WINDOW &&
        Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) <= DOUBLE_TAP_MAX_DISTANCE;
      if (!recentTap) return;

      const anchor = map.mouseEventToContainerPoint(touch as unknown as MouseEvent);
      phase = {
        kind: "candidate",
        startX: touch.clientX,
        startY: touch.clientY,
        anchor,
        anchorLatLng: map.containerPointToLatLng(anchor),
        startZoom: map.getZoom(),
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (phase.kind === "idle" || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - phase.startY;

      // Sideways first means a pan that happened to start soon after a tap.
      // Let it go to Leaflet, which picks the drag up from where it began
      if (phase.kind === "candidate") {
        const dx = e.touches[0].clientX - phase.startX;
        if (Math.abs(dx) >= DRAG_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
          phase = { kind: "idle" };
          lastTap = null;
          return;
        }
      }

      // Leaflet's drag handler listens on the document, below this capture
      // listener. Keeping moves from it is what stops the map panning while
      // the finger is zooming — including the few pixels before the threshold
      e.stopPropagation();
      e.preventDefault();

      if (phase.kind === "candidate") {
        if (Math.abs(dy) < DRAG_THRESHOLD) return;
        map._stop();
        map._moveStart(true, false);
        phase = { ...phase, kind: "zooming", zoom: phase.startZoom, center: map.getCenter(), frame: null };
      }
      if (phase.kind !== "zooming") return;

      const zoom = Math.min(
        map.getMaxZoom(),
        Math.max(map.getMinZoom(), phase.startZoom + dy / PX_PER_ZOOM_LEVEL)
      );
      const center = centerFor(zoom, phase.anchor, phase.anchorLatLng);
      phase.zoom = zoom;
      phase.center = center;
      if (phase.frame !== null) cancelAnimationFrame(phase.frame);
      phase.frame = requestAnimationFrame(() => {
        map._move(center, zoom, { pinch: true, round: false });
        if (phase.kind === "zooming") phase.frame = null;
      });
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (phase.kind === "zooming") {
        // No click, and so no double tap zoom on top of this one
        e.preventDefault();
        finishZoom();
        phase = { kind: "idle" };
        lastTap = null;
        return;
      }
      // A second touch that never moved is an ordinary double tap: Leaflet's
      // own handler zooms in, and this one forgets the tap so a third does not
      // start another
      const wasCandidate = phase.kind === "candidate";
      phase = { kind: "idle" };

      const touch = e.changedTouches[0];
      if (wasCandidate || !touch || !touchStart || e.touches.length > 0) {
        lastTap = null;
        return;
      }
      const quick = e.timeStamp - touchStart.time <= TAP_MAX_DURATION;
      const still =
        Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y) <= TAP_MAX_MOVE;
      lastTap =
        quick && still && onMap(e.target)
          ? { time: e.timeStamp, x: touch.clientX, y: touch.clientY }
          : null;
    };

    const onTouchCancel = () => {
      finishZoom();
      phase = { kind: "idle" };
      lastTap = null;
    };

    // Capture phase, so these run before Leaflet's own listeners see the event
    const opts = { capture: true, passive: false } as const;
    container.addEventListener("touchstart", onTouchStart, opts);
    container.addEventListener("touchmove", onTouchMove, opts);
    container.addEventListener("touchend", onTouchEnd, opts);
    container.addEventListener("touchcancel", onTouchCancel, opts);
    return () => {
      container.removeEventListener("touchstart", onTouchStart, opts);
      container.removeEventListener("touchmove", onTouchMove, opts);
      container.removeEventListener("touchend", onTouchEnd, opts);
      container.removeEventListener("touchcancel", onTouchCancel, opts);
      if (phase.kind === "zooming" && phase.frame !== null) cancelAnimationFrame(phase.frame);
    };
  }, [map]);

  return null;
};

export default OneFingerZoom;
