import React from 'react';
import SearchIcon from '@mui/icons-material/Search';

type SearchIconButtonProps = {
  onClick: () => void;
  active?: boolean;
};

const SearchIconButton: React.FC<SearchIconButtonProps> = ({
  onClick,
  active,
}) => <div
    style={{
      position: "absolute",
      bottom: 100,
      right: 24,
      zIndex: 1200,
      background: active ? "#1976d2" : "white",
      borderRadius: "50%",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      padding: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      marginBottom: 8,
    }}
    onClick={onClick}
    title="Show/hide search bar">
    <SearchIcon
      fontSize="medium"
      style={{ color: active ? "white" : "black" }}
    />
  </div>

export default SearchIconButton;
