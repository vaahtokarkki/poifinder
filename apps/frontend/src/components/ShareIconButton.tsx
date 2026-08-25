import React from 'react';
import ShareIcon from '@mui/icons-material/Share';
import MapIconButton from './MapIconButton';
import { ui } from '../copy';

type ShareIconButtonProps = {
  onClick: () => void;
};

const ShareIconButton: React.FC<ShareIconButtonProps> = ({ onClick }) => (
  <MapIconButton onClick={onClick} title={ui().controls.share}>
    <ShareIcon fontSize="medium" />
  </MapIconButton>
);

export default ShareIconButton;
