import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MapIconButton from './MapIconButton';
import { ui } from '../copy';

type MoreControlsIconButtonProps = {
  onClick: () => void;
  expanded: boolean;
};

/** Opens the rest of the control column, and folds it back when expanded */
const MoreControlsIconButton: React.FC<MoreControlsIconButtonProps> = ({ onClick, expanded }) => (
  <MapIconButton
    onClick={onClick}
    title={expanded ? ui().controls.hideMapTools : ui().controls.showMapTools}
    active={expanded}
  >
    {expanded ? <KeyboardArrowDownIcon fontSize="medium" /> : <AddIcon fontSize="medium" />}
  </MapIconButton>
);

export default MoreControlsIconButton;
