import React from "react";
import { Chip } from "@mui/material";
import { CATEGORIES, CATEGORY_PRESETS, isPresetActive } from "../constants";

type CategoryPresetsProps = {
  value: CATEGORIES[];
  /** Called with the categories of the preset, an active preset clears them */
  onSelect: (categories: CATEGORIES[]) => void;
  visible?: boolean;
};

/**
 * A row of ready made category combinations, e.g. "Road trip" or "With kids".
 * Always one line, scrolled sideways when the presets do not all fit.
 */
const CategoryPresets: React.FC<CategoryPresetsProps> = ({
  value,
  onSelect,
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <div className="category-presets">
      {CATEGORY_PRESETS.map((preset) => {
        const active = isPresetActive(preset, value);
        return (
          <Chip
            key={preset.label}
            label={preset.label}
            icon={React.cloneElement(preset.icon, { fontSize: "small" })}
            clickable
            // Picking the active preset again is the way back to no categories
            onClick={() => onSelect(active ? [] : preset.categories)}
            title={`Show ${preset.label.toLowerCase()} points on the map`}
            // The chips stay neutral, the colours of the presets belong to the
            // info sheet, the map is busy enough
            sx={{
              flex: "0 0 auto",
              background: active ? "#1976d2" : "#fff",
              color: active ? "#fff" : "#202124",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              fontWeight: 500,
              "& .MuiChip-icon": { color: active ? "#fff" : "#5f6368" },
              "&:hover": { background: active ? "#1565c0" : "#f1f3f4" },
            }}
          />
        );
      })}
    </div>
  );
};

export default CategoryPresets;
