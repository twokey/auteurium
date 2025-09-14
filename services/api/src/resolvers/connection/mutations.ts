import { GraphQLContext } from '../../types/context'
import { Connection, ConnectionInput, UpdateConnectionInput, ConnectionType } from '@auteurium/shared-types'
import {
  createConnection,
  deleteConnection,
  queryConnections
} from '../../database/connections'
import { getSnippet } from '../../database/snippets'
import { requireAuth, enforceContentPrivacy } from '../../middleware/validation'
import { validateInput } from '../../middleware/validation'
import { z } from 'zod'

// Validation schemas
const createConnectionSchema = z.object({
  input: z.object({
    projectId: z.string(),
    sourceSnippetId: z.string(),
    targetSnippetId: z.string(),
    connectionType: z.nativeEnum(ConnectionType).optional().default(ConnectionType.RELATED),
    label: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    metadata: z.record(z.any()).optional()
  })
})

const updateConnectionSchema = z.object({
  projectId: z.string(),
  connectionId: z.string(),
  input: z.object({
    connectionType: z.nativeEnum(ConnectionType).optional(),
    label: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    metadata: z.record(z.any()).optional()
  })
})

const deleteConnectionSchema = z.object({
  projectId: z.string(),
  connectionId: z.string()
})

const bulkCreateConnectionsSchema = z.object({
  connections: z.array(z.object({
    projectId: z.string(),
    sourceSnippetId: z.string(),
    targetSnippetId: z.string(),
    connectionType: z.nativeEnum(ConnectionType).optional().default(ConnectionType.RELATED),
    label: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    metadata: z.record(z.any()).optional()
  })).max(50) // Limit bulk operations
})

