import React from "react";
import { Chip } from "@mui/material";
import { CATEGORIES, CATEGORY_PRESETS, isPresetActive } from "../constants";
import { presetLabel } from "../constants";
import { interpolate, ui } from "../copy";
import { analytics } from "../analytics";

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
            key={preset.id}
            label={presetLabel(preset)}
            icon={React.cloneElement(preset.icon, { fontSize: "small" })}
            clickable
            // Picking the active preset again is the way back to no categories
            onClick={() => {
              analytics.presetToggled(preset.id, !active, preset.categories.length);
              onSelect(active ? [] : preset.categories);
            }}
            title={interpolate(ui().controls.presetTitle, {
              preset: presetLabel(preset).toLowerCase(),
            })}
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
