import { Box, Chip, FormControl, ListSubheader } from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import React from "react";
import { CATEGORIES, CATEGORY_CONFIG, CATEGORY_GROUP, CATEGORY_GROUP_DISPLAY } from "../constants";

type CategorySelectProps = {
  value: CATEGORIES[];
  onChange: (value: CATEGORIES[]) => void;
  onClose?: () => void;
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
  onClose,
}) => {
  return (
    <div
      style={{
        zIndex: 1000,
        flexGrow: 1,
        maxWidth: 400,
        margin: ".5em 1em .5em 1em",
      }}
    >
      <FormControl fullWidth size="small">
        <Select
          labelId="category-select-label"
          variant="outlined"
          multiple
          value={value}
          sx={{
            "& fieldset": { border: 'none' },
          }}
          onChange={(e) => {
            const selected = e.target.value as CATEGORIES[];
            onChange(selected);
          }}
          onClose={onClose}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((val) => {
                const cat = categories.find((c) => c.value === val);
                return (
                  <Chip
                    key={val}
                    label={cat ? cat.label : val}
                  />
                );
              })}
            </Box>
          )}
          style={{background: "#fff", borderRadius: "1em", padding: 0, }}
        >
          {Object.values(CATEGORY_GROUP)
            .filter((g) => typeof g === "number")
            .flatMap((group) => [
              <ListSubheader
                key={`subheader-${group}`}
                style={{ lineHeight: "2em", padding: ".2em 1em"}}
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
                  <Checkbox checked={value.indexOf(cat.value) > -1} style={{ padding: ".4em .5em"}}/>
                  <ListItemText primary={cat.label} />
                </MenuItem>
              ))
            ])}
        </Select>
      </FormControl>
    </div>
  );
};

export default CategorySelect;