export const connectionMutations = {
  // Create a new connection between snippets
  createConnection: async (
    _parent: any,
    args: any,
    context: GraphQLContext
  ): Promise<Connection> => {
    const { input } = validateInput(createConnectionSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Creating connection', {
      sourceSnippetId: input.sourceSnippetId,
      targetSnippetId: input.targetSnippetId,
      connectionType: input.connectionType,
      userId: user.id
    })

    // Verify user owns both snippets
    const sourceSnippet = await getSnippet(input.projectId, input.sourceSnippetId, user.id)
    if (!sourceSnippet) {
      throw new Error('Source snippet not found or access denied')
    }

    const targetSnippet = await getSnippet(input.projectId, input.targetSnippetId, user.id)
    if (!targetSnippet) {
      throw new Error('Target snippet not found or access denied')
    }

    // Ensure user owns both snippets (content privacy)
    enforceContentPrivacy(user, sourceSnippet.userId)
    enforceContentPrivacy(user, targetSnippet.userId)

    // Prevent self-connections
    if (input.sourceSnippetId === input.targetSnippetId) {
      throw new Error('Cannot create connection from snippet to itself')
    }

    return await createConnection(input, user.id)
  },

  // Update an existing connection
  updateConnection: async (
    _parent: any,
    args: any,
    context: GraphQLContext
  ): Promise<Connection> => {
    const { projectId, connectionId, input } = validateInput(updateConnectionSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Updating connection', {
      projectId,
      connectionId,
      userId: user.id
    })

    // First, get the connection to verify ownership
    const existingConnections = await queryConnections({ projectId })
    const connection = existingConnections.find(c => c.id === connectionId && c.userId === user.id)

    if (!connection) {
      throw new Error('Connection not found or access denied')
    }

    // Build update expression for DynamoDB
    const timestamp = new Date().toISOString()
    const updateExpressions: string[] = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': timestamp,
      ':userId': user.id
    }

    if (input.connectionType !== undefined) {
      updateExpressions.push('#connectionType = :connectionType')
      expressionAttributeNames['#connectionType'] = 'connectionType'
      expressionAttributeValues[':connectionType'] = input.connectionType
    }

    if (input.label !== undefined) {
      updateExpressions.push('#label = :label')
      expressionAttributeNames['#label'] = 'label'
      expressionAttributeValues[':label'] = input.label
    }

    if (input.description !== undefined) {
      updateExpressions.push('#description = :description')
      expressionAttributeNames['#description'] = 'description'
      expressionAttributeValues[':description'] = input.description
    }

    if (input.metadata !== undefined) {
      updateExpressions.push('#metadata = :metadata')
      expressionAttributeNames['#metadata'] = 'metadata'
      expressionAttributeValues[':metadata'] = input.metadata
    }

    updateExpressions.push('updatedAt = :updatedAt')

    // Update the connection directly since we have the reference
    const { dynamodb, TABLES } = await import('../../database/client')

    const result = await dynamodb.update({
      TableName: TABLES.CONNECTIONS,
      Key: {
        projectId,
        id: connectionId
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'userId = :userId',
      ReturnValues: 'ALL_NEW'
    }).promise()

    const updatedConnection = result.Attributes as Connection

    context.logger.info('Connection updated', {
      connectionId,
      userId: user.id
    })

    return updatedConnection
  },

  // Delete a connection
  deleteConnection: async (
    _parent: any,
    args: any,
    context: GraphQLContext
  ): Promise<boolean> => {
    const { projectId, connectionId } = validateInput(deleteConnectionSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Deleting connection', {
      projectId,
      connectionId,
      userId: user.id
    })

    await deleteConnection(projectId, connectionId, user.id)

    context.logger.info('Connection deleted successfully', {
      connectionId,
      userId: user.id
    })

    return true
  },

  // Bulk create multiple connections
  bulkCreateConnections: async (
    _parent: any,
    args: any,
    context: GraphQLContext
  ): Promise<Connection[]> => {
    const { connections } = validateInput(bulkCreateConnectionsSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Bulk creating connections', {
      connectionCount: connections.length,
      userId: user.id
    })

    const createdConnections: Connection[] = []
    const errors: string[] = []

    // Verify all snippets exist and are owned by the user first
    for (const connInput of connections) {
      try {
        const sourceSnippet = await getSnippet(connInput.projectId, connInput.sourceSnippetId, user.id)
        const targetSnippet = await getSnippet(connInput.projectId, connInput.targetSnippetId, user.id)

        if (!sourceSnippet) {
          errors.push(`Source snippet ${connInput.sourceSnippetId} not found`)
          continue
        }

        if (!targetSnippet) {
          errors.push(`Target snippet ${connInput.targetSnippetId} not found`)
          continue
        }

        enforceContentPrivacy(user, sourceSnippet.userId)
        enforceContentPrivacy(user, targetSnippet.userId)

        if (connInput.sourceSnippetId === connInput.targetSnippetId) {
          errors.push(`Cannot create self-connection for snippet ${connInput.sourceSnippetId}`)
          continue
        }

      } catch (error) {
        errors.push(`Validation failed for connection: ${error.message}`)
      }
    }

    // If there were validation errors, return them
    if (errors.length > 0) {
      throw new Error(`Bulk connection creation failed: ${errors.join(', ')}`)
    }

    // Create all connections
    for (const connInput of connections) {
      try {
        const connection = await createConnection(connInput, user.id)
        createdConnections.push(connection)
      } catch (error) {
        context.logger.warn('Failed to create individual connection in bulk operation', {
          error: error.message,
          sourceSnippetId: connInput.sourceSnippetId,
          targetSnippetId: connInput.targetSnippetId
        })
        // Continue with other connections instead of failing the entire operation
      }
    }

    context.logger.info('Bulk connection creation completed', {
      requested: connections.length,
      created: createdConnections.length,
      userId: user.id
    })

    return createdConnections
  },

  // Delete all connections between two specific snippets
  removeConnectionsBetweenSnippets: async (
    _parent: any,
    args: any,
    context: GraphQLContext
  ): Promise<number> => {
    const schema = z.object({
      projectId: z.string(),
      snippetId1: z.string(),
      snippetId2: z.string()
    })

    const { projectId, snippetId1, snippetId2 } = validateInput(schema, args)
    const user = requireAuth(context.user)

    context.logger.info('Removing connections between snippets', {
      projectId,
      snippetId1,
      snippetId2,
      userId: user.id
    })

    // Find all connections between the two snippets
    const allConnections = await queryConnections({ projectId })
    const connectionsToDelete = allConnections.filter(conn =>
      conn.userId === user.id &&
      (
        (conn.sourceSnippetId === snippetId1 && conn.targetSnippetId === snippetId2) ||
        (conn.sourceSnippetId === snippetId2 && conn.targetSnippetId === snippetId1)
      )
    )

    // Delete each connection
    for (const connection of connectionsToDelete) {
      await deleteConnection(projectId, connection.id, user.id)
    }

    context.logger.info('Removed connections between snippets', {
      deletedCount: connectionsToDelete.length,
      userId: user.id
    })

    return connectionsToDelete.length
  }
}