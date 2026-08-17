/**
 * What a popup says about a point, and in what order.
 *
 * Everything here is a pure function from OpenStreetMap tags to words a reader
 * can use, kept apart from the map so it can be read, changed and checked
 * without a Leaflet instance in the room. PoiMarkers renders what these return.
 */

export const capitaliseFirst = (str: string) => str.replace(/^\w/, c => c.toUpperCase());

/**
 * A tag key is punctuated for machines: `changing_table`, `addr:street`. Both
 * separators become spaces, because neither means anything to a reader.
 */
export const formatKey = (key: string) => capitaliseFirst(key.replace(/[:_]/g, " "));

export /**
 * The tags whose value is a sentence somebody wrote, rather than a value picked
 * from a list. Only these are offered a translation.
 *
 * `name` is deliberately absent, and it is the important absence: a name is a
 * proper noun, it is what is written on the door, and translating "Kauppatori"
 * to "Market Square" gives the reader a phrase nobody standing in the street
 * would recognise. `opening_hours` is a syntax rather than a language, an
 * address is a place, and a website is a website. What is left is the prose:
 * `description`, `note`, `inscription`, and the qualified forms of the first
 * two — `wheelchair:description`, `operational_status:note`.
 *
 * `fixme` is prose too, and is left out on purpose: it is a message from one
 * mapper to the next about work outstanding, not something written for the
 * person standing in front of the place.
 */
const TRANSLATABLE_KEYS =
  /^(description|note|inscription)(:[a-z-]+)?$|^[a-z_]+:(description|note)$/;

/* ---------- Opening hours, and the other tags that hold a timetable ---------- */

/**
 * Day and holiday codes, expanded to the words they stand for. `off` is in
 * here because a reader knows what "closed" means and nobody outside
 * OpenStreetMap has met `off`.
 */
const OPENING_HOURS_WORDS: Record<string, string> = {
  Mo: "Mon",
  Tu: "Tue",
  We: "Wed",
  Th: "Thu",
  Fr: "Fri",
  Sa: "Sat",
  Su: "Sun",
  PH: "public holidays",
  SH: "school holidays",
};

/**
 * One rule of an opening hours value, rewritten for a reader.
 *
 * This is deliberately not an opening hours *evaluator*. Working out whether a
 * place is open right now means a timezone, the local holiday calendar and a
 * parser for the whole grammar, and being wrong about it is worse than saying
 * nothing: somebody walks to a toilet because a map said "open now". Rewriting
 * the string says exactly what OpenStreetMap says, in words, and leaves the
 * reading of it to the person who knows what day it is.
 *
 * Anything the rewrites do not recognise passes through untouched, so an exotic
 * rule degrades to the raw syntax rather than to nonsense.
 */
function formatOpeningHoursRule(rule: string): string {
  let text = rule.trim();
  if (!text) return "";
  // The whole rule, and it says two separate things: every day, and all day
  if (/^24\/7$/i.test(text)) return "24/7";
  // A quoted comment is a mapper writing prose inside the syntax
  text = text.replace(/"([^"]*)"/g, "$1");
  // Midnight to midnight is how the syntax spells a full day
  text = text.replace(/\b00:00\s*-\s*24:00\b/g, "24h");
  text = text.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH|SH)\b/g, word => OPENING_HOURS_WORDS[word]);
  text = text.replace(/\boff\b/gi, "closed");
  // A hyphen spans days, dates and times alike, and a dash is what a span
  // looks like in print. The comma is a list and only needs its spacing fixed
  text = text.replace(/\s*-\s*/g, "–").replace(/\s*,\s*/g, ", ");
  return capitaliseFirst(text.replace(/\s+/g, " ").trim());
}

/**
 * A timetable value as lines, one rule to a line. The semicolon that separates
 * them is a list separator to a machine and a wall of text to everyone else.
 */
export const formatOpeningHours = (value: string): string =>
  value.split(";").map(formatOpeningHoursRule).filter(Boolean).join("\n");

/**
 * The tags that hold a timetable in opening hours syntax. `collection_times` is
 * the one that earns this on its own: it is when a post box is emptied, which
 * is the entire question anybody has about a post box.
 */
export const isTimetableKey = (key: string) =>
  key === "opening_hours" ||
  key.startsWith("opening_hours:") ||
  key === "collection_times" ||
  key === "service_times";

