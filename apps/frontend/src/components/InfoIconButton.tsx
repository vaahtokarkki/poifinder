import React from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MapIconButton from './MapIconButton';
import { ui } from '../copy';

type InfoIconButtonProps = {
  onClick: () => void;
};

const InfoIconButton: React.FC<InfoIconButtonProps> = ({ onClick }) => (
  <MapIconButton onClick={onClick} title={ui().controls.about}>
    <InfoOutlinedIcon fontSize="medium" />
  </MapIconButton>
);

export default InfoIconButton;
