import CircularProgress from "@mui/material/CircularProgress";
import React from "react";
import type { OverpassProgress } from "../api/overpass";
import { interpolate, ui } from "../copy";

type LoadingProps = {
  active?: boolean;
  /** Which mirror the query has got to, when it has had to go looking */
  progress?: OverpassProgress | null;
};

/**
 * That a search is running, said quietly and out of the way.
 *
 * A pill under the preset chips, in the same column as the rest of the
 * controls. It used to be a full screen scrim with a 64px spinner in the
 * middle of it, which stopped the reader for a request that usually takes
 * under a second, hid the map they were already looking at, and covered the
 * very controls somebody would reach for to pan somewhere else or give up. The
 * points arrive when they arrive; nothing about the map has to wait for them.
 *
 * The counter is the exception to how little this says, and it only appears
 * once a server has failed to answer: a search that is on its third mirror is
 * going to take seconds rather than milliseconds, and a reader watching a
 * spinner deserves to know it is not simply stuck.
 */
const Loading: React.FC<LoadingProps> = ({ active = false, progress }) => {
  if (!active) return null;

  const text = ui().controls.loading;
  const counter = progress
    ? interpolate(ui().controls.loadingServer, {
        server: String(progress.server),
        total: String(progress.total),
      })
    : null;

  const fallbackText = ui().controls.loadingFallback;

  return (
    // A live region rather than a busy state: this is a remark about what the
    // map is doing, and nothing here has taken the reader's focus. `role` is
    // enough on its own, it carries `aria-live="polite"` with it
    <div className="map-loading" role="status">
      <CircularProgress size={14} thickness={5} color="inherit" />
      <span>{text}</span>
      {counter && (
        // "2/4" is a shorthand, and on its own it is a riddle. The sentence it
        // stands for is what a pointer and a screen reader both get
        <span className="map-loading-server" title={fallbackText} aria-label={fallbackText}>
          {counter}
        </span>
      )}
    </div>
  );
};

export default Loading;
