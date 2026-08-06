import React from "react";

export type MapNotice = {
  id: number;
  message: string;
};

/**
 * Short remarks about something the map has no room to show: a point that
 * carries nothing beyond the tag that put it there. Bottom centre, stacked so
 * a run of quick taps reads as a list rather than one line flickering, and no
 * dismiss button, because they go on their own.
 *
 * Deliberately not a MUI Snackbar. That one wraps itself in a ClickAwayListener
 * and closes on the next click anywhere, which turned the following tap on the
 * map into a dismissal and cost the marker underneath its popup.
 */
const MapNotices: React.FC<{ notices: MapNotice[] }> = ({ notices }) => {
  if (notices.length === 0) return null;

  return (
    <div className="map-notices" role="status" aria-live="polite">
      {notices.map((notice) => (
        <div className="map-notice" key={notice.id}>
          {notice.message}
        </div>
      ))}
    </div>
  );
};

export default MapNotices;
