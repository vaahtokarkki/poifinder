import React from "react";
import { Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

type SearchAreaButtonProps = {
  onClick: () => void;
  visible?: boolean;
};

const SearchPoisButton: React.FC<SearchAreaButtonProps> = ({ onClick, visible = true }) => {
  if (!visible) return null;

  return (
    <div
      style={{
        zIndex: 1000,
        margin: "1em 0 0 1.5em",
        display: "flex",
        justifyContent: "center"
      }}
    >
      <Button
        variant="contained"
        endIcon={<SearchIcon />}
        style={{
          borderRadius: "1em",
          textTransform: "none",
          zIndex: 1000,
          background: "#fff",
          color: "black",
        }}
        onClick={onClick}
      >
        Search from this area
      </Button>
    </div>
  );
};

export default SearchPoisButton;
