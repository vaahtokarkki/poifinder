import React, { useState } from "react";
import SearchIcon from '@mui/icons-material/Search';
import { Input, InputAdornment } from "@mui/material";

type SearchBarProps = {
  onSearch: (query: string) => void;
  placeholder?: string;
  visible?: boolean;
};

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search for location",
  visible = true,
}) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  if (!visible) return null;

  return (
    <form onSubmit={handleSubmit}>
      <Input
        disableUnderline={true}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ background: "#fff", zIndex: 1000, borderRadius: "1.5em", margin: ".75em 1em 0 1em", padding: ".5em", display: "flex", flexGrow: 1, maxWidth: 350}}
        startAdornment={
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        }
      />
    </form>
  );
};

export default SearchBar;
