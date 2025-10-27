import { Buffer } from 'buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import { configureAmplify } from './config/amplify'
import './styles/index.css'

const globalObject = globalThis as typeof globalThis & { Buffer?: typeof Buffer }
if (typeof globalObject.Buffer === 'undefined') {
  globalObject.Buffer = Buffer
}

// Configure Amplify BEFORE React rendering to prevent race conditions
// This ensures generateClient() calls have a configured Amplify instance
configureAmplify()

// StrictMode disabled in development for performance
// - StrictMode intentionally double-mounts components to detect side effects
// - This causes 2x GraphQL queries, 2x renders, and slower dev experience
// - Re-enable in production or when debugging side effects
const isDevelopment = import.meta.env.DEV
const AppWrapper = isDevelopment ? React.Fragment : React.StrictMode

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppWrapper>
    <App />
  </AppWrapper>,
)
