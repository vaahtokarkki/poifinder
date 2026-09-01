import React from "react";
import LayersIcon from "@mui/icons-material/Layers";
import MapIconButton from "./MapIconButton";
import { ui } from "../copy";

type LayersIconButtonProps = {
  open: boolean;
  onClick: () => void;
};

/**
 * Opens the layers panel, from the lower left corner of the map.
 *
 * Its own corner, away from the tool column on the right: what is drawn on the
 * map is a different kind of decision from searching, sharing or getting a
 * route, and every map people already use puts it here. Whether it is rendered
 * at all is decided in App, next to the panel it opens.
 */
const LayersIconButton: React.FC<LayersIconButtonProps> = ({ open, onClick }) => (
  <MapIconButton onClick={onClick} title={ui().controls.layers.open} active={open}>
    <LayersIcon fontSize="medium" />
  </MapIconButton>
);

export default LayersIconButton;
