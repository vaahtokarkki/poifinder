import CircularProgress from "@mui/material/CircularProgress";
import React from "react";

type LoadingProps = {
  active?: boolean;
};

const Loading: React.FC<LoadingProps> = ({ active = false }) => {
  if (!active) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(240,240,240,0.8)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress size={64} color="primary" />
    </div>
  );
};

export default Loading;
