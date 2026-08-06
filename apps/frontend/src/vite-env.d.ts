/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OpenRouteService key, for the driving routes drawn to a marker */
  readonly VITE_ORS_API_KEY?: string;
  /**
   * Full URL of a self hosted Overpass interpreter, e.g.
   * https://overpass.example.com/api/interpreter. Set it and the app talks
   * only to that instance; leave it unset and it falls back to the public
   * mirrors, with the failover and backoff that using them politely requires.
   */
  readonly VITE_OVERPASS_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
