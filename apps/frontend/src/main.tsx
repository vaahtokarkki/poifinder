import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "leaflet/dist/leaflet.css"; 
import App from './App.tsx'
import { initAnalytics } from './analytics'

// Before the app renders, so the pageview is not waiting on React. A no-op
// unless the build was given VITE_MATOMO_URL
initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
