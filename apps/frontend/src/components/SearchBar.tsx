import React, { useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import GeocodeAutocomplete from "./GeocodeAutocomplete";

type SearchBarProps = {
  onSearch: (
    query: string,
    coords?: [number, number],
    /** How big the place is, where the geocoder knows: see Suggestion */
    extent?: [number, number, number, number]
  ) => void;
  placeholder?: string;
  visible?: boolean;
  searchPosition?: [number, number] | null;
  /** Closes the search bar and brings the category select back */
  onClose?: () => void;
};

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search for location",
  visible = true,
  onClose,
}) => {
  const [value, setValue] = useState("");
  const [autoFocus, setAutoFocus] = useState(false);

  // Auto-focus input when SearchBar becomes visible
  useEffect(() => {
    if (visible) {
      setAutoFocus(true);
    }
  }, [visible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  if (!visible) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="search-bar-row"
      // Escape is the way out of a search box, on top of the close button
      onKeyDown={(e) => {
        if (e.key === "Escape" && onClose) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <GeocodeAutocomplete
        onSelect={(selected, coords, extent) => {
          setValue(selected);
          onSearch(selected, coords, extent);
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        // Match the pill look of the other controls on top of the map
        styles={{
          margin: 0,
          maxWidth: 380,
          borderRadius: "999px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
        endAction={
          onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              title="Close search"
              aria-label="Close search"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )
        }
      />
    </form>
  );
};

export default SearchBar;
