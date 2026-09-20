import React, { useEffect, useRef } from "react";
import { ui } from "../copy";

/**
 * The grab bar at the top of a point panel, and the gestures that go with it.
 *
 * The panel opens at the height the stylesheet gives it, which is half a
 * screen: enough for a name, an address and the first rows, and no more. A
 * shop with forty tags, or a point whose building lookup has just landed, is a
 * long read through a small window, and until now the only way to see more of
 * it was to scroll that window. The bottom sheet on the map root has solved
 * this since the beginning — drag it up and it becomes a page — and a reader
 * who has learned that gesture on one shelf at the foot of the screen will try
 * it on the other.
 *
 * So this gives the panel the same two states and the same handle, plus the
 * other half of the bargain: a pull down closes it. That matters more here
 * than on the sheet, because the panel is what stands between the reader and
 * the map — the close bar at its foot is a deliberate tap, and flicking the
 * thing away is what a thumb wants to do with it.
 *
 * It drives the panel's height by writing to the element rather than through
 * React state. The panel's content is rendered by RenderMarkerContents, which
 * holds a building lookup; re-rendering that subtree sixty times a second for
 * a drag would be work nobody asked for, and the height is presentation the
 * DOM can own for the length of a gesture.
 */

/** A drag shorter than this is a tap on the handle, not a drag */
const TAP_THRESHOLD = 6;
/** A drag longer than this moves on in the drag direction */
const DIRECTION_THRESHOLD = 50;
/**
 * How far the content has to be pulled past its own top before the pull stops
 * being a scroll and starts dragging the panel. As on the bottom sheet, small:
 * it is only there so the last pixels of a flick that ended at the top do not
 * throw away what somebody was reading.
 */
const OVERSCROLL_TAKEOVER = 6;
/**
 * Below this share of the open height, letting go closes the panel rather than
 * settling it back.
 *
 * Generous on purpose. Dismissing is the cheap mistake — the point is still on
 * the map, one tap away — while a panel that springs back up after a clear
 * downward flick reads as the app refusing to leave.
 */
const CLOSE_FRACTION = 0.65;

/** As tall as the bottom sheet goes, and for the same reasons */
const fullHeightForWindow = () =>
  Math.min(Math.round(window.innerHeight * 0.85), 680);

type Snap = "peek" | "full";

/** What the handle's own events and keys call, once the panel has been found */
type PanelControls = {
  beginDrag: (y: number) => void;
  moveDrag: (y: number) => void;
  endDrag: (y: number, tapToggles: boolean) => void;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
};

