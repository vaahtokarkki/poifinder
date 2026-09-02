/**
 * The locales offered in the selector, and what each is called there.
 *
 * The name shown is the endonym — the language's name in that language —
 * never the English name and never a flag.
 *
 * Not a flag, because a flag names a country and the mapping is many to many
 * in both directions. German would have to pick between Germany, Austria and
 * Switzerland, and this site has pages for Vienna, Salzburg, Zurich, Basel and
 * Bern; Spanish would have to pick between Spain and Mexico with Madrid,
 * Mexico City, Buenos Aires and Santiago all in the list. Backwards it is no
 * better: Switzerland has four official languages and Belgium three, so no
 * single flag names one of them. Windows also ships no flag emoji glyphs and
 * renders the two letter code instead.
 *
 * Not the English name, because somebody opening this menu often cannot read
 * the language the app is currently in — that is usually why they opened it.
 * "German" only helps a person who already reads English. "Deutsch" helps the
 * person who needs it.
 */
import type { Locale } from "./types";

export type LocaleInfo = {
  code: Locale;
  /** The language's name in that language, in its own script */
  endonym: string;
  /**
   * The two or three letters on the button itself, beside the globe.
   *
   * Written out rather than derived by upper casing the code, because that
   * stops working the moment a locale carries a region: "pt-BR" upper cases to
   * something too wide for the control, and the label wanted there is "PT".
   */
  short: string;
};

/**
 * Order is fixed rather than sorted. Sorting endonyms means collating across
 * scripts, which has no correct answer once a non Latin language is in the
 * list, and a menu of three that reorders itself by locale is worse than one
 * that does not move.
 */
export const LOCALES: readonly LocaleInfo[] = [
  { code: "en", endonym: "English", short: "EN" },
  { code: "fi", endonym: "Suomi", short: "FI" },
  { code: "de", endonym: "Deutsch", short: "DE" },
  { code: "fr", endonym: "Français", short: "FR" },
  { code: "it", endonym: "Italiano", short: "IT" },
  { code: "es", endonym: "Español", short: "ES" },
];

export const isLocale = (value: string): value is Locale =>
  LOCALES.some((entry) => entry.code === value);
