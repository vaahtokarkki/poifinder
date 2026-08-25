/**
 * The language the visitor chose, remembered between visits.
 *
 * Only a stated preference is stored. Nothing here reads
 * `navigator.languages`: a guessed language is a suggestion and belongs in
 * something dismissible, a chosen one is an instruction and belongs here.
 *
 * Storage can throw rather than merely return null — Safari in private mode,
 * and any browser set to block site data — so both directions are guarded and
 * a failure leaves the app on its default rather than breaking the map.
 */
import { isLocale } from "../copy";
import type { Locale } from "../copy";

const STORAGE_KEY = "wayside_locale";

/** The stored language, or null when there is none or it is no longer offered */
export function loadLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // A visitor who cannot store a preference still gets to use it this visit
  }
}
