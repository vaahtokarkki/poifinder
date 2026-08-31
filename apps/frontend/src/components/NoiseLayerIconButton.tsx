import React from "react";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import MapIconButton from "./MapIconButton";
import { ui } from "../copy";
import { noiseTilesConfigured } from "../map/noiseTiles";

type NoiseLayerIconButtonProps = {
  active: boolean;
  onClick: () => void;
};

/**
 * Shows and hides the modelled noise bands.
 *
 * Renders nothing at all when no tile server is configured, rather than a
 * disabled control: a button that cannot do anything is a question the reader
 * has to answer, and the answer is not interesting. A build without
 * VITE_NOISE_TILES_URL should look like a build that never had the feature.
 *
 * Note that this only controls what is *drawn*. The layer itself is in the
 * style either way, and the popup reads the band from it whether the wash is
 * on the screen or not — see setNoiseVisible.
 */
const NoiseLayerIconButton: React.FC<NoiseLayerIconButtonProps> = ({
  active,
  onClick,
}) => {
  if (!noiseTilesConfigured) return null;

  return (
    <MapIconButton onClick={onClick} title={ui().controls.noiseLayer} active={active}>
      <VolumeUpIcon fontSize="medium" />
    </MapIconButton>
  );
};

export default NoiseLayerIconButton;
