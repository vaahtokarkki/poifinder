import React from "react";

type MapIconButtonProps = {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
};

/**
 * Round floating button of the map control column.
 *
 * The lit and unlit colours are classes rather than inline styles. They were
 * written inline here, which put them beyond the reach of any stylesheet short
 * of !important — the look is stated in index.css now, where a theme can
 * restate it.
 */
const MapIconButton: React.FC<MapIconButtonProps> = ({
  onClick,
  title,
  active = false,
  children,
}) => (
  <button
    type="button"
    className={`map-icon-button${active ? " active" : ""}`}
    onClick={onClick}
    title={title}
    aria-label={title}
    aria-pressed={active}
  >
    {children}
  </button>
);

export default MapIconButton;
