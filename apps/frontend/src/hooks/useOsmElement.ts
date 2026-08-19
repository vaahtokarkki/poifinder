import { useEffect, useState } from "react";
import { fetchEnclosingBuilding, fetchOverpassElement } from "../api/overpass";
import type {
  EnclosingBuilding,
  OsmRef,
  OverpassElementDetails,
} from "../api/overpass";

/**
 * Answers already had, kept for the life of the page.
 *
 * Reopening a popup is the common case — a reader compares two car parks, or
 * taps back to the one they had — and neither the outline of a way nor the
 * building around a point changes while they are looking at it. "There is no
 * building here" is remembered too, and has to be: it is the answer for seven
 * points in eight, and forgetting it would mean asking again every time.
 *
 * A failure is deliberately not remembered. That is usually one server having
 * a moment, and the next popup deserves a fresh try.
 */
type Lookup<T> = {
  answers: Map<string, T | null>;
  /** Requests in the air, so that two components asking at once ask once */
  pending: Map<string, Promise<T | null>>;
};

const lookup = <T,>(): Lookup<T> => ({ answers: new Map(), pending: new Map() });

const load = <T,>(
  store: Lookup<T>,
  key: string,
  fetcher: (key: string) => Promise<T | null>
): Promise<T | null> => {
  const inFlight = store.pending.get(key);
  if (inFlight) return inFlight;

  const request = fetcher(key).then(
    answer => {
      store.pending.delete(key);
      store.answers.set(key, answer);
      return answer;
    },
    error => {
      store.pending.delete(key);
      throw error;
    }
  );
  store.pending.set(key, request);
  return request;
};

/**
 * The answer for a key, once it has arrived, and null until then.
 *
 * Nothing is said about a failure. Everything fetched through here is an extra
 * on top of a popup that is already open and already answering the question
 * that was asked, and a failure notice over the map would be worse than the
 * missing outline.
 *
 * The key carries everything the fetcher needs, so the fetcher is one function
 * per kind of question rather than a closure over this render's props. That is
 * what lets the effect depend on the key alone: a popup reopening on the same
 * point must not start a second request because a callback was rebuilt.
 */
const useLookup = <T,>(
  store: Lookup<T>,
  key: string | null,
  fetcher: (key: string) => Promise<T | null>
): T | null => {
  const [answer, setAnswer] = useState<T | null>(() =>
    key ? store.answers.get(key) ?? null : null
  );

  useEffect(() => {
    if (!key) {
      setAnswer(null);
      return;
    }

    if (store.answers.has(key)) {
      setAnswer(store.answers.get(key) ?? null);
      return;
    }

    // The popup can be closed again long before Overpass answers, and an
    // outline that arrives after the reader has moved on must not draw itself
    let current = true;
    setAnswer(null);

    load(store, key, fetcher).then(
      result => {
        if (current) setAnswer(result);
      },
      error => {
        console.debug("[Overpass] Could not load", key, error);
      }
    );

    return () => {
      current = false;
    };
  }, [store, key, fetcher]);

  return answer;
};

/* ---------- One way or relation, by id ---------- */

const elements = lookup<OverpassElementDetails>();

const fetchElement = (ref: string) => {
  const [type, id] = ref.split("/");
  return fetchOverpassElement(type as "way" | "relation", id);
};

/** The outline and tags of the way or relation named, for the point that is one */
export const useOsmElement = (ref: OsmRef | null): OverpassElementDetails | null =>
  useLookup(elements, ref, fetchElement);

/* ---------- The building a point is standing in ---------- */

const buildings = lookup<EnclosingBuilding>();

const fetchBuilding = (key: string) => {
  const [lat, lng] = key.split(",").map(Number);
  return fetchEnclosingBuilding([lat, lng]);
};

/**
 * Keyed by where the point is rather than by which point it is, because that
 * is what the question is actually about: two points sharing a doorway share
 * an answer, and the same point found again by a later search is not a new
 * question.
 */
export const buildingKey = (position: [number, number]) =>
  `${position[0]},${position[1]}`;

/**
 * The building the point at this position is inside, or null when it is
 * outdoors — and null while the answer is still on its way, which is the same
 * thing to everything that renders it: nothing is drawn and nothing is said.
 */
export const useEnclosingBuilding = (
  position: [number, number] | null
): EnclosingBuilding | null =>
  useLookup(buildings, position ? buildingKey(position) : null, fetchBuilding);
