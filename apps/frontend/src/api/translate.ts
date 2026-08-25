import { getLocale } from "../copy";
/**
 * Translating the prose an OpenStreetMap contributor wrote.
 *
 * Most tag values are a closed vocabulary and want a lookup table rather than a
 * translator: `yes`, `limited`, `designated`. A handful are not — a
 * description, a note, an inscription — and those are a sentence somebody typed
 * in whatever language they speak. Outside the English speaking world they are
 * the one part of a popup a visitor cannot read, and no amount of formatting
 * helps: "Kolme invavessaa" is either translated or it is noise.
 *
 * MyMemory is the service because of what this app is. A static site has
 * nowhere to keep an API key, which rules out DeepL, Google and Azure outright,
 * and the browser APIs that would need no key at all are desktop Chrome only
 * while this is a map people open on a phone. MyMemory needs no key, sends CORS
 * headers, and counts its free quota per IP address.
 *
 * That last part is also why no `de` email parameter is sent. It would raise
 * the limit from 5,000 characters a day to 50,000, but the larger allowance is
 * counted against the email rather than the caller, so every visitor in the
 * world would share one bucket. Anonymous, each of them has 5,000 characters
 * entirely to themselves, which for values that average well under a hundred is
 * an allowance nobody will reach.
 */

const ENDPOINT = "https://api.mymemory.translated.net/get";

/** Longer than this and the service answers 403 instead of translating */
const MAX_QUERY_CHARS = 500;

/** Left short of the limit so a piece has room for the text it is cut from */
const CHUNK_CHARS = 450;

/** Long enough for a slow phone, short enough that a dead service is obvious */
const REQUEST_TIMEOUT_MS = 12000;

const STORAGE_KEY = "wayside_translations";

/**
 * Translations kept between visits. A city has only a few dozen distinct
 * descriptions in it, so this is small, and every entry it holds is a request
 * that never has to be spent from the visitor's daily allowance again.
 */
const MAX_CACHED_ENTRIES = 300;

/**
 * Why a translation could not be produced. The three are worth telling apart
 * because only one of them is worth offering to try again after.
 */
export type TranslationFailure = "same-language" | "quota" | "failed";

export class TranslationError extends Error {
  reason: TranslationFailure;

  constructor(reason: TranslationFailure, message: string) {
    super(message);
    this.name = "TranslationError";
    this.reason = reason;
  }
}

type MyMemoryResponse = {
  responseData?: {translatedText?: string; detectedLanguage?: string};
  /** A number on success and the string "403" on failure, in the same field */
  responseStatus?: number | string;
  responseDetails?: string;
  quotaFinished?: boolean | null;
};

/**
 * Everything is translated into the language the reader has selected.
 *
 * This used to be pinned to English, on the grounds that "a popup that answers
 * in German inside an English interface reads as a page that cannot decide
 * what language it is in". That reasoning was right and it now points the
 * other way: the interface itself is German when the reader asks for German,
 * so English in the popup is the half that does not match. One language
 * throughout is still the rule — the language it settles on has just stopped
 * being fixed.
 *
 * Read per call rather than captured at import, because the reader can change
 * it between one popup and the next.
 */
const targetLanguage = (): string => getLocale();

type TranslationCache = Record<string, string>;

/** The target stays in the key so a cache written for one language is never read as another */
const cacheKey = (text: string) => `${targetLanguage()}|${text}`;

function readCache(): TranslationCache {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? (parsed as TranslationCache) : {};
  } catch {
    return {};
  }
}

