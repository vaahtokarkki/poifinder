import React from 'react';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import MapIconButton from './MapIconButton';

type MyLocationIconButtonProps = {
  onClick: () => void;
};

const MyLocationIconButton: React.FC<MyLocationIconButtonProps> = ({ onClick }) => (
  <MapIconButton onClick={onClick} title="Center map to your location">
    <MyLocationIcon fontSize="medium" />
  </MapIconButton>
);

export default MyLocationIconButton;
