import { z } from 'zod'

import {
  validateInput,
  requireAuth,
  requireAdmin,
  requireOwnership,
  enforceContentPrivacy,
  validateUserOwnership,
  isAdmin,
  idValidation,
  paginationValidation
} from '../../middleware/validation'
import { AppError, ErrorCode } from '../../utils/errors'
import { createMockUser, createMockAdminUser } from '../setup'

describe('Validation Middleware', () => {
  describe('validateInput', () => {
    it('should validate valid input', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      })

      const validInput = { name: 'Test', age: 25 }
      const result = validateInput(schema, validInput)

      expect(result).toEqual(validInput)
    })

    it('should throw validation error for invalid input', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      })

      const invalidInput = { name: 'Test', age: 'not-a-number' }

      expect(() => validateInput(schema, invalidInput)).toThrow(AppError)
      expect(() => validateInput(schema, invalidInput)).toThrow(expect.objectContaining({
        code: ErrorCode.VALIDATION_ERROR
      }))
    })
  })

  describe('requireAuth', () => {
    it('should return user when authenticated', () => {
      const mockUser = createMockUser()
      const result = requireAuth(mockUser)

      expect(result).toEqual(mockUser)
    })

    it('should throw auth error when not authenticated', () => {
      expect(() => requireAuth(undefined)).toThrow(AppError)
      expect(() => requireAuth(undefined)).toThrow(expect.objectContaining({
        code: ErrorCode.AUTHENTICATION_REQUIRED
      }))
    })
  })

  describe('requireAdmin', () => {
    it('should not throw for admin user', () => {
      const mockAdmin = createMockAdminUser()

      expect(() => requireAdmin(mockAdmin)).not.toThrow()
    })

    it('should throw auth error for unauthenticated user', () => {
      expect(() => requireAdmin(undefined)).toThrow(AppError)
      expect(() => requireAdmin(undefined)).toThrow(expect.objectContaining({
        code: ErrorCode.AUTHENTICATION_REQUIRED
      }))
    })

    it('should throw forbidden error for non-admin user', () => {
      const mockUser = createMockUser()

      expect(() => requireAdmin(mockUser)).toThrow(AppError)
      expect(() => requireAdmin(mockUser)).toThrow(expect.objectContaining({
        code: ErrorCode.FORBIDDEN
      }))
    })
  })

  describe('requireOwnership', () => {
    it('should return user when they own the resource', () => {
      const mockUser = createMockUser()
      const result = requireOwnership(mockUser, mockUser.id, 'project')

      expect(result).toEqual(mockUser)
    })

    it('should throw forbidden error when user does not own resource', () => {
      const mockUser = createMockUser()

      expect(() => requireOwnership(mockUser, 'different-user-id', 'project')).toThrow(AppError)
      expect(() => requireOwnership(mockUser, 'different-user-id', 'project')).toThrow(expect.objectContaining({
        code: ErrorCode.FORBIDDEN
      }))
    })

    it('should throw auth error for unauthenticated user', () => {
      expect(() => requireOwnership(undefined, 'any-user-id', 'project')).toThrow(AppError)
      expect(() => requireOwnership(undefined, 'any-user-id', 'project')).toThrow(expect.objectContaining({
        code: ErrorCode.AUTHENTICATION_REQUIRED
      }))
    })
  })

  describe('enforceContentPrivacy', () => {
    it('should return user when accessing their own content', () => {
      const mockUser = createMockUser()
      const result = enforceContentPrivacy(mockUser, mockUser.id)

      expect(result).toEqual(mockUser)
    })

    it('should throw forbidden error even for admin accessing other user content', () => {
      const mockAdmin = createMockAdminUser()

      expect(() => enforceContentPrivacy(mockAdmin, 'different-user-id')).toThrow(AppError)
      expect(() => enforceContentPrivacy(mockAdmin, 'different-user-id')).toThrow(expect.objectContaining({
        code: ErrorCode.FORBIDDEN,
        message: 'Content access denied - privacy protected'
      }))
    })

    it('should throw auth error for unauthenticated user', () => {
      expect(() => enforceContentPrivacy(undefined, 'any-user-id')).toThrow(AppError)
      expect(() => enforceContentPrivacy(undefined, 'any-user-id')).toThrow(expect.objectContaining({
        code: ErrorCode.AUTHENTICATION_REQUIRED
      }))
    })
  })

  describe('validateUserOwnership', () => {
    it('should not throw when user owns resource', () => {
      expect(() => validateUserOwnership('user-id', 'user-id', 'project')).not.toThrow()
    })

    it('should throw forbidden error when user does not own resource', () => {
      expect(() => validateUserOwnership('user-id', 'different-user-id', 'project')).toThrow(AppError)
      expect(() => validateUserOwnership('user-id', 'different-user-id', 'project')).toThrow(expect.objectContaining({
        code: ErrorCode.FORBIDDEN,
        message: 'Access denied to project'
      }))
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin user', () => {
      const mockAdmin = createMockAdminUser()
      expect(isAdmin(mockAdmin)).toBe(true)
    })

    it('should return false for standard user', () => {
      const mockUser = createMockUser()
      expect(isAdmin(mockUser)).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(isAdmin(undefined)).toBe(false)
    })
  })

  describe('validation schemas', () => {
    describe('idValidation', () => {
      it('should validate valid UUID', () => {
        const validId = { id: '123e4567-e89b-12d3-a456-426614174000' }
        const result = validateInput(idValidation, validId)

        expect(result).toEqual(validId)
      })

      it('should reject invalid UUID', () => {
        const invalidId = { id: 'not-a-uuid' }

        expect(() => validateInput(idValidation, invalidId)).toThrow(AppError)
      })
    })

    describe('paginationValidation', () => {
      it('should validate valid pagination', () => {
        const validPagination = { limit: 20, offset: 0 }
        const result = validateInput(paginationValidation, validPagination)

        expect(result).toEqual(validPagination)
      })

      it('should use defaults when values not provided', () => {
        const emptyPagination = {}
        const result = validateInput(paginationValidation, emptyPagination)

        expect(result).toEqual({ limit: 20, offset: 0 })
      })

      it('should reject limit exceeding maximum', () => {
        const invalidPagination = { limit: 101, offset: 0 }

        expect(() => validateInput(paginationValidation, invalidPagination)).toThrow(AppError)
      })

      it('should reject negative offset', () => {
        const invalidPagination = { limit: 20, offset: -1 }

        expect(() => validateInput(paginationValidation, invalidPagination)).toThrow(AppError)
      })
    })
  })
})