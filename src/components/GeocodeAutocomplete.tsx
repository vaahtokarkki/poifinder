import React, { useState, useRef } from "react";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import { useUserPosition } from "../hooks/index";
import { fetchSuggestions, Suggestion } from "../api/geocode";

type GeocodeAutoCompleteProps = {
  label?: string;
  onSelect: (value: string, coords?: [number, number]) => void;
  placeholder?: string;
  styles?: React.CSSProperties;
  onClear?: () => void; // <-- add this prop
};

const GeocodeAutocomplete: React.FC<GeocodeAutoCompleteProps> = ({
  onSelect,
  placeholder = "Type a location",
  styles,
  onClear,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Use user position from hook
  const { position: userPosition } = useUserPosition();

  // Fetch suggestions from photon.komoot.io (now imported)
  const handleFetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const results = await fetchSuggestions(query, userPosition);
      setOptions(results);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setOptions([]);
    }
    setLoading(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInputChange = (_: any, value: string, reason: string) => {
    setInputValue(value);
    // Only fetch suggestions if the change is from user input, not from option selection
    if (reason === "input") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        handleFetchSuggestions(value);
      }, 400);
      if (value === "" && typeof onClear === "function") {
        onClear();
      }
    }
  };

  return (
    <Autocomplete
      freeSolo
      options={options}
      loading={loading}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
      onInputChange={handleInputChange}
      onChange={(_, value) => {
        if (typeof value === "string") {
          setInputValue(value);
          onSelect(value);
        } else if (value && typeof value === "object" && "label" in value && "coords" in value) {
          setInputValue(value.label);
          onSelect(value.label, value.coords);
        }
      }}
      inputValue={inputValue}
      renderInput={(params) => (
        <TextField
          style={{ zIndex:1000, background: "#fff", borderRadius: "2em", padding: "0" }}
          {...params}
          placeholder={placeholder}
          sx={{
            "& fieldset": { border: 'none' },
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      style={{
        background: "#fff",
        zIndex: 1000,
        borderRadius: "1.5em",
        margin: ".5em 1em .5em 1em",
        padding: "0",
        display: "flex",
        flexGrow: 1,
        maxWidth: 350,
        ...(typeof (styles) === "object" ? styles : {}),
      }}
      sx={{
        ".MuiAutocomplete-inputRoot": { padding: ".2em" },
      }}
    />
  );
};

export default GeocodeAutocomplete;
