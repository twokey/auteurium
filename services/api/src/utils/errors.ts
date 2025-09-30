import { ZodError } from 'zod'

import type { Logger } from '@aws-lambda-powertools/logger'

export enum ErrorCode {
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const createAuthError = (message = 'Authentication required') =>
  new AppError(ErrorCode.AUTHENTICATION_REQUIRED, message, 401)

export const createForbiddenError = (message = 'Access denied') =>
  new AppError(ErrorCode.FORBIDDEN, message, 403)

export const createNotFoundError = (resource: string) =>
  new AppError(ErrorCode.NOT_FOUND, `${resource} not found`, 404)

export const createValidationError = (error: ZodError) =>
  new AppError(
    ErrorCode.VALIDATION_ERROR,
    'Validation failed',
    400,
    error.errors.map((validationError) => ({
      field: validationError.path.join('.'),
      message: validationError.message
    }))
  )

export const createConflictError = (message: string) =>
  new AppError(ErrorCode.CONFLICT, message, 409)

interface AwsSdkError {
  code?: string
  message?: string
}

const isAwsError = (value: unknown): value is AwsSdkError =>
  typeof value === 'object' && value !== null && ('code' in value || 'message' in value)

export const handleError = (
  error: unknown,
  logger: Logger,
  context?: Record<string, unknown>
): never => {
  logger.error('Error occurred', {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    context
  })

  if (error instanceof ZodError) {
    throw createValidationError(error)
  }

  if (error instanceof AppError) {
    throw error
  }

  if (isAwsError(error) && error.code === 'ConditionalCheckFailedException') {
    throw createNotFoundError('Resource')
  }

  if (isAwsError(error) && error.code && error.message) {
    logger.error('AWS SDK error', {
      code: error.code,
      message: error.message,
      context
    })
  }

  // In development, expose more error details
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const errorMessage = isDevelopment && error instanceof Error
    ? `Internal error: ${error.message}`
    : 'An internal error occurred'

  throw new AppError(ErrorCode.INTERNAL_ERROR, errorMessage, 500)
}
