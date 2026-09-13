import "./glass.css";

/**
 * The liquid glass UI, behind `?ui`.
 *
 * Everything the flag owns is in this folder and nothing outside it reads the
 * flag: the stylesheet states the whole look under one class, and this module
 * is the only thing that ever puts that class on the page. The rest of the app
 * renders the same markup either way.
 *
 * To drop the experiment: delete this folder and its one import in main.tsx.
 *
 * To keep it and retire the flag: delete this file, import glass.css from
 * main.tsx directly, and strip the `.glass-ui` prefix off every selector in it
 * — the file is written so that is a search and replace rather than a rewrite.
 *
 * The class goes on the root element rather than on a React tree, because two
 * of the things it styles are not in one: Leaflet builds its popups into the
 * map pane, and MUI portals the search suggestions to the body.
 */
export const GLASS_UI_CLASS = "glass-ui";

/** Whether this visit asked for the new look */
export const glassUiRequested = (): boolean =>
  new URLSearchParams(window.location.search).has("ui");

if (glassUiRequested()) {
  document.documentElement.classList.add(GLASS_UI_CLASS);
}
