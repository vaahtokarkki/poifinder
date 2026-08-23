/**
 * Turning a stored message into the sentence a reader sees.
 *
 * Two steps, kept apart: pick the wording the count calls for, then fill the
 * placeholders. Both are pure and run in Node, because the prerender does.
 */
import type { Locale, Message, PluralCategory, PluralMessage } from "./types";

/** Values a placeholder can be filled with */
export type Params = Record<string, string | number>;

/**
 * `Intl.PluralRules` per locale, built once. Constructing one is not free and
 * the prerender asks for the same rules several thousand times.
 */
const pluralRules = new Map<Locale, Intl.PluralRules>();

function rulesFor(locale: Locale): Intl.PluralRules {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules;
}

function isPlural(message: Message): message is PluralMessage {
  return typeof message !== "string";
}

/**
 * The wording a count calls for.
 *
 * Falls back to `other` when the deck has no entry for the category the locale
 * selected, which is the correct behaviour rather than a defensive one: a deck
 * only writes the forms its language distinguishes, and English has no `few`.
 */
export function selectPlural(
  message: PluralMessage,
  count: number,
  locale: Locale
): string {
  const category = rulesFor(locale).select(count) as PluralCategory;
  return message[category] ?? message.other;
}

/**
 * Fill `{name}` placeholders from `params`.
 *
 * An unknown placeholder is left standing rather than replaced with a blank.
 * A visible `{city}` in a sentence is a bug report; a silent gap reads as
 * clumsy prose and survives review.
 */
export function interpolate(template: string, params: Params = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole
  );
}

/**
 * Resolve a message to its final string: plural form first, placeholders after.
 * `count` is read for the plural selection and is not itself a placeholder, so
 * a message that wants to show the number still writes `{count}`.
 */
export function resolve(
  message: Message,
  locale: Locale,
  params: Params = {},
  count?: number
): string {
  const template =
    isPlural(message) && count !== undefined
      ? selectPlural(message, count, locale)
      : isPlural(message)
        ? message.other
        : message;
  return interpolate(template, params);
}
