import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Temporarily disable StrictMode to prevent double-rendering in development
// StrictMode intentionally double-invokes effects to catch bugs
createRoot(document.getElementById('root')).render(
  <App />
)
