import React, { useState } from "react";
import { Button, MenuItem, TextField, Typography } from "@mui/material";
import GeocodeAutoComplete from "./GeocodeAutocomplete";
import { ui } from "../copy";

/** How far either side of the route points are looked for, in metres */
export const ROUTE_RADII = [100, 250, 500, 1000, 2000] as const;
export const DEFAULT_ROUTE_RADIUS = 500;

/** What the form was filled in with, kept by the app while the route is shown */
export type RouteQuery = {
  startLabel: string;
  start: [number, number] | null;
  endLabel: string;
  end: [number, number];
  radius: number;
};

type RoutesBarProps = {
  onSearch: (query: RouteQuery) => void;
  /** The query of the route on the map, so reopening the form shows it again */
  initial?: RouteQuery | null;
  visible?: boolean;
};

const formatRadius = (metres: number) =>
  metres >= 1000 ? `${metres / 1000} km` : `${metres} m`;

const RoutesBar: React.FC<RoutesBarProps> = ({
  onSearch,
  initial,
  visible = true,
}) => {
  const [startLocationValue, setStartLocationValue] = useState(initial?.startLabel ?? "");
  const [endLocationValue, setEndLocationValue] = useState(initial?.endLabel ?? "");
  const [startCoords, setStartCoords] = useState<[number, number] | null>(initial?.start ?? null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(initial?.end ?? null);
  const [radius, setRadius] = useState(initial?.radius ?? DEFAULT_ROUTE_RADIUS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!endCoords) {
      // Prevent submit if either coordinate is missing
      return;
    }
    onSearch({
      startLabel: startLocationValue,
      start: startCoords,
      endLabel: endLocationValue,
      end: endCoords,
      radius,
    });
  };

  if (!visible) return null;

  return (
    <>
      <Typography variant="h2" style={{fontSize: "1rem", margin: "0 auto .7em auto", padding: "0 1em"}}>
          {ui().controls.routeHeading}
      </Typography>
      <form onSubmit={handleSubmit} style={{display: "flex", flexDirection: "column", zIndex: 1000, maxWidth: 350}} >
        <GeocodeAutoComplete
          placeholder={ui().controls.routeStart}
          initialValue={startLocationValue}
          onSelect={(label, coords) => {
            setStartLocationValue(label);
            setStartCoords(coords ?? null);
          }}
          onClear={() => {
            setStartLocationValue("");
            setStartCoords(null);
          }}
          styles={{border: "1px solid #0000001a"}}
        />
        <GeocodeAutoComplete
          placeholder={ui().controls.routeEnd}
          initialValue={endLocationValue}
          onSelect={(label, coords) => {
            setEndLocationValue(label);
            setEndCoords(coords ?? null);
          }}
          onClear={() => {
            setEndLocationValue("");
            setEndCoords(null);
          }}
          styles={{border: "1px solid #0000001a"}}
        />
        <TextField
          select
          size="small"
          label={ui().controls.routeRadius}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          sx={{
            margin: ".5em 1em",
            background: "#fff",
            "& .MuiOutlinedInput-root": { borderRadius: "1.5em" },
          }}
        >
          {ROUTE_RADII.map((r) => (
            <MenuItem key={r} value={r}>{formatRadius(r)}</MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          style={{ textTransform: "none", margin: "0 .5em" }}
          onClick={handleSubmit}
          sx={{marginTop: ".5em"}}
          disabled={!endCoords}
        >
          {ui().controls.routeSubmit}
        </Button>
      </form>
    </>
  );
};

export default RoutesBar;
