import React from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import CheckIcon from "@mui/icons-material/Check";
import LanguageIcon from "@mui/icons-material/Language";
import { LOCALES, ui } from "../copy";
import type { Locale } from "../copy";

type LanguageSelectProps = {
  value: Locale;
  onChange: (locale: Locale) => void;
  /** False while the search or route panel has the row */
  visible: boolean;
};

/**
 * The language selector, next to the category picker on the same row.
 *
 * Each language is named by its endonym — its name in itself — and never by a
 * flag or by its English name. See copy/locales.ts for why; the short version
 * is that a flag names a country rather than a language, and somebody opening
 * this menu often cannot read the language the app is currently in.
 *
 * `lang` on each row is not decoration: without it a screen reader reads
 * "Suomi" and "Deutsch" with an English voice, and the browser picks fonts
 * for the wrong language. It is the one attribute that makes a list of
 * endonyms behave as a list of languages.
 *
 * This only changes the words. It does not touch the URL, and it does not
 * redirect: the language a prerendered page lives at is a property of that
 * page, not of the visitor reading it.
 */
const LanguageSelect: React.FC<LanguageSelectProps> = ({ value, onChange, visible }) => {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const label = ui().controls.language;
  const active = LOCALES.find((entry) => entry.code === value);

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        className="language-select"
        // The button shows the short code, but a screen reader gets the full
        // endonym: "DE" read aloud is two letters, "Deutsch" is the answer to
        // what the control is set to
        aria-label={`${label}: ${active?.endonym ?? value}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        title={label}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <LanguageIcon sx={{ fontSize: 16 }} />
        {/* aria-hidden: the accessible name above already says the language,
            and left visible this is read as a second, worse version of it */}
        <span className="language-select-code" aria-hidden="true">
          {active?.short ?? value.toUpperCase()}
        </span>
      </button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { borderRadius: "12px", minWidth: 168 } } }}
      >
        {LOCALES.map((locale) => (
          <MenuItem
            key={locale.code}
            lang={locale.code}
            selected={locale.code === value}
            onClick={() => {
              onChange(locale.code);
              setAnchor(null);
            }}
            sx={{ gap: 1 }}
          >
            <ListItemText primary={locale.endonym} />
            {locale.code === value && (
              <CheckIcon fontSize="small" sx={{ color: "#5f6368" }} />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSelect;
