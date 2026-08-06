import React from "react";
import { Chip } from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

type ZoomInHintProps = {
  /** Zooms the map to where the points start loading */
  onClick: () => void;
  visible?: boolean;
};

/**
 * Shown when the view is too wide to query: at that scale an area search would
 * cover a whole region, so nothing new is loaded until the user comes closer.
 * The points already on the map stay where they are, hence "new".
 *
 * Tapping it does the zooming, so the hint is also the way out of it.
 */
const ZoomInHint: React.FC<ZoomInHintProps> = ({ onClick, visible = true }) => {
  if (!visible) return null;

  return (
    <div className="map-hint">
      <Chip
        icon={<ZoomInIcon />}
        label="Zoom in to load new points"
        onClick={onClick}
        sx={{
          background: "#fff",
          color: "black",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          height: 36,
          borderRadius: "1em",
          fontSize: ".875rem",
          "& .MuiChip-icon": { color: "#5f6368" },
        }}
      />
    </div>
  );
};

export default ZoomInHint;