/* ---------- Where the point is, when the point is not simply on the map ---------- */

/**
 * `indoor`, `level` and `location` are not assembled into a sentence: each one
 * is listed as itself, at the top of the popup, ranked in TAG_RANKS below. A
 * composite "Where: indoors, level 2" line read as prose the popup had written
 * about the place, and a reader who wanted to know which floor had to parse a
 * clause to find it. "Level — 2" is one glance.
 */

/**
 * The street address, in the shape the prerendered pages already use.
 *
 * City and postcode are left off on purpose: this is read by somebody looking
 * at a map centred on the place, who needs the street and the number and
 * already knows what town they are standing in.
 */
export const describeAddress = (tags: Record<string, string>): string | null => {
  const street = tags["addr:street"] ?? tags["addr:place"];
  const address = street
    ? [street, tags["addr:housenumber"]].filter(Boolean).join(" ")
    : tags["addr:housenumber"];
  if (!address) return null;
  return tags["addr:unit"] ? `${address}, unit ${tags["addr:unit"]}` : address;
};

/* ---------- When somebody last stood in front of it ---------- */

/** The tags a surveyor writes to say "I checked this, on this date" */
export const CHECK_DATE_KEYS = ["check_date", "survey:date", "survey_date", "last_checked"];

/** The tags read by a written row, and therefore not listed as themselves */
export const CONSUMED_KEYS = new Set(CHECK_DATE_KEYS);

/** Whole months, because a survey date is not accurate to the day it names */
const monthsSince = (date: Date, now: Date): number =>
  (now.getFullYear() - date.getFullYear()) * 12 +
  (now.getMonth() - date.getMonth()) -
  (now.getDate() < date.getDate() ? 1 : 0);

/**
 * Elapsed time, not calendar time, and worded so the two cannot be confused. A
 * check made on the 20th of last month is not a month old and is not "this
 * month" either; "within the last month" is true of both readings.
 */
const relativeAge = (months: number): string => {
  if (months < 1) return "within the last month";
  if (months === 1) return "a month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "a year ago" : `${years} years ago`;
};

/**
 * When a human last confirmed the point is really there, and how long ago that
 * was in words.
 *
 * The most valuable thing OpenStreetMap knows and the only map data source that
 * admits it: every other map presents everything it holds with the same
 * confidence. A drinking fountain checked last spring and one nobody has looked
 * at since 2013 are different facts, and the reader deciding whether to walk
 * there is the one who should get to weigh that.
 */
export const describeSurvey = (
  tags: Record<string, string> | undefined,
  now = new Date()
): string | null => {
  const raw = CHECK_DATE_KEYS.map(key => tags?.[key]).find(Boolean)?.trim();
  if (!raw) return null;

  // YYYY, YYYY-MM or YYYY-MM-DD, which is what the tag is meant to hold.
  // Anything else is shown as written rather than dropped: a mapper wrote it,
  // and it is still evidence somebody was there
  const match = raw.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!match) return `Last checked: ${raw}`;

  const [, year, month, day] = match;
  const date = new Date(Number(year), month ? Number(month) - 1 : 0, day ? Number(day) : 1);
  const when = date.toLocaleDateString("en-GB", {
    year: "numeric",
    ...(month ? { month: "long" } : {}),
  });

  const months = monthsSince(date, now);
  // A date in the future is a typo, and doing arithmetic on it would produce a
  // confident absurdity like "checked in 12 months"
  return months < 0 ? `Last checked ${when}` : `Last checked ${when} · ${relativeAge(months)}`;
};

/* ---------- What order the rows go in, and what they are called ---------- */

/**
 * The questions a popup answers, in the order somebody standing in the street
 * asks them: where exactly is it, when is it open, what does it cost, can I get
 * in, what is it like, who runs it. OpenStreetMap hands the tags over in
 * whatever order the contributor typed them, which answers no question first.
 */
