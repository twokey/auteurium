import { Hub } from '@aws-amplify/core'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { AuthContext, type AuthContextType } from './auth-context'
import {
  AuthService,
  type AuthState,
  type SignUpResult,
  UserRole,
  type User
} from '../services/auth'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const shouldBypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true'

  const bypassUser = useMemo<User>(() => {
    const desiredRole = import.meta.env.VITE_BYPASS_AUTH_ROLE
    const role = desiredRole && Object.values(UserRole).includes(desiredRole as UserRole)
      ? (desiredRole as UserRole)
      : UserRole.STANDARD

    return {
      id: import.meta.env.VITE_BYPASS_AUTH_USER_ID ?? 'test-user',
      email: import.meta.env.VITE_BYPASS_AUTH_EMAIL ?? 'tester@auteurium.dev',
      name: import.meta.env.VITE_BYPASS_AUTH_NAME ?? 'Playwright Tester',
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }, [])

  const [authState, setAuthState] = useState<AuthState>({
    user: shouldBypassAuth ? bypassUser : null,
    isLoading: !shouldBypassAuth,
    isAuthenticated: shouldBypassAuth,
    hasCheckedAuth: shouldBypassAuth
  })

  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState((prev) => ({
      ...prev,
      ...updates,
      isAuthenticated: updates.user !== undefined ? !!updates.user : prev.isAuthenticated
    }))
  }, [])

  const checkAuthState = useCallback(async () => {
    if (shouldBypassAuth) {
      return
    }

    try {
      const user = await AuthService.getCurrentUser()
      updateAuthState({
        user,
        isLoading: false,
        hasCheckedAuth: true
      })
    } catch (_error) {
      updateAuthState({
        user: null,
        isLoading: false,
        hasCheckedAuth: true
      })
    }
  }, [shouldBypassAuth, updateAuthState])

  useEffect(() => {
    if (shouldBypassAuth) {
      return
    }

    void checkAuthState()

    // Listen to auth events
    const unsubscribe = Hub.listen('auth', ({ payload: { event } }) => {
      switch (event) {
        case 'signIn':
        case 'cognitoHostedUI':
          void checkAuthState()
          break
        case 'signOut':
          updateAuthState({
            user: null,
            hasCheckedAuth: true,
            isLoading: false
          })
          break
        case 'signUp':
          break
        case 'confirmSignUp':
          break
        default:
          break
      }
    })

    return () => {
      unsubscribe()
    }
  }, [checkAuthState, shouldBypassAuth, updateAuthState])

  const signIn = useCallback(async (email: string, password: string) => {
    if (shouldBypassAuth) {
      updateAuthState({
        user: bypassUser,
        isLoading: false,
        hasCheckedAuth: true,
        isAuthenticated: true
      })
      return
    }

    try {
      updateAuthState({ isLoading: true })
      await AuthService.signIn(email, password)
      const user = await AuthService.getCurrentUser()
      updateAuthState({
        user,
        isLoading: false,
        hasCheckedAuth: true
      })
    } catch (error: unknown) {
      updateAuthState({ isLoading: false })
      throw error instanceof Error ? error : new Error('Failed to sign in')
    }
  }, [bypassUser, shouldBypassAuth, updateAuthState])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (shouldBypassAuth) {
      updateAuthState({
        user: bypassUser,
        isLoading: false,
        hasCheckedAuth: true,
        isAuthenticated: true
      })
      return { isSignUpComplete: true } satisfies SignUpResult
    }

    try {
      updateAuthState({ isLoading: true })
      const result = await AuthService.signUp(email, password, name)
      updateAuthState({
        user: null,
        isLoading: false,
        hasCheckedAuth: true
      })
      return result
    } catch (error: unknown) {
      updateAuthState({ isLoading: false })
      throw error instanceof Error ? error : new Error('Failed to sign up')
    }
  }, [bypassUser, shouldBypassAuth, updateAuthState])

  const signOut = useCallback(async () => {
    if (shouldBypassAuth) {
      updateAuthState({
        user: null,
        isLoading: false,
        hasCheckedAuth: true,
        isAuthenticated: false
      })
      return
    }

    try {
      updateAuthState({ isLoading: true })
      await AuthService.signOut()
      updateAuthState({
        user: null,
        isLoading: false,
        hasCheckedAuth: true
      })
    } catch (error: unknown) {
      updateAuthState({
        user: null,
        isLoading: false,
        hasCheckedAuth: true
      })
      throw error instanceof Error ? error : new Error('Failed to sign out')
    }
  }, [shouldBypassAuth, updateAuthState])

  const forgotPassword = useCallback(async (email: string) => {
    if (shouldBypassAuth) {
      return
    }

    await AuthService.forgotPassword(email)
  }, [shouldBypassAuth])

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    if (shouldBypassAuth) {
      return
    }

    await AuthService.forgotPasswordSubmit(email, code, newPassword)
  }, [shouldBypassAuth])

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    if (shouldBypassAuth) {
      return
    }

    await AuthService.confirmSignUp(email, code)
  }, [shouldBypassAuth])

  const value = useMemo<AuthContextType>(() => ({
    ...authState,
    signIn,
    signUp,
    signOut,
    forgotPassword,
    resetPassword,
    confirmSignUp
  }), [authState, confirmSignUp, forgotPassword, resetPassword, signIn, signOut, signUp])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
