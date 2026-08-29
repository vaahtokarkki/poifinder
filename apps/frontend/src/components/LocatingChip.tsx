import CircularProgress from "@mui/material/CircularProgress";
import React from "react";
import { ui } from "../copy";
import { useGpsStatus } from "../hooks";

/**
 * That the device has not found itself yet, said in the same pill the search
 * uses.
 *
 * Before this the only sign of a missing fix was that the dot on the map was
 * grey instead of blue, which is a difference nobody notices and nothing
 * explains — and on the first visit there is no dot at all, so a map centred
 * on a guessed city looked like a map that had decided where you were. The
 * pill is the honest version: something is happening, it is about position,
 * and it is not finished.
 *
 * It takes itself down the moment a fix arrives, and never appears at all
 * where it would only nag: a browser with no geolocation, or a visitor who has
 * refused it, is not waiting for anything.
 */
const LocatingChip: React.FC = () => {
  const status = useGpsStatus();

  if (status !== "waiting") return null;

  const text = ui().controls.gpsWaiting;
  const hint = ui().controls.gpsWaitingHint;

  return (
    // Polite, like the search pill: this is a remark about what the map is
    // doing and it must not interrupt whatever the reader is doing
    <div className="map-loading map-locating" role="status" title={hint} aria-label={hint}>
      <CircularProgress size={14} thickness={5} color="inherit" />
      <span>{text}</span>
    </div>
  );
};

export default LocatingChip;
