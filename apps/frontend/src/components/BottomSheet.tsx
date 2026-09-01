import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ui } from "../copy";
import { analytics } from "../analytics";

export type SheetSnap = "hidden" | "peek" | "full";

/** Dragged all the way down the sheet is gone, a reload brings it back */
const HIDDEN_HEIGHT = 0;
/** A drag shorter than this is a tap on the handle, not a drag */
const TAP_THRESHOLD = 6;
/** A drag longer than this moves on in the drag direction */
const DIRECTION_THRESHOLD = 50;
/**
 * How far the open sheet's content has to be pulled past its top before the
 * pull stops being a scroll and starts dragging the sheet. Small, because it
 * is only there to keep the last pixels of a flick that ended at the top from
 * closing what somebody was reading.
 */
const OVERSCROLL_TAKEOVER = 6;

/** The collapsed height the prerendered block already drew, when it parses */
const DEFAULT_PEEK_HEIGHT = 172;

/**
 * How near the end counts as the end.
 *
 * Not zero: a sheet whose last element carries a margin, a phone that scrolls
 * in fractional pixels and a browser rounding scrollHeight all stop a few
 * pixels short of the arithmetic, and somebody who is looking at the last line
 * has read to the end whatever the remainder says.
 */
const READ_TO_END_SLACK = 24;

export type BottomSheetHandle = {
  /** Open the sheet all the way, even after it has been dismissed */
  expand: () => void;
};

type BottomSheetProps = {
  /** Height of the collapsed state, enough for a short summary */
  peekHeight?: number;
  /** Lets the map controls bring the sheet back up */
  ref?: React.Ref<BottomSheetHandle>;
  /**
   * Which page's content is in the sheet, for the one event this reports: see
   * onContentScroll. A label for a report and nothing else — the sheet draws
   * whatever it is given either way
   */
  page?: string;
  children: React.ReactNode;
};

const fullHeightForWindow = () =>
  Math.min(Math.round(window.innerHeight * 0.85), 680);

/**
 * The static markup the prerender leaves behind opens the sheet at the height
 * --sheet-peek-height gives it, before any of this has run. Reading the same
 * property keeps the sheet from resizing the moment React takes over.
 */
const peekHeightFromStyles = () => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    "--sheet-peek-height"
  );
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PEEK_HEIGHT;
};

