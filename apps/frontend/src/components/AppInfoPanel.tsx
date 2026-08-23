import React from "react";
import { CATEGORY_PRESETS, presetLabel } from "../constants";
import { categoryDisplay } from "../seo/categories";
import { ui } from "../copy";

/**
 * What the app is for, in one sentence.
 *
 * Its own component because two different sheets open on it: the prerendered
 * home page and every route we did not prerender. Written once so the two can
 * never drift into describing the same app differently.
 */
export const InfoSheetSummary: React.FC = () => (
  <p className="info-sheet-summary">{ui().sheet.summary}</p>
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
      <h2 className="info-sheet-heading">{ui().sheet.howItWorksHeading}</h2>
      <ol className="info-sheet-steps">
        {ui().sheet.steps.map((step, index) => (
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
      <h2 className="info-sheet-heading">{ui().sheet.presetsHeading}</h2>
      <ul className="info-sheet-presets">
        {CATEGORY_PRESETS.map((preset) => (
          <li key={preset.id}>
            <span
              className="info-sheet-preset-icon"
              // The same colour the chip of the preset carries
              style={{ color: preset.color, background: `${preset.color}1a` }}
            >
              {React.cloneElement(preset.icon, { fontSize: "small" })}
            </span>
            <span>
              <strong>{presetLabel(preset)}</strong>
              <span className="info-sheet-preset-categories">
                {preset.categories
                  .map((category) => categoryDisplay(category))
                  .join(" · ")}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="info-sheet-note">{ui().sheet.presetsNote}</p>
    </section>

    <section className="info-sheet-section">
      <h2 className="info-sheet-heading">{ui().sheet.goodToKnowHeading}</h2>
      <ul className="info-sheet-tips">
        {ui().sheet.tips.map((tip) => (
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
      {ui().sheet.creditsSourceBefore}{" "}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        {ui().sheet.creditsSourceLink}
      </a>{" "}
      {ui().sheet.creditsSourceAfter}
    </p>

    <p className="info-sheet-footer">
      {ui().sheet.creditsCodeBefore}{" "}
      <a href="https://github.com/vaahtokarkki/poifinder" target="_blank" rel="noreferrer">
        {ui().sheet.creditsCodeLink}
      </a>
      {ui().sheet.creditsCodeAfter}
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