function writeCache(text: string, translation: string): void {
  try {
    const cache = readCache();
    cache[cacheKey(text)] = translation;

    const keys = Object.keys(cache);
    // Oldest first, insertion order being the only age this has. Dropping a
    // whole slice rather than one entry keeps the trimming from running on
    // every single write once the cache is full
    if (keys.length > MAX_CACHED_ENTRIES) {
      for (const key of keys.slice(0, keys.length - MAX_CACHED_ENTRIES)) {
        delete cache[key];
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // A full or disabled localStorage costs a repeated request, nothing more
  }
}

type Piece = {body: string; separator: string};

/**
 * MyMemory takes 500 characters at a time. Values that long are rare — a
 * description is usually one line — but when one arrives it has to come back in
 * one piece, so it is cut where the writer already broke it: a line end first,
 * then a sentence end, then a space. The separator is set aside and put back
 * between the translated pieces, because the line breaks in a description are
 * often the only thing dividing the Finnish from the Swedish from the English.
 *
 * A break is only taken past the halfway mark. Cutting at the first newline of
 * a 500 character value would send one word and then 490, which translates the
 * long half as a fragment of a sentence that has already ended.
 */
function splitForApi(text: string): Piece[] {
  const pieces: Piece[] = [];
  let rest = text;

  while (rest.length > MAX_QUERY_CHARS) {
    const window = rest.slice(0, CHUNK_CHARS);
    let cut = window.length;
    let separator = " ";

    for (const seek of ["\n", ". ", "! ", "? ", " "]) {
      const at = window.lastIndexOf(seek);
      if (at > CHUNK_CHARS / 2) {
        cut = at;
        separator = seek;
        break;
      }
    }

    pieces.push({body: rest.slice(0, cut).trim(), separator});
    rest = rest.slice(cut + separator.length);
  }

  pieces.push({body: rest.trim(), separator: ""});
  return pieces.filter(piece => piece.body.length > 0);
}

/** What comes back when the text is already in the language it was asked for */
const ALREADY_IN_TARGET = "PLEASE SELECT TWO DISTINCT LANGUAGES";

/**
 * MyMemory reports its own errors in the field the translation should be in,
 * in capitals, and sometimes with a 200 status next to them. A value that comes
 * back shouting one of its stock phrases is one of those rather than an answer.
 */
function isServiceWarning(text: string): boolean {
  return (
    text === text.toUpperCase() &&
    /INVALID|LIMIT|EXCEEDED|WARNING|SELECT|MYMEMORY|LANGPAIR/.test(text)
  );
}

/**
 * One request. Not retried: the failures worth retrying are transient network
 * ones, and every other kind here — the daily quota, a value that was already
 * English — comes back the same way the second time while costing the visitor
 * another slice of their allowance.
 */
async function translateChunk(text: string): Promise<string> {
  const url =
    `${ENDPOINT}?q=${encodeURIComponent(text)}` +
    `&langpair=${encodeURIComponent(`Autodetect|${targetLanguage()}`)}`;

  let response: Response;
  try {
    response = await fetch(url, {signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
  } catch {
    throw new TranslationError("failed", "Could not reach the translation service");
  }

  if (!response.ok) {
    throw new TranslationError(
      response.status === 429 ? "quota" : "failed",
      `Translation service answered ${response.status}`
    );
  }

  const body = (await response.json()) as MyMemoryResponse;

  if (body.quotaFinished) {
    throw new TranslationError("quota", "Daily translation allowance is used up");
  }

  const translated = body.responseData?.translatedText;
  if (!translated) {
    throw new TranslationError("failed", "Translation service returned nothing");
  }

  if (translated.trim().toUpperCase() === ALREADY_IN_TARGET) {
    throw new TranslationError("same-language", "Text is already in the target language");
  }

  if (isServiceWarning(translated)) {
    throw new TranslationError(
      /MYMEMORY WARNING|USED ALL/.test(translated) ? "quota" : "failed",
      translated
    );
  }

  // The status is only consulted once the body has been read, because the
  // service puts its most useful complaints in the body and a 403 next to them
  if (Number(body.responseStatus) !== 200) {
    throw new TranslationError("failed", body.responseDetails || "Translation failed");
  }

  return translated;
}

/**
 * The translation of a tag value, from cache when it has been asked for before.
 *
 * The source language is left to the service to work out. It is better at it
 * than anything that would fit in this bundle — a note reading "Toimii" is six
 * characters, and no client side detector identifies a language from six
 * characters — and it costs nothing extra to ask.
 */
export async function translate(text: string): Promise<string> {
  const cached = readCache()[cacheKey(text)];
  if (cached) return cached;

  const pieces = splitForApi(text);
  const translated: string[] = [];

  // In sequence rather than at once: a value long enough to need splitting is
  // already unusual, and firing four requests in the same instant at a free
  // service is how a visitor's whole allowance disappears into one popup
  for (const piece of pieces) {
    translated.push(await translateChunk(piece.body));
  }

  const result = translated
    .map((part, index) => part + pieces[index].separator)
    .join("");

  writeCache(text, result);
  return result;
}
