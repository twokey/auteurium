import { Logger } from '@aws-lambda-powertools/logger'
import { ZodError } from 'zod'

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
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const createAuthError = (message: string = 'Authentication required') => new AppError(
  ErrorCode.AUTHENTICATION_REQUIRED,
  message,
  401
)

export const createForbiddenError = (message: string = 'Access denied') => new AppError(
  ErrorCode.FORBIDDEN,
  message,
  403
)

export const createNotFoundError = (resource: string) => new AppError(
  ErrorCode.NOT_FOUND,
  `${resource} not found`,
  404
)

export const createValidationError = (error: ZodError) => new AppError(
  ErrorCode.VALIDATION_ERROR,
  'Validation failed',
  400,
  error.errors.map(e => ({
    field: e.path.join('.'),
    message: e.message
  }))
)

export const createConflictError = (message: string) => new AppError(
  ErrorCode.CONFLICT,
  message,
  409
)

export const handleError = (error: any, logger: Logger, context?: any) => {
  logger.error('Error occurred', { error, context })

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    throw createValidationError(error)
  }

  // Handle known app errors
  if (error instanceof AppError) {
    throw error
  }

  // Handle DynamoDB conditional check failures
  if (error.code === 'ConditionalCheckFailedException') {
    throw createNotFoundError('Resource')
  }

  // Handle other AWS SDK errors
  if (error.code && error.message) {
    logger.error('AWS SDK error', { 
      code: error.code, 
      message: error.message,
      context 
    })
  }

  // Generic internal error
  throw new AppError(
    ErrorCode.INTERNAL_ERROR,
    'An internal error occurred',
    500
  )
}