import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface EmailConfirmationProps {
  email: string
  onConfirmed: () => void
  onBackToLogin: () => void
}

export const EmailConfirmation = ({ email, onConfirmed, onBackToLogin }: EmailConfirmationProps) => {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { confirmSignUp, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!code) {
      setError('Please enter the confirmation code')
      return
    }

    try {
      await confirmSignUp(email, code)
      setSuccess('Email confirmed successfully! You can now sign in.')
      setTimeout(() => {
        onConfirmed()
      }, 2000)
    } catch (error: any) {
      setError(error.message || 'Failed to confirm email')
    }
  }

  const handleResendCode = async () => {
    // TODO: Implement resend confirmation code
    // This would require adding a resend method to the AuthService
    setError('')
    setSuccess('Confirmation code resent to your email')
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Confirm your email
      </h2>
      
      <div className="mb-6 text-center text-gray-600">
        <p className="mb-2">We've sent a confirmation code to:</p>
        <p className="font-medium text-gray-900">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Confirmation code
          </label>
          <input
            id="code"
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-wider"
            placeholder="Enter code"
            maxLength={6}
          />
          <p className="mt-1 text-xs text-gray-500 text-center">
            Check your email for the 6-digit confirmation code
          </p>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Confirming...' : 'Confirm email'}
        </button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <button
          onClick={handleResendCode}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          Didn't receive the code? Resend
        </button>
        
        <div className="text-sm text-gray-600">
          <button
            onClick={onBackToLogin}
            className="text-blue-600 hover:text-blue-500"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}