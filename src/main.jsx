import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const root = document.getElementById('root')

// Catch render errors and show them instead of blank screen
try {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
} catch (e) {
  root.innerHTML = `<div style="color:red;padding:32px;font-family:monospace;white-space:pre-wrap">
ERROR: ${e.message}\n\n${e.stack}
  </div>`
}
