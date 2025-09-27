import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface LoginFormProps {
  onSwitchToRegister: () => void
  onSwitchToForgotPassword: () => void
}

export const LoginForm = ({ onSwitchToRegister, onSwitchToForgotPassword }: LoginFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const { signIn, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    let hasInlineError = false

    if (!email) {
      setEmailError('Email is required')
      hasInlineError = true
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address')
      hasInlineError = true
    }

    if (!password) {
      setPasswordError('Password is required')
      hasInlineError = true
    }

    if (hasInlineError) {
      return
    }

    try {
      await signIn(email, password)
    } catch (error: any) {
      // Handle different types of AWS Amplify errors
      let errorMessage = 'Login failed'

      if (error?.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address'
      } else if (error?.name === 'NotAuthorizedException') {
        errorMessage = 'Incorrect email or password'
      } else if (error?.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Sign in to Auteurium
      </h2>
      
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) setEmailError('')
            }}
            onFocus={() => {
              // Clear error when user focuses on the field to start correcting
              if (error) setError('')
            }}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
            aria-invalid={emailError ? 'true' : 'false'}
          />
          {emailError && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {emailError}
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (passwordError) setPasswordError('')
            }}
            onFocus={() => {
              // Clear error when user focuses on the field to start correcting
              if (error) setError('')
            }}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
            aria-invalid={passwordError ? 'true' : 'false'}
          />
          {passwordError && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {passwordError}
            </p>
          )}
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-4 rounded-md border border-red-200 flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <button
          onClick={onSwitchToForgotPassword}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          Forgot your password?
        </button>
        
        <div className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  )
}
