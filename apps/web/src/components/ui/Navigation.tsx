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
      void navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isOnCanvas = location.pathname.startsWith('/project/')
  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? ''
  const displayInitial = userInitial.trim() !== '' ? userInitial : 'U'
  const displayName = user?.name && user.name.trim() !== '' ? user.name : 'User'

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-surface-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and navigation */}
          <div className="flex items-center">
            <button
              onClick={() => void navigate('/')}
              className="flex items-center text-xl font-bold text-surface-900 hover:text-primary-600 transition-colors font-display tracking-tight"
            >
              Auteurium
            </button>

            {/* Breadcrumb for project canvas */}
            {isOnCanvas && currentProject && (
              <div className="ml-6 flex items-center text-surface-500 animate-fade-in">
                <span className="mx-2">/</span>
                <button
                  onClick={() => void navigate('/')}
                  className="text-primary-600 hover:text-primary-800 transition-colors font-medium"
                >
                  Dashboard
                </button>
                <span className="mx-2">/</span>
                <span className="text-surface-900 font-medium">
                  {currentProject?.name}
                </span>
              </div>
            )}
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-surface-700 hover:text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full p-1 transition-all hover:bg-surface-100"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium shadow-sm">
                    {displayInitial}
                  </div>
                  <span className="ml-3 text-sm font-medium hidden md:block">
                    {displayName}
                  </span>
                  <svg
                    className={`ml-2 h-4 w-4 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
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
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-50 border border-surface-100 animate-slide-up origin-top-right">
                  <div className="px-4 py-3 text-sm text-surface-500 border-b border-surface-100 bg-surface-50/50">
                    <div className="font-medium text-surface-900">{displayName}</div>
                    <div className="truncate">{user?.email}</div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        void navigate('/')
                        setShowUserMenu(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-600 transition-colors"
                    >
                      Dashboard
                    </button>

                    {user?.role === UserRole.ADMIN && (
                      <button
                        onClick={() => {
                          void navigate('/admin')
                          setShowUserMenu(false)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-600 transition-colors"
                      >
                        Admin Panel
                      </button>
                    )}
                  </div>

                  <div className="border-t border-surface-100 py-1">
                    <button
                      onClick={() => {
                        void handleSignOut()
                        setShowUserMenu(false)
                      }}
                      disabled={isLoading}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Signing out...' : 'Sign out'}
                    </button>
                  </div>
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
          className="fixed inset-0 z-30 cursor-default"
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
