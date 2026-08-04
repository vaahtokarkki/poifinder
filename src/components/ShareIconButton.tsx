import React from 'react';
import ShareIcon from '@mui/icons-material/Share';

type ShareIconButtonProps = {
  onClick: () => void;
};

const ShareIconButton: React.FC<ShareIconButtonProps> = ({
  onClick,
}) => <div
  style={{
    position: "absolute",
    bottom: 220,
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
    marginBottom: 8,
  }}
  title="Share this view"
  onClick={onClick}
>
    <ShareIcon fontSize="medium" style={{ color: "black" }} />
  </div>

export default ShareIconButton;
