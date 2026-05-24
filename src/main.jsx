import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Catch ALL uncaught JS errors and show them on screen
window.onerror = (msg, src, line, col, err) => {
  document.getElementById('root').innerHTML = `
    <div style="color:#ff5a5f;padding:32px;font-family:monospace;white-space:pre-wrap;background:#12121a;min-height:100vh">
      <b>Runtime Error</b>\n\n${msg}\n\n${err?.stack || ''}
    </div>`
}
window.onunhandledrejection = (e) => {
  document.getElementById('root').innerHTML = `
    <div style="color:#ff5a5f;padding:32px;font-family:monospace;white-space:pre-wrap;background:#12121a;min-height:100vh">
      <b>Unhandled Promise Rejection</b>\n\n${e.reason?.stack || e.reason || e}
    </div>`
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{ color: '#ff5a5f', padding: 32, fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: '#12121a', minHeight: '100vh' }}>
        <b>React Error</b>{'\n\n'}{this.state.error.message}{'\n\n'}{this.state.error.stack}
      </div>
    )
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
