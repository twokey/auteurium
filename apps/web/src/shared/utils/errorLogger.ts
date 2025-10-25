/**
 * Centralized error logging utility
 * Provides consistent error handling and logging across the application
 */

export interface LoggedError {
  message: string
  stack?: string
  context?: Record<string, unknown>
  timestamp: string
}

class ErrorLogger {
  private errors: LoggedError[] = []
  private maxErrors = 100

  log(error: Error | string, context?: Record<string, unknown>): void {
    const loggedError: LoggedError = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      context,
      timestamp: new Date().toISOString()
    }

    this.errors.push(loggedError)
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorLogger]', loggedError)
    }
  }

  getErrors(): LoggedError[] {
    return [...this.errors]
  }

  clear(): void {
    this.errors = []
  }
}

export const errorLogger = new ErrorLogger()

// Helper functions for common error scenarios
export const logGraphQLError = (
  operationName: string,
  error: Error,
  variables?: Record<string, unknown>
): void => {
  errorLogger.log(error, {
    type: 'GraphQL',
    operation: operationName,
    variables
  })
}

export const logMutationError = (
  mutationName: string,
  error: Error,
  variables?: Record<string, unknown>
): void => {
  errorLogger.log(error, {
    type: 'Mutation',
    mutation: mutationName,
    variables
  })
}

export const logQueryError = (
  queryName: string,
  error: Error,
  variables?: Record<string, unknown>
): void => {
  errorLogger.log(error, {
    type: 'Query',
    query: queryName,
    variables
  })
}

export const logComponentError = (
  componentName: string,
  error: Error,
  additionalInfo?: Record<string, unknown>
): void => {
  errorLogger.log(error, {
    type: 'Component',
    component: componentName,
    ...additionalInfo
  })
}



