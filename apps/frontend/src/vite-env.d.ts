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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