const PoiPanelHandle: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const handleRef = useRef<HTMLDivElement | null>(null);

  /**
   * Everything the gesture needs, in one box that survives a render.
   *
   * `peek` is measured rather than stated: the stylesheet owns the panel's
   * open height, in a `min()` of two units that no number here could track.
   */
  const stateRef = useRef({
    peek: 0,
    full: 0,
    snap: "peek" as Snap,
    height: 0,
    start: null as { y: number; height: number } | null,
    onClose,
    /** Filled in once the panel is in the document — see the effect below */
    controls: null as PanelControls | null,
  });
  stateRef.current.onClose = onClose;

  useEffect(() => {
    const handle = handleRef.current;
    const panel = handle?.closest<HTMLElement>(".leaflet-popup");
    const body = panel?.querySelector<HTMLElement>(".poi-popup-body");
    if (!handle || !panel || !body) return;

    const state = stateRef.current;

    /**
     * What the stylesheet would make the panel, asked by taking our own height
     * off it for the length of a measurement. Re-asked on a resize, because
     * the answer is written in viewport units.
     */
    const measurePeek = () => {
      const inline = panel.style.height;
      panel.style.height = "";
      const measured = Math.round(panel.getBoundingClientRect().height);
      panel.style.height = inline;
      return measured;
    };

    const heightFor = (snap: Snap) => (snap === "peek" ? state.peek : state.full);

    const setHeight = (height: number) => {
      state.height = height;
      panel.style.height = `${height}px`;
    };

    const applySnap = (snap: Snap) => {
      state.snap = snap;
      setHeight(heightFor(snap));
      handle.setAttribute("aria-expanded", String(snap === "full"));
      handle.setAttribute(
        "title",
        snap === "full" ? ui().controls.dragDownToClose : ui().controls.dragUpForMore
      );
    };

    const sizeToWindow = () => {
      state.peek = measurePeek() || Math.round(window.innerHeight * 0.46);
      state.full = Math.max(fullHeightForWindow(), state.peek);
      if (!state.start) setHeight(heightFor(state.snap));
    };

    sizeToWindow();
    applySnap("peek");

    const beginDrag = (y: number) => {
      state.start = { y, height: state.height };
      panel.classList.add("poi-panel-dragging");
    };

    const moveDrag = (y: number) => {
      const start = state.start;
      if (!start) return;
      // Dragging up grows the panel, down shrinks it
      const next = start.height + (start.y - y);
      setHeight(Math.max(0, Math.min(state.full, next)));
    };

    const endDrag = (y: number, tapToggles: boolean) => {
      const start = state.start;
      state.start = null;
      panel.classList.remove("poi-panel-dragging");
      if (!start) return;

      // A tap on the handle opens the panel, and folds it back once open. The
      // same movement on the body is a finger that changed its mind halfway
      // through a scroll, and settles the panel back where it was
      if (Math.abs(y - start.y) < TAP_THRESHOLD) {
        if (tapToggles) applySnap(state.snap === "peek" ? "full" : "peek");
        else setHeight(heightFor(state.snap));
        return;
      }

      // Pulled down far enough that letting go means letting go
      if (state.height < state.peek * CLOSE_FRACTION) {
        state.onClose();
        return;
      }

      const dragged = state.height - start.height;
      const candidates: Snap[] = ["peek", "full"];
      const inDirection = candidates.filter(snap =>
        dragged > 0 ? heightFor(snap) > start.height : heightFor(snap) < start.height
      );
      const nearest = (from: Snap[]) =>
        from.reduce((closest, snap) =>
          Math.abs(heightFor(snap) - state.height) <
          Math.abs(heightFor(closest) - state.height)
            ? snap
            : closest
        );
      applySnap(
        Math.abs(dragged) > DIRECTION_THRESHOLD && inDirection.length > 0
          ? nearest(inDirection)
          : nearest(candidates)
      );
    };

    state.controls = {
      beginDrag,
      moveDrag,
      endDrag,
      expand: () => applySnap("full"),
      /* The way out of a full panel is the way back to a peeking one; the way
         out of a peeking one is off the screen, which is what the pull down
         does with a finger */
      collapse: () => (state.snap === "full" ? applySnap("peek") : state.onClose()),
      toggle: () => applySnap(state.snap === "full" ? "peek" : "full"),
    };

    /**
     * Pulling the content down past its own top drags the panel with it, in
     * the same gesture and without lifting a finger — the reader scrolls back
     * to the top, keeps pulling, and the panel comes away.
     *
     * Native listeners rather than React's, because the takeover has to
     * preventDefault the touchmove to stop the browser scrolling the content
     * underneath it, and React registers touchmove passively at the root. This
     * is the same arrangement BottomSheet uses, for the same reason.
     *
     * Touch only. A wheel notch at the top of a scrolled box is how a trackpad
     * ends a flick, not how anybody asks to close what they are reading.
     */
    let overpull = 0;
    let lastY = 0;
    let dragging = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      lastY = e.touches[0].clientY;
      overpull = 0;
      dragging = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const delta = y - lastY;
      lastY = y;

      if (!dragging) {
        // Measured from wherever the content reached its top rather than from
        // where the finger went down, so a scroll down, back up and down again
        // inside one gesture is still a scroll
        if (body.scrollTop > 0 || delta <= 0) {
          overpull = 0;
          return;
        }
        overpull += delta;
        if (overpull < OVERSCROLL_TAKEOVER) return;
        dragging = true;
        // From here, so the panel does not jump by the few pixels it took to
        // tell a pull from the end of a scroll
        beginDrag(y);
      }

      e.preventDefault();
      moveDrag(y);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!dragging) return;
      dragging = false;
      endDrag(e.changedTouches[0]?.clientY ?? lastY, false);
    };

    body.addEventListener("touchstart", onTouchStart, { passive: true });
    body.addEventListener("touchmove", onTouchMove, { passive: false });
    body.addEventListener("touchend", onTouchEnd);
    body.addEventListener("touchcancel", onTouchEnd);
    window.addEventListener("resize", sizeToWindow);
    return () => {
      body.removeEventListener("touchstart", onTouchStart);
      body.removeEventListener("touchmove", onTouchMove);
      body.removeEventListener("touchend", onTouchEnd);
      body.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("resize", sizeToWindow);
      panel.style.height = "";
      panel.classList.remove("poi-panel-dragging");
    };
  }, []);

  const controls = () => stateRef.current.controls;

  return (
    <div
      className="poi-panel-handle"
      ref={handleRef}
      role="button"
      tabIndex={0}
      aria-expanded={false}
      title={ui().controls.dragUpForMore}
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId);
        controls()?.beginDrag(e.clientY);
      }}
      onPointerMove={e => controls()?.moveDrag(e.clientY)}
      onPointerUp={e => controls()?.endDrag(e.clientY, true)}
      onPointerCancel={e => controls()?.endDrag(e.clientY, true)}
      onKeyDown={e => {
        if (e.key === "ArrowUp") controls()?.expand();
        if (e.key === "ArrowDown") controls()?.collapse();
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          controls()?.toggle();
        }
      }}
    >
      <div className="poi-panel-grabber" />
    </div>
  );
};

export default PoiPanelHandle;
