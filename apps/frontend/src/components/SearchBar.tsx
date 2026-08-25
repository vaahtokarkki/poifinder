import React, { useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import GeocodeAutocomplete from "./GeocodeAutocomplete";
import { ui } from "../copy";

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
  placeholder,
  visible = true,
  onClose,
}) => {
  // Defaulted here rather than in the parameter list: a default there is
  // evaluated once per render but written in the module's language at the time
  // the file is read, and this one has to follow the selector
  const placeholderText = placeholder ?? ui().controls.searchPlaceholder;
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
        placeholder={placeholderText}
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
              title={ui().controls.closeSearch}
              aria-label={ui().controls.closeSearch}
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
