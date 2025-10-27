import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import { Navigation } from './components/ui/Navigation'
import { AuthProvider } from './hooks/AuthProvider'
import { useAuth } from './hooks/useAuth'
import { ErrorBoundary } from './shared/components/ErrorBoundary'
import { LoadingSpinner } from './shared/components/ui/LoadingSpinner'
import { ToastContainer } from './shared/components/ui/Toast'

// Lazy load route components for code splitting
const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })))
const Canvas = lazy(() => import('./pages/Canvas').then(module => ({ default: module.Canvas })))
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })))

// Amplify is now configured in main.tsx before React rendering

const AppContent = () => {
  const { isAuthenticated, hasCheckedAuth } = useAuth()

  if (!hasCheckedAuth) {
    return <LoadingSpinner fullScreen text="Loading..." size="xlarge" />
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingSpinner fullScreen text="Loading..." size="xlarge" />}>
        <AuthPage />
      </Suspense>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <ErrorBoundary>
          <Routes>
            <Route 
              path="/" 
              element={
                <Suspense fallback={<LoadingSpinner fullScreen text="Loading dashboard..." size="large" />}>
                  <Navigation />
                  <main>
                    <Dashboard />
                  </main>
                </Suspense>
              } 
            />
            <Route 
              path="/project/:id" 
              element={
                <Suspense fallback={<LoadingSpinner fullScreen text="Loading canvas..." size="large" />}>
                  <Canvas />
                </Suspense>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <Suspense fallback={<LoadingSpinner fullScreen text="Loading..." size="large" />}>
                  <Navigation />
                  <main>
                    <div className="p-8">Admin Panel coming soon...</div>
                  </main>
                </Suspense>
              } 
            />
            <Route 
              path="*" 
              element={
                <>
                  <Navigation />
                  <main>
                    <div className="p-8">Page not found</div>
                  </main>
                </>
              } 
            />
          </Routes>
        </ErrorBoundary>
      </div>
    </Router>
  )
}

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <AppContent />
      <ToastContainer />
    </AuthProvider>
  </ErrorBoundary>
)

export default App
