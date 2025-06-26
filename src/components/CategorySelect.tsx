import { Box, Chip } from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import React from "react";

type CategorySelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

const categories = [
  { label: "Playgrounds", value: "leisure=playground" },
  { label: "Post boxes", value: "amenity=post_box" },
  { label: "Toilets", value: "amenity=toilets" },
];

const CategorySelect: React.FC<CategorySelectProps & { onClose?: () => void }> = ({
  value,
  onChange,
  onClose,
}) => (
  <div
    style={{
      zIndex: 1000,
      flexGrow: 1,
      maxWidth: 400,
      padding: "0 0.5em",
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
          const selected = e.target.value as string[];
          onChange(selected);
        }}
        onClose={onClose}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((val) => {
              const cat = categories.find((c) => c.value === val);
              return <Chip key={val} label={cat ? cat.label : val} />;
            })}
          </Box>
        )}
        style={{background: "#fff", borderRadius: "1em", margin: "0 1em 0 1em", padding: 0, }}
      >
        {categories.map((cat) => (
          <MenuItem key={cat.value} value={cat.value}>
            <Checkbox checked={value.indexOf(cat.value) > -1} />
            <ListItemText primary={cat.label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </div>
);

export default CategorySelect;
