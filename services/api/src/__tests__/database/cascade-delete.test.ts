import { DynamoDB } from 'aws-sdk'

import {
  createConnection,
  queryConnections,
  deleteSnippetConnections
} from '../../database/connections'
import {
  createProject,
  deleteProject,
  getProject
} from '../../database/projects'
import {
  createSnippet,
  deleteSnippet,
  deleteProjectSnippets,
  getProjectSnippets
} from '../../database/snippets'
import { createMockUser, createMockProject } from '../setup'


// Mock DynamoDB
const mockPut = jest.fn().mockReturnValue({ promise: jest.fn() })
const mockGet = jest.fn().mockReturnValue({ promise: jest.fn() })
const mockQuery = jest.fn().mockReturnValue({ promise: jest.fn() })
const mockDelete = jest.fn().mockReturnValue({ promise: jest.fn() })

jest.mock('../../database/client', () => ({
  dynamodb: {
    put: mockPut,
    get: mockGet,
    query: mockQuery,
    delete: mockDelete
  },
  TABLES: {
    USERS: 'test-users',
    PROJECTS: 'test-projects',
    SNIPPETS: 'test-snippets',
    CONNECTIONS: 'test-connections',
    VERSIONS: 'test-versions'
  },
  generateId: () => 'test-id-' + Math.random().toString(36).substring(2),
  getCurrentTimestamp: () => '2025-01-01T00:00:00.000Z'
}))

