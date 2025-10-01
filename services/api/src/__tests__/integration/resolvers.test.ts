import { ConnectionType } from '@auteurium/shared-types'

import { handler } from '../../index'
import { createMockUser, createMockAdminUser } from '../setup'

// Mock DynamoDB operations (scan removed - no longer supported per IAM policy)
const mockDynamoDBOperations = {
  put: jest.fn(),
  get: jest.fn(),
  query: jest.fn(),
  delete: jest.fn(),
  update: jest.fn()
}

// Mock the database client
jest.mock('../../database/client', () => ({
  dynamodb: mockDynamoDBOperations,
  TABLES: {
    USERS: 'test-users',
    PROJECTS: 'test-projects',
    SNIPPETS: 'test-snippets',
    CONNECTIONS: 'test-connections',
    VERSIONS: 'test-versions'
  },
  generateId: () => 'test-generated-id',
  getCurrentTimestamp: () => '2025-01-01T00:00:00.000Z'
}))

describe('GraphQL Resolvers Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset all mock implementations
    Object.values(mockDynamoDBOperations).forEach(mock => {
      mock.mockReturnValue({ promise: () => Promise.resolve({}) })
    })
  })

  const createMockEvent = (fieldName: string, parentTypeName: string, args: unknown, user = createMockUser()) => ({
    info: { fieldName, parentTypeName },
    arguments: args,
    request: {
      headers: {
        'x-amz-requestid': 'test-request-id'
      }
    },
    requestContext: {
      requestId: 'test-request-id'
    },
    headers: {
      Authorization: `Bearer mock-token-for-${user.id}`
    }
  })

  describe('Project Resolvers', () => {
    describe('createProject', () => {
      it('should create a project successfully', async () => {
        const user = createMockUser()
        const projectInput = {
          input: {
            name: 'Test Project',
            description: 'Test Description'
          }
        }

        mockDynamoDBOperations.put.mockReturnValue({
          promise: () => Promise.resolve({})
        })

        const event = createMockEvent('createProject', 'Mutation', projectInput, user)
        const result = await handler(event)

        expect(result).toMatchObject({
          id: 'test-generated-id',
          userId: user.id,
          name: 'Test Project',
          description: 'Test Description',
          createdAt: expect.any(String) as string,
          updatedAt: expect.any(String) as string,
          lastModified: expect.any(String) as string
        })

        expect(mockDynamoDBOperations.put).toHaveBeenCalledWith(
          expect.objectContaining({
            TableName: 'test-projects',
            Item: expect.objectContaining({
              name: 'Test Project',
              description: 'Test Description',
              userId: user.id
            }) as Record<string, unknown>
          })
        )
      })

      it('should require authentication', async () => {
        const projectInput = {
          input: {
            name: 'Test Project'
          }
        }

        const event = createMockEvent('createProject', 'Mutation', projectInput)
        // Remove auth header to simulate unauthenticated request
        delete event.headers.Authorization

        await expect(handler(event)).rejects.toThrow('Authentication required')
      })
    })

    describe('deleteProject', () => {
      it('should cascade delete project with all snippets and connections', async () => {
        const user = createMockUser()
        const projectId = 'test-project-1'

        // Mock project exists
        mockDynamoDBOperations.get.mockReturnValue({
          promise: () => Promise.resolve({
            Item: {
              id: projectId,
              userId: user.id,
              name: 'Test Project',
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z',
              lastModified: '2025-01-01T00:00:00.000Z'
            }
          })
        })

        // Mock snippets query
        mockDynamoDBOperations.query.mockImplementation(({ KeyConditionExpression }: { KeyConditionExpression?: string }) => {
          if (KeyConditionExpression?.includes('projectId')) {
            return {
              promise: () => Promise.resolve({
                Items: [
                  {
                    id: 'snippet-1',
                    projectId,
                    userId: user.id,
                    textField1: 'Text 1',
                    textField2: 'Text 2',
                    position: { x: 0, y: 0 },
                    tags: [],
                    categories: [],
                    version: 1,
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z'
                  }
                ]
              })
            }
          }
          return { promise: () => Promise.resolve({ Items: [] }) }
        })

        mockDynamoDBOperations.delete.mockReturnValue({
          promise: () => Promise.resolve()
        })

        const event = createMockEvent('deleteProject', 'Mutation', { projectId }, user)
        const result = await handler(event)

        expect(result).toBe(true)

        // Verify cascade delete calls
        expect(mockDynamoDBOperations.delete).toHaveBeenCalledWith(
          expect.objectContaining({
            TableName: 'test-projects',
            Key: { userId: user.id, id: projectId }
          })
        )
      })

      it('should not allow deleting projects owned by other users', async () => {
        const user = createMockUser()
        const otherUser = { ...createMockUser(), id: 'other-user' }
        const projectId = 'test-project-1'

        // Mock project owned by different user
        mockDynamoDBOperations.get.mockReturnValue({
          promise: () => Promise.resolve({
            Item: {
              id: projectId,
              userId: otherUser.id, // Different user
              name: 'Other User Project'
            }
          })
        })

        const event = createMockEvent('deleteProject', 'Mutation', { projectId }, user)

        await expect(handler(event)).rejects.toThrow('Access denied to project')
      })
    })
  })

  describe('Snippet Resolvers', () => {
    describe('createSnippet', () => {
      it('should create a snippet successfully', async () => {
        const user = createMockUser()
        const projectId = 'test-project-1'
        const snippetInput = {
          input: {
            projectId,
            title: 'Test snippet title',
            textField1: 'Test text 1',
            textField2: 'Test text 2',
            position: { x: 100, y: 200 },
            tags: ['tag1', 'tag2'],
            categories: ['cat1']
          }
        }

        // Mock project exists and is owned by user
        mockDynamoDBOperations.get.mockReturnValue({
          promise: () => Promise.resolve({
            Item: {
              id: projectId,
              userId: user.id,
              name: 'Test Project'
            }
          })
        })

        mockDynamoDBOperations.put.mockReturnValue({
          promise: () => Promise.resolve({})
        })

        const event = createMockEvent('createSnippet', 'Mutation', snippetInput, user)
        const result = await handler(event)

        expect(result).toMatchObject({
          id: 'test-generated-id',
          projectId,
          userId: user.id,
          title: 'Test snippet title',
          textField1: 'Test text 1',
          textField2: 'Test text 2',
          position: { x: 100, y: 200 },
          tags: ['tag1', 'tag2'],
          categories: ['cat1'],
          version: 1,
          createdAt: expect.any(String) as string,
          updatedAt: expect.any(String) as string
        })

        expect(mockDynamoDBOperations.put).toHaveBeenCalledWith(
          expect.objectContaining({
            TableName: 'test-snippets',
            Item: expect.objectContaining({
              projectId,
              title: 'Test snippet title',
              textField1: 'Test text 1',
              textField2: 'Test text 2'
            }) as Record<string, unknown>
          })
        )
      })
    })

    describe('updateSnippet', () => {
      it('should update snippet with new content and create version', async () => {
        const user = createMockUser()
        const projectId = 'test-project-1'
        const snippetId = 'test-snippet-1'

        // Mock existing snippet
        mockDynamoDBOperations.get.mockReturnValue({
          promise: () => Promise.resolve({
            Item: {
              id: snippetId,
              projectId,
              userId: user.id,
              title: 'Original title',
              textField1: 'Original text 1',
              textField2: 'Original text 2',
              position: { x: 0, y: 0 },
              tags: [],
              categories: [],
              version: 1,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            }
          })
        })

        mockDynamoDBOperations.update.mockReturnValue({
          promise: () => Promise.resolve({
            Attributes: {
              id: snippetId,
              projectId,
              userId: user.id,
              title: 'Updated title',
              textField1: 'Updated text 1',
              textField2: 'Updated text 2',
              position: { x: 50, y: 50 },
              tags: ['new-tag'],
              categories: [],
              version: 2,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            }
          })
        })

        mockDynamoDBOperations.put.mockReturnValue({
          promise: () => Promise.resolve({}) // For version creation
        })

        const updateInput = {
          projectId,
          snippetId,
          input: {
            title: 'Updated title',
            textField1: 'Updated text 1',
            textField2: 'Updated text 2',
            position: { x: 50, y: 50 },
            tags: ['new-tag']
          }
        }

        const event = createMockEvent('updateSnippet', 'Mutation', updateInput, user)
        const result = await handler(event)

        expect(result.version).toBe(2)
        expect(result.textField1).toBe('Updated text 1')
        expect(result.title).toBe('Updated title')

        // Verify version was created
        expect(mockDynamoDBOperations.put).toHaveBeenCalledWith(
          expect.objectContaining({
            TableName: 'test-versions',
            Item: expect.objectContaining({
              snippetId,
              version: 2,
              title: 'Updated title'
            }) as Record<string, unknown>
          })
        )
      })
    })
  })

  describe('Connection Resolvers', () => {
    describe('createConnection', () => {
      it('should create connection between snippets', async () => {
        const user = createMockUser()
        const projectId = 'test-project-1'
        const sourceSnippetId = 'snippet-1'
        const targetSnippetId = 'snippet-2'

        // Mock both snippets exist and are owned by user
        mockDynamoDBOperations.get.mockImplementation(({ Key }: { Key: { id: string } }) => ({
          promise: () => Promise.resolve({
            Item: {
              id: Key.id,
              projectId,
              userId: user.id,
              textField1: 'Test text',
              textField2: 'Test text',
              position: { x: 0, y: 0 },
              tags: [],
              categories: [],
              version: 1,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            }
          })
        }))

        // Mock no existing connections
        mockDynamoDBOperations.query.mockReturnValue({
          promise: () => Promise.resolve({ Items: [] })
        })

        mockDynamoDBOperations.put.mockReturnValue({
          promise: () => Promise.resolve({})
        })

        const connectionInput = {
          input: {
            projectId,
            sourceSnippetId,
            targetSnippetId,
            connectionType: ConnectionType.DEPENDS_ON,
            label: 'Test Connection',
            description: 'A test connection'
          }
        }

        const event = createMockEvent('createConnection', 'Mutation', connectionInput, user)
        const result = await handler(event)

        expect(result).toMatchObject({
          id: 'test-generated-id',
          projectId,
          sourceSnippetId,
          targetSnippetId,
          connectionType: ConnectionType.DEPENDS_ON,
          label: 'Test Connection',
          description: 'A test connection',
          userId: user.id,
          createdAt: expect.any(String) as string
        })

        expect(mockDynamoDBOperations.put).toHaveBeenCalledWith(
          expect.objectContaining({
            TableName: 'test-connections',
            Item: expect.objectContaining({
              sourceSnippetId,
              targetSnippetId,
              connectionType: ConnectionType.DEPENDS_ON
            }) as Record<string, unknown>
          })
        )
      })

      it('should prevent creating connections to snippets not owned by user', async () => {
        const user = createMockUser()
        const otherUser = { ...createMockUser(), id: 'other-user' }
        const projectId = 'test-project-1'

        // Mock source snippet owned by user, target owned by other user
        mockDynamoDBOperations.get.mockImplementation(({ Key }: { Key: { id: string } }) => ({
          promise: () => Promise.resolve({
            Item: {
              id: Key.id,
              projectId,
              userId: Key.id === 'snippet-1' ? user.id : otherUser.id, // Different ownership
              textField1: 'Test text',
              textField2: 'Test text',
              position: { x: 0, y: 0 },
              tags: [],
              categories: [],
              version: 1,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            }
          })
        }))

        const connectionInput = {
          input: {
            projectId,
            sourceSnippetId: 'snippet-1',
            targetSnippetId: 'snippet-2',
            connectionType: ConnectionType.RELATED
          }
        }

        const event = createMockEvent('createConnection', 'Mutation', connectionInput, user)

        await expect(handler(event)).rejects.toThrow('Content access denied - privacy protected')
      })

      it('should prevent self-connections', async () => {
        const user = createMockUser()
        const projectId = 'test-project-1'
        const snippetId = 'snippet-1'

        mockDynamoDBOperations.get.mockReturnValue({
          promise: () => Promise.resolve({
            Item: {
              id: snippetId,
              projectId,
              userId: user.id,
              textField1: 'Test text',
              textField2: 'Test text',
              position: { x: 0, y: 0 },
              tags: [],
              categories: [],
              version: 1,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            }
          })
        })

        const connectionInput = {
          input: {
            projectId,
            sourceSnippetId: snippetId,
            targetSnippetId: snippetId, // Same snippet
            connectionType: ConnectionType.RELATED
          }
        }

        const event = createMockEvent('createConnection', 'Mutation', connectionInput, user)

        await expect(handler(event)).rejects.toThrow('Cannot create connection from snippet to itself')
      })
    })
  })

  describe('Authorization Tests', () => {
    it('should prevent admin from accessing unimplemented user listing endpoint', async () => {
      const admin = createMockAdminUser()

      const event = createMockEvent('users', 'Query', {}, admin)

      await expect(handler(event)).rejects.toThrow('Not implemented')
    })

    it('should prevent standard user from accessing user management endpoints', async () => {
      const user = createMockUser()

      const event = createMockEvent('users', 'Query', {}, user)

      await expect(handler(event)).rejects.toThrow('Admin access required')
    })

    it('should enforce content privacy even for admin users', async () => {
      const admin = createMockAdminUser()
      const regularUser = createMockUser()
      const projectId = 'test-project-1'
      const snippetId = 'test-snippet-1'

      // Mock snippet owned by regular user
      mockDynamoDBOperations.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: {
            id: snippetId,
            projectId,
            userId: regularUser.id, // Owned by regular user, not admin
            textField1: 'Private content',
            textField2: 'Private content',
            position: { x: 0, y: 0 },
            tags: [],
            categories: [],
            version: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z'
          }
        })
      })

      const event = createMockEvent('snippet', 'Query', { projectId, snippetId }, admin)

      await expect(handler(event)).rejects.toThrow('Content access denied - privacy protected')
    })
  })
})
