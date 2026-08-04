import React from 'react';
import DirectionsIcon from '@mui/icons-material/Directions';
import MapIconButton from './MapIconButton';

type DirectionsIconButtonProps = {
  onClick: () => void;
  active?: boolean;
};

const DirectionsIconButton: React.FC<DirectionsIconButtonProps> = ({ onClick, active }) => (
  <MapIconButton onClick={onClick} active={active} title="Directions">
    <DirectionsIcon fontSize="medium" />
  </MapIconButton>
);

export default DirectionsIconButton;
