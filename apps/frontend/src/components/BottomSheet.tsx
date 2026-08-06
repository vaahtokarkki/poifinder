import React, { useCallback, useEffect, useRef, useState } from "react";

export type SheetSnap = "hidden" | "peek" | "full";

/** Dragged all the way down the sheet is gone, a reload brings it back */
const HIDDEN_HEIGHT = 0;
/** A drag shorter than this is a tap on the handle, not a drag */
const TAP_THRESHOLD = 6;
/** A drag longer than this moves on in the drag direction */
const DIRECTION_THRESHOLD = 50;

type BottomSheetProps = {
  /** Height of the collapsed state, enough for a short summary */
  peekHeight?: number;
  children: React.ReactNode;
};

const fullHeightForWindow = () =>
  Math.min(Math.round(window.innerHeight * 0.85), 680);

/**
 * A bottom sheet that can be dragged between three states: peek, full and
 * hidden. Dragging it all the way down dismisses it for the rest of the visit,
 * as in the Google Maps app.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({
  peekHeight = 172,
  children,
}) => {
  const [fullHeight, setFullHeight] = useState(fullHeightForWindow);
  const [snap, setSnap] = useState<SheetSnap>("peek");
  const [dragging, setDragging] = useState(false);

  const heightFor = useCallback(
    (target: SheetSnap) => {
      if (target === "hidden") return HIDDEN_HEIGHT;
      if (target === "peek") return Math.min(peekHeight, fullHeight);
      return fullHeight;
    },
    [peekHeight, fullHeight]
  );

  const [visible, setVisible] = useState(() => heightFor("peek"));

  // Where the drag started, so the movement can be turned into a height
  const dragStartRef = useRef<{ y: number; visible: number } | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

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

  const snapPoints: { snap: SheetSnap; height: number }[] = [
    { snap: "hidden", height: heightFor("hidden") },
    { snap: "peek", height: heightFor("peek") },
    { snap: "full", height: heightFor("full") },
  ];

  const nearestSnap = (height: number, candidates = snapPoints) =>
    candidates.reduce((closest, point) =>
      Math.abs(point.height - height) < Math.abs(closest.height - height) ? point : closest
    );

  const startDrag = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { y: e.clientY, visible };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start) return;
    // Dragging up grows the sheet, down shrinks it
    const next = start.visible + (start.y - e.clientY);
    setVisible(Math.max(HIDDEN_HEIGHT, Math.min(fullHeight, next)));
  };

  const handlePointerUp = (e: React.PointerEvent, tapTogglesSheet: boolean) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setDragging(false);
    if (!start) return;

    const dragged = visible - start.visible;

    // A tap on the handle opens the sheet, and closes it once fully open
    if (Math.abs(e.clientY - start.y) < TAP_THRESHOLD) {
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

  // Only the fully open sheet scrolls its content, in the other states the
  // content is a drag surface of its own
  const contentScrolls = snap === "full" && !dragging;
  const contentDragHandlers = contentScrolls
    ? {}
    : {
        onPointerDown: startDrag,
        onPointerMove: handlePointerMove,
        onPointerUp: (e: React.PointerEvent) => handlePointerUp(e, false),
        onPointerCancel: (e: React.PointerEvent) => handlePointerUp(e, false),
      };

  return (
    <section
      className="bottom-sheet"
      aria-label="About this app"
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
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp(e, true)}
        onPointerCancel={(e) => handlePointerUp(e, true)}
        role="button"
        tabIndex={0}
        aria-expanded={snap === "full"}
        title={snap === "full" ? "Drag down to close" : "Drag up for more"}
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
        {...contentDragHandlers}
      >
        {children}
      </div>
    </section>
  );
};

export default BottomSheet;
