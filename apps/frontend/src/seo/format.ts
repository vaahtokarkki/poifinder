import { getLocale } from "../copy";
import type { Locale } from "../copy";

/**
 * Thousands separators, so a count of 1051 does not read as a part number.
 *
 * Grouped the way the reader's language groups: English "1,845", German
 * "1.845", Finnish "1 845" with a non breaking space. Pinned to en-US it put
 * an English comma inside a German sentence, which in German reads as a
 * decimal point — "1,845 verzeichnete Punkte" is not a large number, it is
 * one and a bit.
 */
export function formatCount(value: number, locale: Locale = getLocale()): string {
  return value.toLocaleString(locale);
}
