import React, { useState, useRef } from "react";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import { useUserPosition } from "../hooks/index";

type GeocodeAutoCompleteProps = {
  label?: string;
  onSelect: (value: string, coords?: [number, number]) => void;
  placeholder?: string;
};

type Suggestion = {
  label: string;
  coords: [number, number];
};

const GeocodeAutocomplete: React.FC<GeocodeAutoCompleteProps> = ({
  onSelect,
  placeholder = "Type a location",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Use user position from hook
  const { position: userPosition } = useUserPosition();

  // Fetch suggestions from photon.komoot.io
  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`;
      if (
        userPosition &&
        typeof userPosition.lat === "number" &&
        typeof userPosition.lng === "number"
      ) {
        url += `&lat=${userPosition.lat}&lon=${userPosition.lng}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setOptions(
        (data.features || []).map(
          (item: any) => {
            const label =
              item.properties &&
              (item.properties.label ||
                item.properties.name ||
                item.properties.city ||
                item.properties.country);
            const coords =
              item.geometry &&
              Array.isArray(item.geometry.coordinates)
                ? [item.geometry.coordinates[1], item.geometry.coordinates[0]]
                : undefined;
            return label && coords ? { label, coords } : null;
          }
        ).filter(Boolean)
      );
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setOptions([]);
    }
    setLoading(false);
  };

  const handleInputChange = (_: any, value: string, reason: string) => {
    setInputValue(value);
    // Only fetch suggestions if the change is from user input, not from option selection
    if (reason === "input") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 400);
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
        margin: ".5em 1.5em",
        padding: "0",
        display: "flex",
        flexGrow: 1,
        maxWidth: 350,
      }}
      sx={{
            ".MuiAutocomplete-inputRoot": { padding: ".2em" },
          }}
    />
  );
};

export default GeocodeAutocomplete;
