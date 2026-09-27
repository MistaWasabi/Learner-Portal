// Development-only helper that highlights unsafe React patterns.
import { StrictMode } from 'react'

// React API used to attach the application to the HTML page.
import { createRoot } from 'react-dom/client'

// Master Styles owns only source-level reset, design tokens, and browser-wide defaults.
import './MasterStyles.css'

// Applies the harmless saved theme before React renders so refreshes do not flash the wrong colours.
import { applyStoredTheme } from './features/preferences/theme.logic.js'

// Root user-interface component for the Learner Portal.
import App from './App.jsx'

// Theme is visual-only cookie state, separate from Firebase's managed authentication session.
applyStoredTheme()

// Finds the #root element in index.html and renders the React application there.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
