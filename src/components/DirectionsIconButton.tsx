import React from 'react';
import DirectionsIcon from '@mui/icons-material/Directions';

type DirectionsIconButtonProps = {
  onClick: () => void;
  active?: boolean;
};

const DirectionsIconButton: React.FC<DirectionsIconButtonProps> = ({
  onClick,
  active
}) => <div
  style={{
    position: "absolute",
    bottom: 160,
    right: 24,
    zIndex: 1200,
    background: active ? "#1976d2" : "white",
    color: active ? "white" : "black",
    borderRadius: "50%",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    padding: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    marginBottom: 8,
  }}
  title="Directions"
  onClick={onClick}
>
    <DirectionsIcon fontSize="medium" />
  </div>

export default DirectionsIconButton;
