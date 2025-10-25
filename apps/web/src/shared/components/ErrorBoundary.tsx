/**
 * Error Boundary component
 * Catches JavaScript errors in child components and displays fallback UI
 */

import React, { Component, type ReactNode } from 'react'
import { ErrorFallback } from './ErrorFallback'
import { logComponentError } from '../utils/errorLogger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetKeys?: unknown[]
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to our error logger
    logComponentError('ErrorBoundary', error, {
      componentStack: errorInfo.componentStack
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset error boundary if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      )
      
      if (hasResetKeyChanged) {
        this.setState({ hasError: false, error: null })
      }
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          resetError={this.reset}
        />
      )
    }

    return this.props.children
  }
}

