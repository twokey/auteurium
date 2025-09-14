import { dynamodb, TABLES, generateId, getCurrentTimestamp } from './client'
import { Connection, ConnectionInput, ConnectionType } from '@auteurium/shared-types'
import { createNotFoundError, createConflictError } from '../utils/errors'
import { Logger } from '@aws-lambda-powertools/logger'

const logger = new Logger({ serviceName: 'connections-db' })

// Connection patterns designed for Neptune transition
export interface ConnectionQueryOptions {
  projectId: string
  sourceSnippetId?: string
  targetSnippetId?: string
  connectionType?: ConnectionType
  limit?: number
}

export interface GraphTraversalOptions {
  snippetId: string
  direction: 'outgoing' | 'incoming' | 'both'
  maxDepth?: number
  connectionTypes?: ConnectionType[]
}

// Create a connection between snippets
export const createConnection = async (
  connection: ConnectionInput,
  userId: string
): Promise<Connection> => {
  const connectionId = generateId()
  const timestamp = getCurrentTimestamp()

  const connectionRecord: Connection = {
    id: connectionId,
    projectId: connection.projectId,
    sourceSnippetId: connection.sourceSnippetId,
    targetSnippetId: connection.targetSnippetId,
    connectionType: connection.connectionType || ConnectionType.RELATED,
    label: connection.label,
    description: connection.description,
    metadata: connection.metadata,
    userId,
    createdAt: timestamp,
    updatedAt: timestamp
  }

  try {
    // Ensure no duplicate connections exist
    const existingConnections = await queryConnections({
      projectId: connection.projectId,
      sourceSnippetId: connection.sourceSnippetId,
      targetSnippetId: connection.targetSnippetId
    })

    if (existingConnections.length > 0) {
      throw createConflictError('Connection already exists between these snippets')
    }

    await dynamodb.put({
      TableName: TABLES.CONNECTIONS,
      Item: connectionRecord
    }).promise()

    logger.info('Connection created', {
      connectionId,
      sourceSnippetId: connection.sourceSnippetId,
      targetSnippetId: connection.targetSnippetId,
      userId
    })

    return connectionRecord
  } catch (error) {
    logger.error('Failed to create connection', { error, connection, userId })
    throw error
  }
}

// Query connections with flexible filtering (Neptune-ready patterns)
export const queryConnections = async (options: ConnectionQueryOptions): Promise<Connection[]> => {
  try {
    // If querying by source snippet, use GSI
    if (options.sourceSnippetId) {
      const result = await dynamodb.query({
        TableName: TABLES.CONNECTIONS,
        IndexName: 'SourceSnippetIndex',
        KeyConditionExpression: 'sourceSnippetId = :sourceId',
        ExpressionAttributeValues: {
          ':sourceId': options.sourceSnippetId
        },
        Limit: options.limit || 100
      }).promise()

      return result.Items as Connection[]
    }

    // If querying by target snippet, use GSI
    if (options.targetSnippetId) {
      const result = await dynamodb.query({
        TableName: TABLES.CONNECTIONS,
        IndexName: 'TargetSnippetIndex',
        KeyConditionExpression: 'targetSnippetId = :targetId',
        ExpressionAttributeValues: {
          ':targetId': options.targetSnippetId
        },
        Limit: options.limit || 100
      }).promise()

      return result.Items as Connection[]
    }

    // If querying by connection type, use GSI
    if (options.connectionType) {
      const result = await dynamodb.query({
        TableName: TABLES.CONNECTIONS,
        IndexName: 'ConnectionTypeIndex',
        KeyConditionExpression: 'connectionType = :type',
        ExpressionAttributeValues: {
          ':type': options.connectionType
        },
        Limit: options.limit || 100
      }).promise()

      return result.Items as Connection[]
    }

    // Default: query by project
    const result = await dynamodb.query({
      TableName: TABLES.CONNECTIONS,
      KeyConditionExpression: 'projectId = :projectId',
      ExpressionAttributeValues: {
        ':projectId': options.projectId
      },
      Limit: options.limit || 100
    }).promise()

    return result.Items as Connection[]
  } catch (error) {
    logger.error('Failed to query connections', { error, options })
    throw error
  }
}

