import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { UserRole } from '../../services/auth'

interface NavigationProps {
  currentProject?: {
    id: string
    name: string
  }
}

export const Navigation = ({ currentProject }: NavigationProps) => {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { user, signOut, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isOnCanvas = location.pathname.startsWith('/project/')
  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? ''
  const displayInitial = userInitial.trim() !== '' ? userInitial : 'U'
  const displayName = user?.name && user.name.trim() !== '' ? user.name : 'User'

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and navigation */}
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              Auteurium
            </button>
            
            {/* Breadcrumb for project canvas */}
            {isOnCanvas && currentProject && (
              <div className="ml-6 flex items-center text-gray-500">
                <span className="mx-2">/</span>
                <button
                  onClick={() => navigate('/')}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Dashboard
                </button>
                <span className="mx-2">/</span>
                <span className="text-gray-900 font-medium">
                  {currentProject.name}
                </span>
              </div>
            )}
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-2"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {displayInitial}
                  </div>
                  <span className="ml-3 text-sm font-medium">
                    {displayName}
                  </span>
                  <svg
                    className="ml-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-200">
                    {user?.email}
                  </div>
                  
                  <button
                    onClick={() => {
                      navigate('/')
                      setShowUserMenu(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Dashboard
                  </button>
                  
                  {user?.role === UserRole.ADMIN && (
                    <button
                      onClick={() => {
                        navigate('/admin')
                        setShowUserMenu(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Admin Panel
                    </button>
                  )}
                  
                  <div className="border-t border-gray-200"></div>
                  
                  <button
                    onClick={() => {
                      void handleSignOut()
                      setShowUserMenu(false)
                    }}
                    disabled={isLoading}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {isLoading ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Click outside to close menu */}
      {showUserMenu && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close user menu"
          className="fixed inset-0 z-40"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowUserMenu(false)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setShowUserMenu(false)
            }
          }}
        ></div>
      )}
    </nav>
  )
}
