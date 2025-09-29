import { createContext } from 'react'

import type { AuthState, SignUpResult } from '../services/auth'

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
