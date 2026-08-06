import { Box, Chip, FormControl, ListSubheader } from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import TuneIcon from "@mui/icons-material/Tune";
import React from "react";
import { CATEGORIES, CATEGORY_CONFIG, CATEGORY_GROUP, CATEGORY_GROUP_DISPLAY } from "../constants";

// Value of the clear action, kept apart from the numeric category values
const CLEAR_ALL = "clear-all";

// How many category names fit on the closed, single line control
const VISIBLE_CHIPS = 2;

type CategorySelectProps = {
  value: CATEGORIES[];
  onChange: (value: CATEGORIES[]) => void;
  /** Called when the menu closes, but only if the selection really changed */
  onCommit?: () => void;
  visible: boolean;
};

// Build categories array from CATEGORY_CONFIG, including group
const categories = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
  label: config.display,
  value: Number(key) as CATEGORIES,
  group: config.group,
}));

// Group categories by group
const groupedCategories: Record<CATEGORY_GROUP, typeof categories> = Object.values(CATEGORY_GROUP)
  .filter((g) => typeof g === "number")
  .reduce((acc, group) => {
    acc[group as CATEGORY_GROUP] = categories.filter((cat) => cat.group === group);
    return acc;
  }, {} as Record<CATEGORY_GROUP, typeof categories>);

const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  onCommit,
  visible,
}) => {
  // The selection as it was when the menu was opened, to tell whether closing
  // it is worth a new query
  const valueOnOpenRef = React.useRef<CATEGORIES[]>(value);
  // Controlled, so the adornment can open the menu as well: the icon sits
  // beside the trigger, a tap on it never reaches the select itself
  const [open, setOpen] = React.useState(false);

  if (!visible) return null;

  const selectionChanged = (before: CATEGORIES[], after: CATEGORIES[]) =>
    before.length !== after.length || before.some((cat) => !after.includes(cat));

  const handleOpen = () => {
    valueOnOpenRef.current = value;
    setOpen(true);
  };

  return (
    <FormControl className="category-select" size="small">
      <Select
        labelId="category-select-label"
        variant="outlined"
        multiple
        displayEmpty
        value={value}
        title="Select the categories to show on the map"
        startAdornment={
          <TuneIcon
            fontSize="small"
            role="button"
            aria-label="Select the categories to show on the map"
            sx={{ color: "#5f6368", ml: 0.5, mr: 0.75, cursor: "pointer" }}
            // The icon is not a focus target, the menu takes the focus itself
            onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
            onClick={handleOpen}
          />
        }
        MenuProps={{
          sx: { maxHeight: "70vh" },
          // Without this MUI focuses the selected item on every render of the
          // open menu, which scrolls the list back to the top as soon as the
          // last selection is cleared
          disableAutoFocusItem: true,
        }}
        sx={{
          background: "#fff",
          borderRadius: "999px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          "& fieldset": { border: "none" },
          "& .MuiSelect-select": {
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            minHeight: "unset !important",
            padding: "8px 32px 8px 4px",
            overflow: "hidden",
          },
        }}
        onChange={(e) => {
          const selected = e.target.value as (CATEGORIES | string)[];
          // The clear action is a menu item of its own, picking it empties
          // the selection instead of adding to it
          if (selected.includes(CLEAR_ALL)) {
            onChange([]);
            return;
          }
          onChange(selected as CATEGORIES[]);
        }}
        open={open}
        onOpen={handleOpen}
        onClose={() => {
          setOpen(false);
          if (selectionChanged(valueOnOpenRef.current, value)) onCommit?.();
        }}
        renderValue={(selected) => {
          if (selected.length === 0) {
            return (
              <Box component="span" sx={{ color: "#5f6368", fontSize: ".9rem", pr: 1 }}>
                Choose categories
              </Box>
            );
          }
          // Only the first few names fit, the rest are summed up as "+N"
          const shown = selected.slice(0, VISIBLE_CHIPS);
          const hidden = selected.length - shown.length;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, overflow: "hidden" }}>
              {shown.map((val) => {
                const cat = categories.find((c) => c.value === val);
                return (
                  <Chip
                    key={val}
                    size="small"
                    label={cat ? cat.label : val}
                    sx={{ background: "rgba(0, 0, 0, 0.06)", maxWidth: 130 }}
                  />
                );
              })}
              {hidden > 0 && (
                <Box component="span" sx={{ color: "#5f6368", fontSize: ".85rem", whiteSpace: "nowrap" }}>
                  +{hidden}
                </Box>
              )}
            </Box>
          );
        }}
      >
        <MenuItem
          value={CLEAR_ALL}
          disabled={value.length === 0}
          style={{
            padding: "0 1em",
            borderBottom: "1px solid #0000001a",
          }}
        >
          <ClearAllIcon fontSize="small" style={{ margin: ".4em .7em .4em .5em" }} />
          <ListItemText primary="Clear all selections" />
        </MenuItem>
        {Object.values(CATEGORY_GROUP)
          .filter((g) => typeof g === "number")
          .flatMap((group) => [
            <ListSubheader
              key={`subheader-${group}`}
              style={{ lineHeight: "2em", padding: ".2em 1em" }}
            >
              {CATEGORY_GROUP_DISPLAY[group as CATEGORY_GROUP]}
            </ListSubheader>,
            ...groupedCategories[group as CATEGORY_GROUP].map((cat) => (
              <MenuItem
                key={cat.value}
                value={cat.value}
                style={{ padding: "0 1em" }}
                onClick={() => {
                  const alreadySelected = value.includes(cat.value);
                  const newSelected = alreadySelected
                    ? value.filter((v) => v !== cat.value)
                    : [...value, cat.value];
                  onChange(newSelected);
                }}
              >
                <Checkbox checked={value.indexOf(cat.value) > -1} style={{ padding: ".4em .5em" }} />
                <ListItemText primary={cat.label} />
              </MenuItem>
            ))
          ])}
      </Select>
    </FormControl>
  );
};

export default CategorySelect;