// Graph traversal patterns (emulating Neptune capabilities in DynamoDB)
export const traverseGraph = async (options: GraphTraversalOptions): Promise<{
  connections: Connection[]
  relatedSnippets: string[]
}> => {
  const visited = new Set<string>()
  const connections: Connection[] = []
  const relatedSnippets = new Set<string>()

  const traverse = async (currentSnippetId: string, currentDepth: number) => {
    if (currentDepth >= (options.maxDepth || 3) || visited.has(currentSnippetId)) {
      return
    }

    visited.add(currentSnippetId)

    // Get outgoing connections
    if (options.direction === 'outgoing' || options.direction === 'both') {
      const outgoingConnections = await queryConnections({
        projectId: '', // We'll need to pass this properly
        sourceSnippetId: currentSnippetId
      })

      for (const connection of outgoingConnections) {
        if (!options.connectionTypes || options.connectionTypes.includes(connection.connectionType)) {
          connections.push(connection)
          relatedSnippets.add(connection.targetSnippetId)

          if (currentDepth < (options.maxDepth || 3) - 1) {
            await traverse(connection.targetSnippetId, currentDepth + 1)
          }
        }
      }
    }

    // Get incoming connections
    if (options.direction === 'incoming' || options.direction === 'both') {
      const incomingConnections = await queryConnections({
        projectId: '', // We'll need to pass this properly
        targetSnippetId: currentSnippetId
      })

      for (const connection of incomingConnections) {
        if (!options.connectionTypes || options.connectionTypes.includes(connection.connectionType)) {
          connections.push(connection)
          relatedSnippets.add(connection.sourceSnippetId)

          if (currentDepth < (options.maxDepth || 3) - 1) {
            await traverse(connection.sourceSnippetId, currentDepth + 1)
          }
        }
      }
    }
  }

  await traverse(options.snippetId, 0)

  return {
    connections,
    relatedSnippets: Array.from(relatedSnippets)
  }
}

// Delete connection
export const deleteConnection = async (
  projectId: string,
  connectionId: string,
  userId: string
): Promise<void> => {
  try {
    await dynamodb.delete({
      TableName: TABLES.CONNECTIONS,
      Key: {
        projectId,
        id: connectionId
      },
      ConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise()

    logger.info('Connection deleted', { connectionId, userId })
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      throw createNotFoundError('Connection')
    }
    logger.error('Failed to delete connection', { error, connectionId, userId })
    throw error
  }
}

// Delete all connections for a snippet (used in cascade deletes)
export const deleteSnippetConnections = async (
  snippetId: string,
  userId: string
): Promise<void> => {
  try {
    // Get all connections where this snippet is the source
    const sourceConnections = await queryConnections({
      projectId: '', // We'll pass the actual project ID
      sourceSnippetId: snippetId
    })

    // Get all connections where this snippet is the target
    const targetConnections = await queryConnections({
      projectId: '', // We'll pass the actual project ID
      targetSnippetId: snippetId
    })

    const allConnections = [...sourceConnections, ...targetConnections]

    // Delete all connections
    for (const connection of allConnections) {
      await deleteConnection(connection.projectId, connection.id, userId)
    }

    logger.info('All snippet connections deleted', {
      snippetId,
      connectionsCount: allConnections.length,
      userId
    })
  } catch (error) {
    logger.error('Failed to delete snippet connections', { error, snippetId, userId })
    throw error
  }
}

// Future Neptune migration helpers
export const exportConnectionsForNeptune = async (projectId: string) => {
  const connections = await queryConnections({ projectId })

  // Convert to Neptune-compatible format
  const vertices = new Set<string>()
  const edges = connections.map(conn => {
    vertices.add(conn.sourceSnippetId)
    vertices.add(conn.targetSnippetId)

    return {
      id: conn.id,
      label: conn.connectionType,
      from: conn.sourceSnippetId,
      to: conn.targetSnippetId,
      properties: {
        label: conn.label,
        description: conn.description,
        metadata: conn.metadata,
        createdAt: conn.createdAt
      }
    }
  })

  return { vertices: Array.from(vertices), edges }
}