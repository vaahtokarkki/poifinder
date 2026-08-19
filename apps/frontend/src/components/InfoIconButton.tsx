import React from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MapIconButton from './MapIconButton';

type InfoIconButtonProps = {
  onClick: () => void;
};

const InfoIconButton: React.FC<InfoIconButtonProps> = ({ onClick }) => (
  <MapIconButton onClick={onClick} title="About this app">
    <InfoOutlinedIcon fontSize="medium" />
  </MapIconButton>
);

export default InfoIconButton;
