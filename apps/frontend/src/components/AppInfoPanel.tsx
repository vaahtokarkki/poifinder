import React from "react";
import { CATEGORY_CONFIG, CATEGORY_PRESETS } from "../constants";

/**
 * What the app is for, in one sentence.
 *
 * Its own component because two different sheets open on it: the prerendered
 * home page and every route we did not prerender. Written once so the two can
 * never drift into describing the same app differently.
 */
export const InfoSheetSummary: React.FC = () => (
  <p className="info-sheet-summary">
    Wayside maps the small things that are hard to find when you are out:
    toilets, playgrounds, drinking water, parking etc. Pick a
    preset or your own categories, and search any area of the map.
  </p>
);

/**
 * The always visible part of the info sheet: the page heading and the summary,
 * so a first time visitor sees what the app is for without opening the sheet.
 */
export const InfoSheetHeader: React.FC<{ title: string }> = ({ title }) => (
  <>
    <h1 className="info-sheet-title">{title}</h1>
    <InfoSheetSummary />
  </>
);

const STEPS = [
  {
    title: "Pick what you need",
    text: "Use a ready made preset such as Family or Road trip, or choose the categories yourself.",
  },
  {
    title: "Move the map",
    text: "Pan or zoom anywhere and the points of the new view load on their own, as soon as the map settles.",
  },
  {
    title: "Open a point",
    text: "Tap a marker for its details, opening hours when known, and directions.",
  },
];

const TIPS = [
  "Search for a city or an address with the search button.",
  "Follow a route: set a start and a destination to see the points along the way.",
  "Share the current view, categories included, with the share button.",
];

/**
 * The guide: what the app does and how to work it.
 *
 * Split from the credits below so the home page can put its own line between
 * the two. See InfoSheetContent, which is still the pair of them together for
 * every caller that wants the whole thing.
 */
export const InfoSheetGuide: React.FC = () => (
  <>
    <section className="info-sheet-section">
      <h2 className="info-sheet-heading">How it works</h2>
      <ol className="info-sheet-steps">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <span className="info-sheet-step-number">{index + 1}</span>
            <span>
              <strong>{step.title}.</strong> {step.text}
            </span>
          </li>
        ))}
      </ol>
    </section>

    <section className="info-sheet-section">
      <h2 className="info-sheet-heading">Presets</h2>
      <ul className="info-sheet-presets">
        {CATEGORY_PRESETS.map((preset) => (
          <li key={preset.label}>
            <span
              className="info-sheet-preset-icon"
              // The same colour the chip of the preset carries
              style={{ color: preset.color, background: `${preset.color}1a` }}
            >
              {React.cloneElement(preset.icon, { fontSize: "small" })}
            </span>
            <span>
              <strong>{preset.label}</strong>
              <span className="info-sheet-preset-categories">
                {preset.categories
                  .map((category) => CATEGORY_CONFIG[category].display)
                  .join(" · ")}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="info-sheet-note">
        Not what you are after? The picker has every category on its own.
      </p>
    </section>

    <section className="info-sheet-section">
      <h2 className="info-sheet-heading">Good to know</h2>
      <ul className="info-sheet-tips">
        {TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </section>

  </>
);

/** The small print at the very bottom of the sheet: where the data and the code come from */
export const InfoSheetCredits: React.FC = () => (
  <>
    <p className="info-sheet-footer">
      Points come from{" "}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        OpenStreetMap
      </a>{" "}
      contributors. Something missing? Add it there and it shows up here.
    </p>

    <p className="info-sheet-footer">
      Wayside is open source:{" "}
      <a href="https://github.com/vaahtokarkki/poifinder" target="_blank" rel="noreferrer">
        the code is on GitHub
      </a>
      .
    </p>
  </>
);

/** The rest of the info sheet, revealed by sliding it fully open */
export const InfoSheetContent: React.FC = () => (
  <>
    <InfoSheetGuide />
    <InfoSheetCredits />
  </>
);
