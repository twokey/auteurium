import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void
}

export const ForgotPasswordForm = ({ onSwitchToLogin }: ForgotPasswordFormProps) => {
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { forgotPassword, resetPassword, isLoading } = useAuth()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email) {
      setError('Please enter your email address')
      return
    }

    try {
      await forgotPassword(email)
      setSuccess('Password reset code sent to your email')
      setStep('reset')
    } catch (error: any) {
      setError(error.message || 'Failed to send reset code')
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!code || !newPassword || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    try {
      await resetPassword(email, code, newPassword)
      setSuccess('Password reset successful! You can now sign in with your new password.')
      setTimeout(() => {
        onSwitchToLogin()
      }, 2000)
    } catch (error: any) {
      setError(error.message || 'Failed to reset password')
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        {step === 'email' ? 'Reset your password' : 'Enter new password'}
      </h2>

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
            <p className="mt-1 text-xs text-gray-500">
              We'll send you a reset code to this email address
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
            {isLoading ? 'Sending...' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Reset code
            </label>
            <input
              id="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter the code from your email"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your new password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm your new password"
            />
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
            {isLoading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={onSwitchToLogin}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          Back to sign in
        </button>
      </div>
    </div>
  )
}