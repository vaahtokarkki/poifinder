import CircularProgress from "@mui/material/CircularProgress";
import { Typography } from "@mui/material";
import React from "react";

type LoadingProps = {
  active?: boolean;
  status?: string;
};

const Loading: React.FC<LoadingProps> = ({ active = false, status }) => {
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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
      }}
    >
      <CircularProgress size={64} color="primary" />
      {status && (
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: "300px", textAlign: "center" }}>
          {status}
        </Typography>
      )}
    </div>
  );
};

export default Loading;
