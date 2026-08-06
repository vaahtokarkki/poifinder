import React from "react";

type MapIconButtonProps = {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
};

/** Round floating button of the map control column */
const MapIconButton: React.FC<MapIconButtonProps> = ({
  onClick,
  title,
  active = false,
  children,
}) => (
  <button
    type="button"
    className="map-icon-button"
    style={{
      background: active ? "#1976d2" : "#fff",
      color: active ? "#fff" : "#000",
    }}
    onClick={onClick}
    title={title}
    aria-label={title}
    aria-pressed={active}
  >
    {children}
  </button>
);

export default MapIconButton;
