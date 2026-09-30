import React from "react";
import { ui } from "../copy";
import { Chip } from "@mui/material";
import DirectionsIcon from "@mui/icons-material/Directions";
import CloseIcon from "@mui/icons-material/Close";

type RouteHintProps = {
  /** Removes the route, the map goes back to loading the points of the view */
  onClose: () => void;
  visible?: boolean;
};

/**
 * Shown while a route is on the map, in the slot the zoom hint uses: the points
 * are those along the route rather than those of the view, and panning will
 * not load new ones. The cross is the way out of it.
 */
const RouteHint: React.FC<RouteHintProps> = ({ onClose, visible = true }) => {
  if (!visible) return null;

  return (
    <div className="map-hint">
      <Chip
        icon={<DirectionsIcon />}
        label={ui().controls.routeHint}
        onDelete={onClose}
        deleteIcon={<CloseIcon aria-label={ui().controls.closeRoute} />}
        sx={{
          background: "#fff",
          color: "black",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          height: 36,
          borderRadius: "1em",
          fontSize: ".875rem",
          "& .MuiChip-icon": { color: "#5f6368" },
          "& .MuiChip-deleteIcon": { color: "#5f6368" },
        }}
      />
    </div>
  );
};

export default RouteHint;
