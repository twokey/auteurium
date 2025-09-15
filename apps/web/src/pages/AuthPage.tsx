import { useState } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm'
import { EmailConfirmation } from '../components/auth/EmailConfirmation'

type AuthView = 'login' | 'register' | 'forgotPassword' | 'emailConfirmation'

export const AuthPage = () => {
  const [currentView, setCurrentView] = useState<AuthView>(() => {
    // Try to restore view from sessionStorage
    try {
      const saved = sessionStorage.getItem('authPageView')
      return (saved as AuthView) || 'login'
    } catch {
      return 'login'
    }
  })

  const [pendingEmail, setPendingEmail] = useState(() => {
    // Try to restore email from sessionStorage
    try {
      return sessionStorage.getItem('authPageEmail') || ''
    } catch {
      return ''
    }
  })

  const updateView = (view: AuthView) => {
    console.log(`🔄 AuthPage updating view from ${currentView} to ${view}`)
    setCurrentView(view)
    try {
      sessionStorage.setItem('authPageView', view)
    } catch (error) {
      console.warn('Failed to save view to sessionStorage:', error)
    }
  }

  const updatePendingEmail = (email: string) => {
    console.log(`📧 AuthPage updating pending email to: ${email}`)
    setPendingEmail(email)
    try {
      sessionStorage.setItem('authPageEmail', email)
    } catch (error) {
      console.warn('Failed to save email to sessionStorage:', error)
    }
  }

  const handleRegistrationSuccess = (email: string) => {
    console.log('🎯 AuthPage.handleRegistrationSuccess called with email:', email)
    updatePendingEmail(email)
    updateView('emailConfirmation')
    console.log('✅ AuthPage switched to emailConfirmation view')
  }

  const handleEmailConfirmed = () => {
    updateView('login')
    updatePendingEmail('')
    // Clear sessionStorage
    try {
      sessionStorage.removeItem('authPageView')
      sessionStorage.removeItem('authPageEmail')
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error)
    }
  }

  const renderAuthForm = () => {
    console.log('🔄 AuthPage rendering view:', currentView)
    switch (currentView) {
      case 'login':
        return (
          <LoginForm
            onSwitchToRegister={() => updateView('register')}
            onSwitchToForgotPassword={() => updateView('forgotPassword')}
          />
        )
      case 'register':
        return (
          <RegisterForm
            onSwitchToLogin={() => updateView('login')}
            onRegistrationSuccess={handleRegistrationSuccess}
          />
        )
      case 'forgotPassword':
        return (
          <ForgotPasswordForm
            onSwitchToLogin={() => updateView('login')}
          />
        )
      case 'emailConfirmation':
        return (
          <EmailConfirmation
            email={pendingEmail}
            onConfirmed={handleEmailConfirmed}
            onBackToLogin={() => updateView('login')}
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