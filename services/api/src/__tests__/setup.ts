// Mock AWS SDK for tests
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      put: jest.fn().mockReturnValue({ promise: jest.fn() }),
      get: jest.fn().mockReturnValue({ promise: jest.fn() }),
      query: jest.fn().mockReturnValue({ promise: jest.fn() }),
      scan: jest.fn().mockReturnValue({ promise: jest.fn() }),
      delete: jest.fn().mockReturnValue({ promise: jest.fn() }),
      update: jest.fn().mockReturnValue({ promise: jest.fn() })
    }))
  }
}))

// Mock aws-jwt-verify
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({
      verify: jest.fn()
    }))
  }
}))

// Mock environment variables
process.env.USER_POOL_ID = 'test-user-pool-id'
process.env.USER_POOL_CLIENT_ID = 'test-client-id'
process.env.USERS_TABLE = 'test-users-table'
process.env.PROJECTS_TABLE = 'test-projects-table'
process.env.SNIPPETS_TABLE = 'test-snippets-table'
process.env.CONNECTIONS_TABLE = 'test-connections-table'
process.env.VERSIONS_TABLE = 'test-versions-table'
process.env.AWS_REGION = 'us-east-1'

// Set test timeout
jest.setTimeout(10000)

// Global test utilities
export const createMockUser = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'standard' as const,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z'
})

export const createMockAdminUser = () => ({
  id: 'test-admin-id',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'ADMIN' as const,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z'
})

export const createMockProject = () => ({
  id: 'test-project-id',
  userId: 'test-user-id',
  name: 'Test Project',
  description: 'Test project description',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  lastModified: '2025-01-01T00:00:00.000Z'
})

export const createMockGraphQLContext = (user = createMockUser()) => ({
  user,
  isAdmin: (user.role as string) === 'admin',
  requestId: 'test-request-id',
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
})