import React from 'react';
import ShareIcon from '@mui/icons-material/Share';
import MapIconButton from './MapIconButton';

type ShareIconButtonProps = {
  onClick: () => void;
};

const ShareIconButton: React.FC<ShareIconButtonProps> = ({ onClick }) => (
  <MapIconButton onClick={onClick} title="Share this view">
    <ShareIcon fontSize="medium" />
  </MapIconButton>
);

export default ShareIconButton;
