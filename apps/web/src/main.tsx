import { Buffer } from 'buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import './styles/index.css'

const globalObject = globalThis as typeof globalThis & { Buffer?: typeof Buffer }
if (typeof globalObject.Buffer === 'undefined') {
  globalObject.Buffer = Buffer
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
