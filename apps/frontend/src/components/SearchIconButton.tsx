import React from 'react';
import SearchIcon from '@mui/icons-material/Search';
import MapIconButton from './MapIconButton';

type SearchIconButtonProps = {
  onClick: () => void;
  active?: boolean;
};

const SearchIconButton: React.FC<SearchIconButtonProps> = ({ onClick, active }) => (
  <MapIconButton onClick={onClick} active={active} title="Show/hide search bar">
    <SearchIcon fontSize="medium" />
  </MapIconButton>
);

export default SearchIconButton;
