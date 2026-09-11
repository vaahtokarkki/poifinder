/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OpenRouteService key, for the driving routes drawn to a marker */
  readonly VITE_ORS_API_KEY?: string;
  /**
   * Full URL of a self hosted Overpass interpreter, e.g.
   * https://overpass.example.com/api/interpreter. Set it and the app asks that
   * instance first, once, and only falls back to the public mirrors when it
   * does not answer. Leave it unset and the mirrors are all there is.
   */
  readonly VITE_OVERPASS_API_URL?: string;
  /**
   * Base URL of the Matomo install, e.g. https://analytics.example.com/. Unset
   * and the app tracks nothing at all, which is what a dev build wants.
   */
  readonly VITE_MATOMO_URL?: string;
  /** The site id Matomo gave this site, "1" on a fresh install */
  readonly VITE_MATOMO_SITE_ID?: string;
  /**
   * CARTO basemaps key, for the Voyager vector tiles the map is drawn from.
   * CARTO requires one on every request to basemaps.cartocdn.com; unset, the
   * map still draws for now, but that is a promise CARTO has said it will stop
   * keeping. Free up to their fair use limit: https://carto.com/basemaps/apikey/
   */
  readonly VITE_CARTO_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** When this build was made, e.g. "11.9.2026 14:55" in Finnish time. See vite.config.ts */
declare const __BUILD_TIME__: string;
/** The short hash of the commit it was built from, empty when git could not say */
declare const __BUILD_SHA__: string;
