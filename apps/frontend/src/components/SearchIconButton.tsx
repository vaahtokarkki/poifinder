import React from 'react';
import SearchIcon from '@mui/icons-material/Search';
import MapIconButton from './MapIconButton';
import { ui } from '../copy';

type SearchIconButtonProps = {
  onClick: () => void;
  active?: boolean;
};

const SearchIconButton: React.FC<SearchIconButtonProps> = ({ onClick, active }) => (
  <MapIconButton onClick={onClick} active={active} title={ui().controls.toggleSearch}>
    <SearchIcon fontSize="medium" />
  </MapIconButton>
);

export default SearchIconButton;
