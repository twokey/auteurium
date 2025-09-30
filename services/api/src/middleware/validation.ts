import { UserRole, type User } from '@auteurium/shared-types'
import { z } from 'zod'

import { createValidationError, createForbiddenError, createAuthError } from '../utils/errors'

export const validateInput = <T>(schema: z.ZodSchema<T>, input: unknown): T => {
  try {
    return schema.parse(input)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error)
    }
    throw error
  }
}

// Common validation schemas for GraphQL args
export const idValidation = z.object({
  id: z.string().uuid('Invalid ID format')
})

export const paginationValidation = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0)
})

// Helper to validate user ownership with strict type checking
export const validateUserOwnership = (userId: string, resourceUserId: string, resourceType: string): void => {
  if (userId !== resourceUserId) {
    throw createForbiddenError(`Access denied to ${resourceType}`)
  }
}

// Helper to check admin permissions with role-based access
export const requireAdmin = (user: User | undefined): void => {
  if (!user) {
    throw createAuthError('Authentication required')
  }
  if (user.role !== (UserRole.ADMIN as string)) {
    throw createForbiddenError('Admin access required')
  }
}

// Helper to require authentication with proper typing
export const requireAuth = (user: User | undefined): User => {
  if (!user) {
    throw createAuthError('Authentication required')
  }
  return user
}

// Helper to ensure user can only access their own data
export const requireOwnership = (user: User | undefined, resourceUserId: string, resourceType = 'resource'): User => {
  const authenticatedUser = requireAuth(user)
  validateUserOwnership(authenticatedUser.id, resourceUserId, resourceType)
  return authenticatedUser
}

// Helper to check if user is admin without throwing (for optional admin features)
export const isAdmin = (user: User | undefined): boolean => {
  return user?.role === (UserRole.ADMIN as string)
}

// Helper to enforce data isolation - ensures admins cannot access user content
export const enforceContentPrivacy = (user: User | undefined, resourceUserId: string): User => {
  const authenticatedUser = requireAuth(user)

  // Even admins cannot access other users' content
  if (authenticatedUser.id !== resourceUserId) {
    throw createForbiddenError('Content access denied - privacy protected')
  }

  return authenticatedUser
}