import { UserRole } from '@auteurium/shared-types'
import { CognitoJwtVerifier } from 'aws-jwt-verify'

import { validateToken, createContext } from '../../middleware/auth'

// Mock the JWT verifier
const mockVerify = jest.fn()
jest.mock('aws-jwt-verify')
const mockCognitoJwtVerifier = CognitoJwtVerifier as jest.Mocked<typeof CognitoJwtVerifier>
mockCognitoJwtVerifier.create = jest.fn().mockReturnValue({ verify: mockVerify } as unknown as ReturnType<typeof CognitoJwtVerifier.create>)

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateToken', () => {
    it('should validate a valid token and return user', async () => {
      const mockPayload = {
        sub: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        'custom:role': 'STANDARD',
        iat: Math.floor(Date.now() / 1000)
      }

      mockVerify.mockResolvedValue(mockPayload)

      const result = await validateToken('valid-token')

      expect(result).toEqual({
        id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.STANDARD,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string
      })

      expect(mockVerify).toHaveBeenCalledWith('valid-token')
    })

    it('should handle token without custom role and default to STANDARD', async () => {
      const mockPayload = {
        sub: 'user-id-123',
        username: 'testuser',
        iat: Math.floor(Date.now() / 1000)
      }

      mockVerify.mockResolvedValue(mockPayload)

      const result = await validateToken('token-without-role')

      expect(result?.role).toBe(UserRole.STANDARD)
      expect(result?.email).toBe('testuser')
      expect(result?.name).toBe('testuser')
    })

    it('should handle admin role', async () => {
      const mockPayload = {
        sub: 'admin-id-123',
        email: 'admin@example.com',
        name: 'Admin User',
        'custom:role': 'ADMIN',
        iat: Math.floor(Date.now() / 1000)
      }

      mockVerify.mockResolvedValue(mockPayload)

      const result = await validateToken('admin-token')

      expect(result?.role).toBe(UserRole.ADMIN)
    })

    it('should return null for invalid token', async () => {
      mockVerify.mockRejectedValue(new Error('Invalid token'))

      const result = await validateToken('invalid-token')

      expect(result).toBeNull()
    })
  })

  describe('createContext', () => {
    it('should create context with authenticated user', async () => {
      const mockPayload = {
        sub: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        'custom:role': 'STANDARD',
        iat: Math.floor(Date.now() / 1000)
      }

      mockVerify.mockResolvedValue(mockPayload)

      const mockEvent = {
        headers: {
          Authorization: 'Bearer valid-token'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      }

      const context = await createContext(mockEvent)

      expect(context.user).toBeDefined()
      expect(context.user?.id).toBe('user-id-123')
      expect(context.isAdmin).toBe(false)
      expect(context.requestId).toBe('test-request-id')
    })

    it('should create context with admin user', async () => {
      const mockPayload = {
        sub: 'admin-id-123',
        email: 'admin@example.com',
        'custom:role': 'ADMIN',
        iat: Math.floor(Date.now() / 1000)
      }

      mockVerify.mockResolvedValue(mockPayload)

      const mockEvent = {
        headers: {
          Authorization: 'Bearer admin-token'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      }

      const context = await createContext(mockEvent)

      expect(context.isAdmin).toBe(true)
    })

    it('should create unauthenticated context without authorization header', async () => {
      const mockEvent = {
        headers: {},
        requestContext: {
          requestId: 'test-request-id'
        }
      }

      const context = await createContext(mockEvent)

      expect(context.user).toBeUndefined()
      expect(context.isAdmin).toBe(false)
      expect(context.requestId).toBe('test-request-id')
    })

    it('should create unauthenticated context with invalid token', async () => {
      mockVerify.mockRejectedValue(new Error('Invalid token'))

      const mockEvent = {
        headers: {
          Authorization: 'Bearer invalid-token'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      }

      const context = await createContext(mockEvent)

      expect(context.user).toBeUndefined()
      expect(context.isAdmin).toBe(false)
    })

    it('should handle case-insensitive authorization header', async () => {
      const mockPayload = {
        sub: 'user-id-123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000)
      }

      mockVerify.mockResolvedValue(mockPayload)

      const mockEvent = {
        headers: {
          authorization: 'Bearer valid-token' // lowercase
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      }

      const context = await createContext(mockEvent)

      expect(context.user).toBeDefined()
    })

    it('should handle malformed Bearer token', async () => {
      const mockEvent = {
        headers: {
          Authorization: 'InvalidFormat token'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      }

      const context = await createContext(mockEvent)

      expect(context.user).toBeUndefined()
      expect(context.isAdmin).toBe(false)
    })
  })
})