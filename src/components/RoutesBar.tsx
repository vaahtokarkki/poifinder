import React, { useState } from "react";
import { Button, Card, CardContent, Typography } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import GeocodeAutoComplete from "./GeocodeAutocomplete";

type RoutesBarProps = {
  onSearch: (start: [number, number], end: [number, number]) => void;
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
  const [startCoords, setStartCoords] = useState<[number, number] | undefined>();
  const [endCoords, setEndCoords] = useState<[number, number] | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startCoords || !endCoords) {
      // Prevent submit if either coordinate is missing
      return;
    }
    onSearch(startCoords, endCoords);
  };

  if (!visible) return null;

  if (displayRouteInfo) {
    return (
      <Card style={{ margin: "1em 1em 0 1em", borderRadius: "1em", maxWidth: 350, zIndex: 1000, padding: "1em 1.5em", boxShadow: "0 2px 8px rgba(0,0,0,0.15)"}}>
        <CardContent style={{padding: 0}}>
          <Typography variant="body2" >
            Search POIs along {startLocationValue || "your location"} and {endLocationValue || "-"}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DeleteIcon />}
            color="error"
            style={{padding: ".2em .5em", marginTop: ".5em", textTransform: "none"}}
            onClick={deleteRoute}
          >
            Reset route
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{display: "flex", flexDirection: "column", padding: "0.5em", margin: "1em 1em 0 1em", borderRadius:"1em", background: "white", zIndex: 1000, maxWidth: 350}} >
      <GeocodeAutoComplete
        placeholder="Your location"
        onSelect={(label, coords) => {
          setStartLocationValue(label);
          setStartCoords(coords);
        }}
        styles={{margin: 0}}
      />
      <GeocodeAutoComplete
        placeholder="Destination location"
        onSelect={(label, coords) => {
          setEndLocationValue(label);
          setEndCoords(coords);
        }}
        styles={{margin: 0}}
      />
      <Button
        variant="outlined"
        style={{ textTransform: "none", margin: "0 .5em" }}
        onClick={handleSubmit}
        sx={{marginTop: ".5em"}}
        disabled={!startCoords || !endCoords}
      >
        Search route
      </Button>
    </form>
  );
};

export default RoutesBar;
