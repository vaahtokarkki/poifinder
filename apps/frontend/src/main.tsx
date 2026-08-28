import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import App from './App.tsx'
import { initAnalytics } from './analytics'
import { warmCountries } from './analytics/countries'

// Before the app renders, so the pageview is not waiting on React. A no-op
// unless the build was given VITE_MATOMO_URL
initAnalytics()

// And this one waits for everything else: it only schedules the fetch of the
// country outlines, for after the page has loaded and gone idle. Nothing on the
// map depends on it arriving — see countries.ts
warmCountries()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
