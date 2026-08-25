import React from 'react';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import MapIconButton from './MapIconButton';
import { ui } from '../copy';

type MyLocationIconButtonProps = {
  onClick: () => void;
};

const MyLocationIconButton: React.FC<MyLocationIconButtonProps> = ({ onClick }) => (
  <MapIconButton onClick={onClick} title={ui().controls.myLocation}>
    <MyLocationIcon fontSize="medium" />
  </MapIconButton>
);

export default MyLocationIconButton;