const TAG_RANKS: Record<string, number> = {
  /** What it is called, which is the first thing anybody reads */
  name: 0,
  /**
   * Then, and above the address: these are the tags that decide whether a
   * mapped toilet is findable at all. A shopping centre is one dot on the map
   * and six floors on the ground, and `level=2` sitting anonymously further
   * down a list of tags is the difference between a two minute walk and a
   * wander.
   */
  level: 1,
  indoor: 2,
  location: 3,
  opening_hours: 10,
  collection_times: 10,
  service_times: 11,
  seasonal: 12,
  fee: 20,
  charge: 21,
  access: 25,
  wheelchair: 30,
  changing_table: 31,
  "toilets:disposal": 32,
  "ramp:wheelchair": 33,
  tactile_paving: 34,
  drinking_water: 40,
  bottle: 41,
  capacity: 42,
  backrest: 43,
  material: 44,
  covered: 45,
  lit: 46,
  shelter_type: 47,
  operator: 60,
  brand: 61,
  network: 62,
  phone: 63,
  email: 64,
  website: 65,
  url: 65,
  wikipedia: 66,
};

/** Prefix rules, for the families of tags too large to list one by one */
const TAG_RANK_PREFIXES: [string, number][] = [
  ["opening_hours:", 10],
  ["payment:", 22],
  ["wheelchair:", 30],
  ["socket:", 48],
  ["contact:", 63],
];

/**
 * Where the address goes: after the tags that say where in the building it is,
 * and before everything about the place itself. It is not a tag row — the
 * street, the number and the unit are assembled from three of them — so it
 * carries its rank here rather than in the table above.
 */
export const ADDRESS_RANK = 5;

/** Where a tag with no opinion about it goes: after the specifics, before the prose */
const DEFAULT_TAG_RANK = 55;

/** Prose is last whatever it is about: it is the one thing that takes real reading */
const PROSE_TAG_RANK = 70;

export const rankForKey = (key: string): number => {
  if (TRANSLATABLE_KEYS.test(key)) return PROSE_TAG_RANK;
  const exact = TAG_RANKS[key];
  if (exact !== undefined) return exact;
  const prefix = TAG_RANK_PREFIXES.find(([start]) => key.startsWith(start));
  return prefix ? prefix[1] : DEFAULT_TAG_RANK;
};

/**
 * Labels for the keys whose tag name is not what a reader would call the thing.
 * Everything else is formatted from the key itself, which is usually right.
 */
const KEY_LABELS: Record<string, string> = {
  changing_table: "Baby changing",
  "toilets:disposal": "Toilet type",
  "ramp:wheelchair": "Wheelchair ramp",
  building_levels: "Floors",
  "building:levels": "Floors",
  collection_times: "Emptied",
  "socket:type2": "Type 2 sockets",
  "socket:type2_combo": "CCS sockets",
  "socket:chademo": "CHAdeMO sockets",
  "socket:schuko": "Schuko sockets",
  backrest: "Backrest",
  wikipedia: "Wikipedia",
};

export const labelFor = (key: string): string => {
  const label = KEY_LABELS[key];
  if (label) return label;
  // `contact:phone` is a phone number. The namespace is how the tag is filed,
  // not something to read out
  if (key.startsWith("contact:")) return formatKey(key.slice("contact:".length));
  if (key.startsWith("payment:")) return formatKey(key.slice("payment:".length));
  return formatKey(key);
};

/** A language code and an article title, which is what the tag holds */
const WIKIPEDIA_VALUE = /^([a-z-]{2,}):(.+)$/i;

/**
 * `wikipedia=fi:Kauppatori` is a language and an article, not a URL. Turned into
 * one it is the only link in the popup that leads somewhere worth reading about
 * a viewpoint, a memorial or an old building.
 */
export const wikipediaUrl = (value: string): string | undefined => {
  const match = value.match(WIKIPEDIA_VALUE);
  if (!match) return undefined;
  const [, language, article] = match;
  return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(article.replace(/ /g, "_"))}`;
};

/**
 * What the link is called: the article's title, and nothing else.
 *
 * Every other link in the popup is labelled by its host, because where a link
 * goes is the thing worth knowing before tapping it. Here the row already says
 * Wikipedia, so "fi.wikipedia.org/wiki/Kauppatori" spends most of a narrow
 * column repeating the label and leaves the one useful word to be truncated.
 */
export const wikipediaLabel = (value: string): string | undefined => {
  const article = value.match(WIKIPEDIA_VALUE)?.[2];
  return article?.replace(/_/g, " ").trim() || undefined;
};
