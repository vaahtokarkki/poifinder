
import React from 'react';
import MyLocationIcon from '@mui/icons-material/MyLocation';


type MyLocationIconButtonProps = {
  onClick: () => void;
};

const MyLocationIconButton: React.FC<MyLocationIconButtonProps> = ({
  onClick,
}) => <div
  style={{
    position: "absolute",
    bottom: 50,
    right: 24,
    zIndex: 1200,
    background: "#fff",
    borderRadius: "50%",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    padding: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  }}
  onClick={onClick}
  title="Center map to your location"
>
    <MyLocationIcon fontSize="medium" style={{ color: "black" }} />
  </div>

export default MyLocationIconButton;
