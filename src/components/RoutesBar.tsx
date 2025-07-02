import React, { useState } from "react";
import { Button, Card, CardContent, Typography } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import GeocodeAutoComplete from "./GeocodeAutocomplete";

type RoutesBarProps = {
  onSearch: (start: [number, number] | null, end: [number, number]) => void;
  placeholder?: string;
  visible?: boolean;
  displayRouteInfo?: boolean;
  deleteRoute?: () => void;
};

const RoutesBar: React.FC<RoutesBarProps> = ({
  onSearch,
  visible = true,
  displayRouteInfo = false,
  deleteRoute,
}) => {
  const [startLocationValue, setStartLocationValue] = useState("");
  const [endLocationValue, setEndLocationValue] = useState("");
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!endCoords) {
      // Prevent submit if either coordinate is missing
      return;
    }
    onSearch(startCoords, endCoords);
  };

  if (!visible) return null;

  if (displayRouteInfo) {
    return (
      <div>
        <Typography variant="h1" style={{fontSize: "1rem", margin: "0 auto .7em auto", padding: "0 1em"}}>
            Displaying points along route from {startLocationValue || "your location"} to {endLocationValue || "-"}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DeleteIcon />}
          color="error"
          style={{margin: "0 1em", marginTop: ".5em", textTransform: "none"}}
          onClick={() => {
            setStartLocationValue("");
            setEndLocationValue("");
            setStartCoords(undefined);
            setEndCoords(undefined);
            if (deleteRoute) deleteRoute();
          }}
        >
          Reset route
        </Button>
      </div>
    );
  }

  return (
    <>
      <Typography variant="h1" style={{fontSize: "1rem", margin: "0 auto .7em auto", padding: "0 1em"}}>
          Search points along route
      </Typography>
      <form onSubmit={handleSubmit} style={{display: "flex", flexDirection: "column", zIndex: 1000, maxWidth: 350}} >
        <GeocodeAutoComplete
          placeholder="Your location"
          onSelect={(label, coords) => {
            setStartLocationValue(label);
            setStartCoords(coords);
          }}
          onClear={() => {
            setStartLocationValue("");
            setStartCoords(undefined);
          }}
          styles={{border: "1px solid #0000001a"}}
        />
        <GeocodeAutoComplete
          placeholder="Destination location"
          onSelect={(label, coords) => {
            setEndLocationValue(label);
            setEndCoords(coords);
          }}
          onClear={() => {
            setEndLocationValue("");
            setEndCoords(undefined);
          }}
          styles={{border: "1px solid #0000001a"}}
        />
        <Button
          variant="outlined"
          style={{ textTransform: "none", margin: "0 .5em" }}
          onClick={handleSubmit}
          sx={{marginTop: ".5em"}}
          disabled={!endCoords}
        >
          Search route
        </Button>
      </form>
    </>
  );
};

export default RoutesBar;
