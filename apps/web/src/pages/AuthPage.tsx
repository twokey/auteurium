import { useState } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm'
import { EmailConfirmation } from '../components/auth/EmailConfirmation'

type AuthView = 'login' | 'register' | 'forgotPassword' | 'emailConfirmation'

export const AuthPage = () => {
  const [currentView, setCurrentView] = useState<AuthView>('login')
  const [pendingEmail, setPendingEmail] = useState('')

  const handleRegistrationSuccess = (email: string) => {
    setPendingEmail(email)
    setCurrentView('emailConfirmation')
  }

  const handleEmailConfirmed = () => {
    setCurrentView('login')
    setPendingEmail('')
  }

  const renderAuthForm = () => {
    switch (currentView) {
      case 'login':
        return (
          <LoginForm
            onSwitchToRegister={() => setCurrentView('register')}
            onSwitchToForgotPassword={() => setCurrentView('forgotPassword')}
          />
        )
      case 'register':
        return (
          <RegisterForm
            onSwitchToLogin={() => setCurrentView('login')}
            onRegistrationSuccess={handleRegistrationSuccess}
          />
        )
      case 'forgotPassword':
        return (
          <ForgotPasswordForm
            onSwitchToLogin={() => setCurrentView('login')}
          />
        )
      case 'emailConfirmation':
        return (
          <EmailConfirmation
            email={pendingEmail}
            onConfirmed={handleEmailConfirmed}
            onBackToLogin={() => setCurrentView('login')}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900 mb-2">
          Auteurium
        </h1>
        <p className="text-center text-sm text-gray-600">
          Visual snippet organization platform
        </p>
      </div>

      <div className="mt-8">
        {renderAuthForm()}
      </div>
    </div>
  )
}