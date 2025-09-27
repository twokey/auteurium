import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface RegisterFormProps {
  onSwitchToLogin: () => void
  onRegistrationSuccess: (email: string) => void
}

export const RegisterForm = ({ onSwitchToLogin, onRegistrationSuccess }: RegisterFormProps) => {
  const createEmptyForm = () => ({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  })
  const createEmptyErrors = () => ({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [formData, setFormData] = useState(createEmptyForm)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState(createEmptyErrors)
  const { signUp, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors(createEmptyErrors())

    const { email, password, confirmPassword, name } = formData

    const errors = createEmptyErrors()

    if (!name.trim()) {
      errors.name = 'Full name is required'
    }

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (password && confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match'
    }

    const hasErrors = Object.values(errors).some(Boolean)
    if (hasErrors) {
      setFieldErrors(errors)
      return
    }

    try {
      const result = await signUp(email, password, name)

      // Check if the result indicates email confirmation is needed
      if (result && result.nextStep && result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        onRegistrationSuccess(email)
      } else if (result && result.isSignUpComplete) {
        onRegistrationSuccess(email)
      } else {
        onRegistrationSuccess(email)
      }
    } catch (error: any) {
      let errorMessage = 'Registration failed'

      if (error?.name === 'UsernameExistsException') {
        errorMessage = 'An account with this email already exists'
      } else if (error?.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
    }
  }

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) {
      setError('')
    }
    setFieldErrors(prev => {
      if (!prev[field]) {
        return prev
      }
      return {
        ...prev,
        [field]: ''
      }
    })

    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Create your account
      </h2>
      
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full name
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange('name')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your full name"
            aria-invalid={fieldErrors.name ? 'true' : 'false'}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
            aria-invalid={fieldErrors.email ? 'true' : 'false'}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.email}
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
            value={formData.password}
            onChange={handleInputChange('password')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Create a password"
            aria-invalid={fieldErrors.password ? 'true' : 'false'}
          />
          {fieldErrors.password ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.password}
            </p>
          ) : formData.password.length === 0 ? (
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 8 characters long
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Confirm your password"
            aria-invalid={fieldErrors.confirmPassword ? 'true' : 'false'}
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <div className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}
