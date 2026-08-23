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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
