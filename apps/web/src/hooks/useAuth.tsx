import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Hub } from '@aws-amplify/core'
import { AuthService, AuthState } from '../services/auth'

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<any>
  signOut: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    hasCheckedAuth: false
  })

  const updateAuthState = (updates: Partial<AuthState>) => {
    setAuthState((prev) => ({
      ...prev,
      ...updates,
      isAuthenticated: updates.user !== undefined ? !!updates.user : prev.isAuthenticated
    }))
  }

  const checkAuthState = async () => {
    try {
      const user = await AuthService.getCurrentUser()
      updateAuthState({
        user,
        isLoading: false,
        hasCheckedAuth: true
      })
    } catch (error) {
      updateAuthState({
        user: null,
        isLoading: false,
        hasCheckedAuth: true
      })
    }
  }

  useEffect(() => {
    checkAuthState()

    // Listen to auth events
    const unsubscribe = Hub.listen('auth', ({ payload: { event } }) => {
      switch (event) {
        case 'signIn':
        case 'cognitoHostedUI':
          checkAuthState()
          break
        case 'signOut':
          updateAuthState({
            user: null,
            hasCheckedAuth: true,
            isLoading: false
          })
          break
        case 'signUp':
          // Don't automatically sign in after sign up
          break
        case 'confirmSignUp':
          // User might need to sign in manually
          break
      }
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      updateAuthState({ isLoading: true })
      await AuthService.signIn(email, password)
      const user = await AuthService.getCurrentUser()
      updateAuthState({
        user,
        isLoading: false,
        hasCheckedAuth: true
      })
    } catch (error) {
      updateAuthState({ isLoading: false })
      throw error
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      updateAuthState({ isLoading: true })
      const result = await AuthService.signUp(email, password, name)
      updateAuthState({
        user: null,
        isLoading: false,
        hasCheckedAuth: true
      })
      return result
    } catch (error) {
      updateAuthState({
        user: null,
        isLoading: false,
        hasCheckedAuth: true
      })
      throw error
    }
  }

  const signOut = async () => {
    try {
      updateAuthState({ isLoading: true })
      await AuthService.signOut()
      updateAuthState({
        user: null,
        isLoading: false,
        hasCheckedAuth: true
      })
    } catch (error) {
      updateAuthState({
        user: null,
        isLoading: false,
        hasCheckedAuth: true
      })
      throw error
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      await AuthService.forgotPassword(email)
    } catch (error) {
      throw error
    }
  }

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      await AuthService.forgotPasswordSubmit(email, code, newPassword)
    } catch (error) {
      throw error
    }
  }

  const confirmSignUp = async (email: string, code: string) => {
    try {
      await AuthService.confirmSignUp(email, code)
    } catch (error) {
      throw error
    }
  }

  const value: AuthContextType = {
    ...authState,
    signIn,
    signUp,
    signOut,
    forgotPassword,
    resetPassword,
    confirmSignUp
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
