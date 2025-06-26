import React, { useState } from "react";
import GeocodeAutocomplete from "./GeocodeAutocomplete";

type SearchBarProps = {
  onSearch: (query: string, coords?: [number, number]) => void;
  placeholder?: string;
  visible?: boolean;
  searchPosition?: [number, number] | null;
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
    <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center" }}>
      <GeocodeAutocomplete
        onSelect={(selected, coords) => {
          setValue(selected);
          onSearch(selected, coords);
        }}
        placeholder={placeholder}
      />
    </form>
  );
};

export default SearchBar;
