import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import { AuthProvider, useAuth } from './hooks/useAuth'
import apolloClient from './services/graphql'
import { configureAmplify } from './config/amplify'
import { AuthPage } from './pages/AuthPage'
import { Dashboard } from './pages/Dashboard'
// import { Canvas } from './pages/Canvas'
import { Navigation } from './components/ui/Navigation'

// Configure Amplify
configureAmplify()

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthPage />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={
            <>
              <Navigation />
              <main>
                <Dashboard />
              </main>
            </>
          } />
          {/* <Route path="/project/:id" element={<Canvas />} /> */}
          <Route path="/admin" element={
            <>
              <Navigation />
              <main>
                <div className="p-8">Admin Panel coming soon...</div>
              </main>
            </>
          } />
          <Route path="*" element={
            <>
              <Navigation />
              <main>
                <div className="p-8">Page not found</div>
              </main>
            </>
          } />
        </Routes>
      </div>
    </Router>
  )
}

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ApolloProvider>
  )
}

export default App