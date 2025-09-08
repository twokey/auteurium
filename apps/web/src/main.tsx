import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Auteurium</h1>
        <p className="text-gray-600">Visual snippet organization platform</p>
      </div>
    </div>
  </React.StrictMode>,
)