/**
 * A bottom sheet that can be dragged between three states: peek, full and
 * hidden. Dragging it all the way down dismisses it for the rest of the visit,
 * as in the Google Maps app.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({ peekHeight, ref, page, children }) => {
  const [measuredPeek] = useState(peekHeightFromStyles);
  const collapsedHeight = peekHeight ?? measuredPeek;
  const [fullHeight, setFullHeight] = useState(fullHeightForWindow);
  const [snap, setSnap] = useState<SheetSnap>("peek");
  const [dragging, setDragging] = useState(false);

  const heightFor = useCallback(
    (target: SheetSnap) => {
      if (target === "hidden") return HIDDEN_HEIGHT;
      if (target === "peek") return Math.min(collapsedHeight, fullHeight);
      return fullHeight;
    },
    [collapsedHeight, fullHeight]
  );

  const [visible, setVisible] = useState(() => heightFor("peek"));

  // Where the drag started, so the movement can be turned into a height
  const dragStartRef = useRef<{ y: number; visible: number } | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  /** Whether this visit has already been counted as having read to the end */
  const readToEndRef = useRef(false);

  /**
   * Report the one moment in a scroll worth knowing about: the reader reached
   * the bottom of the text.
   *
   * Once per visit, which is why the guard is a ref rather than state — the
   * fact is that somebody got there, and a flick that bounces off the end
   * three times is one reader, not three. Nothing else about the scrolling is
   * reported: how far down people got would be a stream of events for a
   * gesture, and this sheet is short enough that the end is the only position
   * that means anything.
   *
   * Only the fully open sheet scrolls at all — in the other states the content
   * is a drag surface with its overflow hidden — so this cannot fire while the
   * sheet is peeking, and closing it scrolls the content back to the top,
   * which is the far end from here.
   */
  const onContentScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (readToEndRef.current) return;
    const content = event.currentTarget;
    const remaining = content.scrollHeight - content.scrollTop - content.clientHeight;
    if (remaining > READ_TO_END_SLACK) return;
    readToEndRef.current = true;
    analytics.sheetReadToEnd(page ?? "map");
  };

  // Closing the sheet takes it back to the heading, not to wherever it was read
  useEffect(() => {
    if (snap !== "full" && contentRef.current) contentRef.current.scrollTop = 0;
  }, [snap]);

  useEffect(() => {
    const onResize = () => setFullHeight(fullHeightForWindow());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keep the height in sync when the snap state or the window size changes
  useEffect(() => {
    if (!dragging) setVisible(heightFor(snap));
  }, [snap, heightFor, dragging]);

  // The map controls and the Leaflet controls are lifted above the sheet, but
  // only up to the peek height, so they stay reachable when it is fully open
  useEffect(() => {
    const offset = Math.min(visible, heightFor("peek"));
    document.documentElement.style.setProperty("--sheet-offset", `${offset}px`);
  }, [visible, heightFor]);

  const applySnap = (target: SheetSnap) => {
    setSnap(target);
    setVisible(heightFor(target));
  };

  useImperativeHandle(ref, () => ({ expand: () => applySnap("full") }));

  const snapPoints: { snap: SheetSnap; height: number }[] = [
    { snap: "hidden", height: heightFor("hidden") },
    { snap: "peek", height: heightFor("peek") },
    { snap: "full", height: heightFor("full") },
  ];

  const nearestSnap = (height: number, candidates = snapPoints) =>
    candidates.reduce((closest, point) =>
      Math.abs(point.height - height) < Math.abs(closest.height - height) ? point : closest
    );

  /**
   * A drag, in the terms both input paths share: a y coordinate. The handle is
   * driven by pointer events, and the scrolling content by the native touch
   * listeners further down, which need the same three steps.
   */
  const beginDrag = (clientY: number) => {
    dragStartRef.current = { y: clientY, visible };
    setDragging(true);
  };

  const moveDrag = (clientY: number) => {
    const start = dragStartRef.current;
    if (!start) return;
    // Dragging up grows the sheet, down shrinks it
    const next = start.visible + (start.y - clientY);
    setVisible(Math.max(HIDDEN_HEIGHT, Math.min(fullHeight, next)));
  };

  const endDrag = (clientY: number, tapTogglesSheet: boolean) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setDragging(false);
    if (!start) return;

    const dragged = visible - start.visible;

    // A tap on the handle opens the sheet, and closes it once fully open
    if (Math.abs(clientY - start.y) < TAP_THRESHOLD) {
      if (tapTogglesSheet) applySnap(snap === "full" ? "peek" : "full");
      return;
    }

    // A clear drag continues to the next state in that direction, a short one
    // settles on whichever state is closest
    const inDirection = snapPoints.filter((point) =>
      dragged > 0 ? point.height > start.visible : point.height < start.visible
    );
    const target =
      Math.abs(dragged) > DIRECTION_THRESHOLD && inDirection.length > 0
        ? nearestSnap(visible, inDirection)
        : nearestSnap(visible);
    applySnap(target.snap);
  };

  const startDrag = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    beginDrag(e.clientY);
  };

  // Only the fully open sheet scrolls its content, in the other states the
  // content is a drag surface of its own
  const contentScrolls = snap === "full" && !dragging;
  const contentDragHandlers = contentScrolls
    ? {}
    : {
        onPointerDown: startDrag,
        onPointerMove: (e: React.PointerEvent) => moveDrag(e.clientY),
        onPointerUp: (e: React.PointerEvent) => endDrag(e.clientY, false),
        onPointerCancel: (e: React.PointerEvent) => endDrag(e.clientY, false),
      };

  /**
   * The drag as the touch listeners below can reach it. They are registered
   * once, so calling through a ref that every render refreshes is what keeps
   * them from dragging the sheet with the first render's idea of its height.
   */
  const dragApiRef = useRef({ beginDrag, moveDrag, endDrag, contentScrolls });
  dragApiRef.current = { beginDrag, moveDrag, endDrag, contentScrolls };

  /**
   * Pulling the open sheet's content down past its top drags the sheet down
   * with it, in the same gesture and without lifting a finger: the reader
   * scrolls back to the top, keeps pulling, and the sheet comes with them.
   *
   * Native listeners rather than React's, because the takeover has to
   * preventDefault the touchmove to stop the browser scrolling the content at
   * the same time, and React registers touchmove passively at the root, where
   * preventDefault does nothing. They are on the content element rather than
   * the window so the map underneath keeps its own gestures.
   *
   * Touch only. A mouse has the handle, the scrollbar and a wheel, none of
   * which express "keep pulling" — a wheel notch at the top of a scrolled
   * element is how a trackpad ends a flick, not how somebody asks to close
   * anything, and closing the sheet on it would take the text away mid-read.
   */
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    /** How far this gesture has pulled the content past its own top */
    let overpull = 0;
    /** Where the finger was on the previous move, to measure the pull from */
    let lastY = 0;
    /** Whether this gesture has stopped being a scroll and become a drag */
    let dragged = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      lastY = e.touches[0].clientY;
      overpull = 0;
      dragged = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const delta = y - lastY;
      lastY = y;

      if (!dragged) {
        // In every other state the content is already a drag surface, driven
        // by the pointer handlers above, and taking it over here as well would
        // move the sheet twice for one finger
        if (!dragApiRef.current.contentScrolls) return;
        /**
         * Measured from wherever the content reached its top rather than from
         * where the finger went down, so that a scroll down, back up and down
         * again inside one gesture is still a scroll: only the pull that is
         * happening now, at the top, counts towards the takeover.
         */
        if (content.scrollTop > 0 || delta <= 0) {
          overpull = 0;
          return;
        }
        overpull += delta;
        if (overpull < OVERSCROLL_TAKEOVER) return;
        dragged = true;
        // From here, so the sheet does not jump by the few pixels it took to
        // tell a pull from the end of a scroll
        dragApiRef.current.beginDrag(y);
      }

      e.preventDefault();
      dragApiRef.current.moveDrag(y);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!dragged) return;
      dragged = false;
      dragApiRef.current.endDrag(e.changedTouches[0]?.clientY ?? lastY, false);
    };

    content.addEventListener("touchstart", onTouchStart, { passive: true });
    content.addEventListener("touchmove", onTouchMove, { passive: false });
    content.addEventListener("touchend", onTouchEnd);
    content.addEventListener("touchcancel", onTouchEnd);
    return () => {
      content.removeEventListener("touchstart", onTouchStart);
      content.removeEventListener("touchmove", onTouchMove);
      content.removeEventListener("touchend", onTouchEnd);
      content.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <section
      className="bottom-sheet"
      aria-label={ui().controls.about}
      aria-hidden={snap === "hidden"}
      style={{
        height: fullHeight,
        transform: `translateY(${fullHeight - visible}px)`,
        transition: dragging ? "none" : "transform .28s cubic-bezier(.2,.8,.3,1)",
        // Once dismissed the sheet is off screen, it must not catch any taps
        pointerEvents: snap === "hidden" ? "none" : "auto",
      }}
    >
      <div
        className="bottom-sheet-handle"
        onPointerDown={startDrag}
        onPointerMove={(e) => moveDrag(e.clientY)}
        onPointerUp={(e) => endDrag(e.clientY, true)}
        onPointerCancel={(e) => endDrag(e.clientY, true)}
        role="button"
        tabIndex={0}
        aria-expanded={snap === "full"}
        title={snap === "full" ? ui().controls.dragDownToClose : ui().controls.dragUpForMore}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") applySnap("full");
          if (e.key === "ArrowDown") applySnap(snap === "full" ? "peek" : "hidden");
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            applySnap(snap === "full" ? "peek" : "full");
          }
        }}
      >
        <div className="bottom-sheet-grabber" />
      </div>
      <div
        className="bottom-sheet-content"
        ref={contentRef}
        style={{
          overflowY: contentScrolls ? "auto" : "hidden",
          touchAction: contentScrolls ? "pan-y" : "none",
          userSelect: contentScrolls ? "text" : "none",
        }}
        onScroll={onContentScroll}
        {...contentDragHandlers}
      >
        {children}
      </div>
    </section>
  );
};

export default BottomSheet;
