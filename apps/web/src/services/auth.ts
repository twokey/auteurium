import { signIn, signUp, signOut, getCurrentUser, confirmSignUp, resetPassword, confirmResetPassword, fetchAuthSession } from 'aws-amplify/auth'
// Temporary types until shared-types is available
export enum UserRole {
  ADMIN = 'admin',
  STANDARD = 'standard'
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export class AuthService {
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { username, userId } = await getCurrentUser()
      const session = await fetchAuthSession()

      // Get user attributes from the token
      const idToken = session.tokens?.idToken
      if (!idToken) {
        return null
      }

      // Extract user info from JWT payload
      const payload = idToken.payload

      return {
        id: userId,
        email: payload.email as string || username,
        name: payload.name as string || payload.email as string || username,
        role: (payload['custom:role'] as UserRole) || UserRole.STANDARD,
        createdAt: new Date(payload.iat! * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      }
    } catch (error) {
      return null
    }
  }

  static async signIn(email: string, password: string): Promise<void> {
    try {
      await signIn({
        username: email,
        password
      })
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  static async signUp(email: string, password: string, name: string): Promise<void> {
    try {
      console.log('🚀 Starting signUp process for:', email)
      console.log('📝 User attributes:', { email, name })

      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name
          }
        }
      })

      console.log('✅ SignUp result:', result)
      console.log('📧 Next step:', result.nextStep)

      if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        console.log('⚠️ User needs email confirmation. User created but UNCONFIRMED.')
        console.log('📬 Confirmation delivery details:', result.nextStep.codeDeliveryDetails)
      }

      return result
    } catch (error) {
      console.error('❌ Error signing up:', error)
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.__type || error.code
      })
      throw error
    }
  }

  static async signOut(): Promise<void> {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  static async confirmSignUp(email: string, code: string): Promise<void> {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code
      })
    } catch (error) {
      console.error('Error confirming sign up:', error)
      throw error
    }
  }

  static async forgotPassword(email: string): Promise<void> {
    try {
      await resetPassword({ username: email })
    } catch (error) {
      console.error('Error requesting password reset:', error)
      throw error
    }
  }

  static async forgotPasswordSubmit(email: string, code: string, newPassword: string): Promise<void> {
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword
      })
    } catch (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession()
      return session.tokens?.accessToken?.toString() || null
    } catch (error) {
      return null
    }
  }
}

