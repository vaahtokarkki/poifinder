import React, { useState } from "react";
import SearchIcon from '@mui/icons-material/Search';
import { Button, Input, InputAdornment, Card, CardContent, Typography } from "@mui/material";
import FmdGoodIcon from '@mui/icons-material/FmdGood';
import DeleteIcon from '@mui/icons-material/Delete';

type RoutesBarProps = {
  onSearch: (start: string, end: string) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(startLocationValue, endLocationValue);
  };

  if (!visible) return null;

  if (displayRouteInfo) {
    return (
      <Card style={{ margin: "1em 1em 0 1em", borderRadius: "1em", maxWidth: 350, zIndex: 1000, padding: "1em 1.5em"}}>
        <CardContent style={{padding: 0}}>
          <Typography variant="body2" >
            Search POIs along {startLocationValue || "your location"} and {endLocationValue || "-"}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DeleteIcon />}
            color="error"
            style={{padding: ".2em .5em", marginTop: ".5em"}}
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
      <Input
        type="text"
        disableUnderline={true}
        placeholder="Your location"
        value={startLocationValue}
        onChange={(e) => setStartLocationValue(e.target.value)}
        style={{ background: "#fff", zIndex: 1000, margin: ".5em"}}
        startAdornment={
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        }
      />
      <Input
        type="text"
        disableUnderline={true}
        placeholder="Destination location"
        value={endLocationValue}
        onChange={(e) => setEndLocationValue(e.target.value)}
        style={{ background: "#fff", zIndex: 1000, margin: ".5em"}}
        startAdornment={
          <InputAdornment position="start">
            <FmdGoodIcon />
          </InputAdornment>
        }
      />
      <Button
        variant="outlined"
        style={{ textTransform: "none", margin: "0 .5em" }}
        onClick={handleSubmit}
      >
        Search
      </Button>
    </form>
  );
};

export default RoutesBar;
