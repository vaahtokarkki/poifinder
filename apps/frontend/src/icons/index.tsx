import * as React from "react";
import SvgIcon, { SvgIconProps } from "@mui/material/SvgIcon";

/**
 * Icons we draw ourselves, rather than import from @mui/icons-material.
 *
 * CategoryConfig types its icon as an element taking a `fontSize` prop, which
 * is the only thing the app ever sets on one: PoiMarkers and the three category
 * lists clone it with fontSize="small". Wrapping our own paths in MUI's SvgIcon
 * meets that contract exactly, so a custom icon drops into CATEGORY_CONFIG
 * anywhere an imported one goes, and still resolves `currentColor` against the
 * category colour when RenderMarkerIcon serialises it into a Leaflet divIcon.
 */

/**
 * Base shapes live here as bare paths rather than imports because the badged
 * variants have to composite with them: a car park that charges is still a car
 * park, and has to read as the same shape with a mark added rather than as a
 * different pictogram. Anything that needs a badge needs its path here.
 */
/** @mui/icons-material/Wc */
const TOILET_PATH =
  "M5.5 22v-7.5H4V9c0-1.1.9-2 2-2h3c1.1 0 2 .9 2 2v5.5H9.5V22zM18 22v-6h3l-2.54-7.63C18.18 7.55 17.42 7 16.56 7h-.12c-.86 0-1.63.55-1.9 1.37L12 16h3v6zM7.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2m9 0c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2";

/** @mui/icons-material/LocalParking */
const PARKING_PATH =
  "M13 3H6v18h4v-6h3c3.31 0 6-2.69 6-6s-2.69-6-6-6m.2 8H10V7h3.2c1.1 0 2 .9 2 2s-.9 2-2 2";

/** @mui/icons-material/AttachMoney */
const DOLLAR_PATH =
  "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4";

/**
 * The badge sits over the top right corner of the base shape, overlapping it.
 *
 * `moat` is the gap cut out of the shape underneath: everything here is one
 * flat currentColor, so without it the badge would merge into whatever it
 * covers and read as a smudge rather than a mark. Cutting a ring of empty space
 * slightly wider than the badge is what keeps the two legible at the 25px the
 * map actually renders them at.
 */
const BADGE = { cx: 18.2, cy: 5.6, r: 5.6, moat: 6.7 };

/** Scales the 24x24 dollar down to the badge and centres it there */
const DOLLAR_TRANSFORM = "translate(14.06 1.04) scale(0.38)";

export const ToiletIcon = (props: SvgIconProps) => (
  <SvgIcon viewBox="0 0 24 24" {...props}>
    <path d={TOILET_PATH} />
  </SvgIcon>
);

/**
 * A base shape with a currency mark in the corner. The badge is a filled disc
 * with the glyph knocked out of it, so it stays a single colour and inherits
 * the category colour like every other icon, rather than needing a second one
 * to sit legibly against the marker's translucent white background.
 *
 * The mask ids are fixed per icon type, and deliberately not useId. useId looks
 * like the tool for this and is not: RenderMarkerIcon renders each icon through
 * its own renderToString call, every one of those is a separate React root, and
 * so every one hands back the same id. Two variants then shared mask ids, both
 * resolved to whichever mask reached the document first, and one badge appeared
 * on the other's markers.
 *
 * A fixed id does repeat when the same icon appears more than once on a page,
 * but every copy carries identical mask content, so the first one winning is
 * the right answer anyway. It also stays stable between the prerendered HTML
 * and the browser, which a render counter would not.
 */
const PaidIcon = ({
  basePath,
  idPrefix,
  ...props
}: SvgIconProps & { basePath: string; idPrefix: string }) => {
  const moatId = `${idPrefix}-moat`;
  const badgeId = `${idPrefix}-badge`;

  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <mask id={moatId}>
        <rect width="24" height="24" fill="#fff" />
        <circle cx={BADGE.cx} cy={BADGE.cy} r={BADGE.moat} fill="#000" />
      </mask>
      <mask id={badgeId}>
        <circle cx={BADGE.cx} cy={BADGE.cy} r={BADGE.r} fill="#fff" />
        <g transform={DOLLAR_TRANSFORM} fill="#000">
          <path d={DOLLAR_PATH} />
        </g>
      </mask>
      <path d={basePath} mask={`url(#${moatId})`} />
      <circle cx={BADGE.cx} cy={BADGE.cy} r={BADGE.r} mask={`url(#${badgeId})`} />
    </SvgIcon>
  );
};

export const PaidToiletIcon = (props: SvgIconProps) => (
  <PaidIcon basePath={TOILET_PATH} idPrefix="wayside-paid-toilet" {...props} />
);

export const PaidParkingIcon = (props: SvgIconProps) => (
  <PaidIcon basePath={PARKING_PATH} idPrefix="wayside-paid-parking" {...props} />
);