describe('Cascade Delete Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Project Cascade Delete', () => {
    it('should delete project and all associated snippets, connections, and versions', async () => {
      const user = createMockUser()
      const projectId = 'test-project-1'
      const snippet1Id = 'test-snippet-1'
      const snippet2Id = 'test-snippet-2'
      const connectionId = 'test-connection-1'

      // Mock project exists
      mockGet.mockImplementation(({ Key }) => ({
        promise: () => Promise.resolve({
          Item: Key.id === projectId ? {
            id: projectId,
            userId: user.id,
            name: 'Test Project',
            description: 'Test Description',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
            lastModified: '2025-01-01T00:00:00.000Z'
          } : null
        })
      }))

      // Mock snippets in project
      mockQuery.mockImplementation(({ KeyConditionExpression }) => {
        if (KeyConditionExpression?.includes('projectId')) {
          return {
            promise: () => Promise.resolve({
              Items: [
                {
                  id: snippet1Id,
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
                },
                {
                  id: snippet2Id,
                  projectId,
                  userId: user.id,
                  textField1: 'Text 3',
                  textField2: 'Text 4',
                  position: { x: 100, y: 100 },
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

        // Mock connections query
        if (KeyConditionExpression?.includes('sourceSnippetId') ||
            KeyConditionExpression?.includes('targetSnippetId')) {
          return {
            promise: () => Promise.resolve({
              Items: [
                {
                  id: connectionId,
                  projectId,
                  sourceSnippetId: snippet1Id,
                  targetSnippetId: snippet2Id,
                  connectionType: 'RELATED',
                  userId: user.id,
                  createdAt: '2025-01-01T00:00:00.000Z',
                  updatedAt: '2025-01-01T00:00:00.000Z'
                }
              ]
            })
          }
        }

        // Mock versions query
        if (KeyConditionExpression?.includes('snippetId')) {
          return {
            promise: () => Promise.resolve({
              Items: [
                {
                  id: 'version-1',
                  snippetId: snippet1Id,
                  version: 1,
                  textField1: 'Text 1',
                  textField2: 'Text 2',
                  userId: user.id,
                  createdAt: '2025-01-01T00:00:00.000Z'
                }
              ]
            })
          }
        }

        return { promise: () => Promise.resolve({ Items: [] }) }
      })

      mockDelete.mockReturnValue({ promise: () => Promise.resolve() })

      // Execute cascade delete
      await deleteProjectSnippets(projectId, user.id)

      // Verify all deletes were called
      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections',
          Key: expect.any(Object)
        })
      )

      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-versions',
          Key: expect.any(Object)
        })
      )

      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-snippets',
          Key: expect.any(Object)
        })
      )
    })

    it('should handle cascade delete errors gracefully', async () => {
      const user = createMockUser()
      const projectId = 'test-project-error'

      // Mock project exists
      mockGet.mockResolvedValue({
        Item: {
          id: projectId,
          userId: user.id,
          name: 'Test Project'
        }
      })

      // Mock query failure
      mockQuery.mockRejectedValue(new Error('Database error'))

      await expect(deleteProjectSnippets(projectId, user.id))
        .rejects
        .toThrow('Database error')
    })

    it('should not delete resources belonging to other users', async () => {
      const user1 = createMockUser()
      const user2 = { ...createMockUser(), id: 'user-2', email: 'user2@example.com' }
      const projectId = 'test-project-1'
      const snippet1Id = 'test-snippet-1'

      // Mock snippet belonging to different user
      mockQuery.mockResolvedValue({
        Items: [
          {
            id: snippet1Id,
            projectId,
            userId: user2.id, // Different user
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

      // This should not delete the snippet because it belongs to user2
      await deleteProjectSnippets(projectId, user1.id)

      // Verify no delete was called for the snippet
      expect(mockDelete).not.toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-snippets',
          Key: { projectId, id: snippet1Id }
        })
      )
    })
  })

  describe('Snippet Cascade Delete', () => {
    it('should delete snippet and all its connections and versions', async () => {
      const user = createMockUser()
      const projectId = 'test-project-1'
      const snippetId = 'test-snippet-1'

      // Mock snippet exists
      mockGet.mockResolvedValue({
        Item: {
          id: snippetId,
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
      })

      // Mock connections for the snippet
      mockQuery.mockImplementation(({ IndexName }) => {
        if (IndexName === 'SourceSnippetIndex' || IndexName === 'TargetSnippetIndex') {
          return {
            promise: () => Promise.resolve({
              Items: [
                {
                  id: 'connection-1',
                  projectId,
                  sourceSnippetId: snippetId,
                  targetSnippetId: 'other-snippet',
                  connectionType: 'RELATED',
                  userId: user.id,
                  createdAt: '2025-01-01T00:00:00.000Z',
                  updatedAt: '2025-01-01T00:00:00.000Z'
                }
              ]
            })
          }
        }

        // Mock versions query
        if (IndexName === undefined) { // Regular query, likely for versions
          return {
            promise: () => Promise.resolve({
              Items: [
                {
                  id: 'version-1',
                  snippetId,
                  version: 1,
                  textField1: 'Text 1',
                  textField2: 'Text 2',
                  userId: user.id,
                  createdAt: '2025-01-01T00:00:00.000Z'
                }
              ]
            })
          }
        }

        return { promise: () => Promise.resolve({ Items: [] }) }
      })

      mockDelete.mockReturnValue({ promise: () => Promise.resolve() })

      await deleteSnippet(projectId, snippetId, user.id)

      // Verify all related data was deleted
      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections'
        })
      )

      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-versions'
        })
      )

      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-snippets',
          Key: { projectId, id: snippetId }
        })
      )
    })
  })

  describe('Connection Cleanup', () => {
    it('should delete all connections for a snippet', async () => {
      const user = createMockUser()
      const snippetId = 'test-snippet-1'

      // Mock connections query
      mockQuery.mockImplementation(() => ({
        promise: () => Promise.resolve({
          Items: [
            {
              id: 'connection-1',
              projectId: 'project-1',
              sourceSnippetId: snippetId,
              targetSnippetId: 'snippet-2',
              connectionType: 'RELATED',
              userId: user.id,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: 'connection-2',
              projectId: 'project-1',
              sourceSnippetId: 'snippet-3',
              targetSnippetId: snippetId,
              connectionType: 'DEPENDS_ON',
              userId: user.id,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            }
          ]
        })
      }))

      mockDelete.mockReturnValue({ promise: () => Promise.resolve() })

      await deleteSnippetConnections(snippetId, user.id)

      // Verify both connections were deleted
      expect(mockDelete).toHaveBeenCalledTimes(2)
      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections',
          Key: { projectId: 'project-1', id: 'connection-1' }
        })
      )
      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections',
          Key: { projectId: 'project-1', id: 'connection-2' }
        })
      )
    })
  })
})