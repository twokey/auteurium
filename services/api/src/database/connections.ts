import { ConnectionType } from '@auteurium/shared-types'
import { Logger } from '@aws-lambda-powertools/logger'

import {
  TABLES,
  dynamodb,
  generateId,
  getCurrentTimestamp,
  type DocumentClientType
} from './client'
import { createNotFoundError } from '../utils/errors'

import type { Connection, ConnectionInput } from '@auteurium/shared-types'

const logger = new Logger({ serviceName: 'connections-db' })

const DEFAULT_QUERY_LIMIT = 100
const DEFAULT_TRAVERSAL_DEPTH = 3

interface ConditionalError {
  code?: unknown
}

const isConditionalCheckFailed = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as ConditionalError).code === 'ConditionalCheckFailedException'

const runQuery = async (
  params: Parameters<DocumentClientType['query']>[0]
): Promise<Connection[]> => {
  const result = await dynamodb.query(params).promise()
  return (result.Items ?? []) as Connection[]
}

export interface ConnectionQueryOptions {
  projectId?: string
  sourceSnippetId?: string
  targetSnippetId?: string
  connectionType?: ConnectionType
  limit?: number
}

export interface GraphTraversalOptions {
  snippetId: string
  direction: 'outgoing' | 'incoming' | 'both'
  projectId?: string
  maxDepth?: number
  connectionTypes?: ConnectionType[]
}

export const createConnection = async (
  connection: ConnectionInput,
  userId: string
): Promise<Connection> => {
  const timestamp = getCurrentTimestamp()
  const connectionRecord: Connection = {
    id: generateId(),
    projectId: connection.projectId,
    sourceSnippetId: connection.sourceSnippetId,
    targetSnippetId: connection.targetSnippetId,
    connectionType: connection.connectionType ?? ConnectionType.RELATED,
    label: connection.label,
    description: connection.description,
    metadata: connection.metadata,
    userId,
    createdAt: timestamp,
    updatedAt: timestamp
  }

  try {
    const params: Parameters<DocumentClientType['put']>[0] = {
      TableName: TABLES.CONNECTIONS,
      Item: connectionRecord
    }

    await dynamodb.put(params).promise()

    logger.info('Connection created', {
      connectionId: connectionRecord.id,
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

export const queryConnections = async (options: ConnectionQueryOptions): Promise<Connection[]> => {
  const limit = options.limit ?? DEFAULT_QUERY_LIMIT

  try {
    if (options.sourceSnippetId) {
      const params: Parameters<DocumentClientType['query']>[0] = {
        TableName: TABLES.CONNECTIONS,
        IndexName: 'SourceSnippetIndex',
        KeyConditionExpression: 'sourceSnippetId = :sourceId',
        ExpressionAttributeValues: {
          ':sourceId': options.sourceSnippetId
        },
        Limit: limit
      }

      return runQuery(params)
    }

    if (options.targetSnippetId) {
      const params: Parameters<DocumentClientType['query']>[0] = {
        TableName: TABLES.CONNECTIONS,
        IndexName: 'TargetSnippetIndex',
        KeyConditionExpression: 'targetSnippetId = :targetId',
        ExpressionAttributeValues: {
          ':targetId': options.targetSnippetId
        },
        Limit: limit
      }

      return runQuery(params)
    }

    if (options.connectionType) {
      const params: Parameters<DocumentClientType['query']>[0] = {
        TableName: TABLES.CONNECTIONS,
        IndexName: 'ConnectionTypeIndex',
        KeyConditionExpression: 'connectionType = :type',
        ExpressionAttributeValues: {
          ':type': options.connectionType
        },
        Limit: limit
      }

      return runQuery(params)
    }

    if (!options.projectId) {
      throw new Error('projectId is required when no snippet or type filter is provided')
    }

    const params: Parameters<DocumentClientType['query']>[0] = {
      TableName: TABLES.CONNECTIONS,
      KeyConditionExpression: 'projectId = :projectId',
      ExpressionAttributeValues: {
        ':projectId': options.projectId
      },
      Limit: limit
    }

    return runQuery(params)
  } catch (error) {
    logger.error('Failed to query connections', { error, options })
    throw error
  }
}

export const traverseGraph = async (options: GraphTraversalOptions): Promise<{
  connections: Connection[]
  relatedSnippets: string[]
}> => {
  const visited = new Set<string>()
  const discoveredConnections: Connection[] = []
  const relatedSnippets = new Set<string>()
  const maxDepth = options.maxDepth ?? DEFAULT_TRAVERSAL_DEPTH

  const shouldIncludeConnection = (connection: Connection) =>
    !options.connectionTypes || options.connectionTypes.includes(connection.connectionType)

  const traverse = async (currentSnippetId: string, currentDepth: number): Promise<void> => {
    if (currentDepth >= maxDepth || visited.has(currentSnippetId)) {
      return
    }

    visited.add(currentSnippetId)

    if (options.direction === 'outgoing' || options.direction === 'both') {
      const outgoing = await queryConnections({
        projectId: options.projectId,
        sourceSnippetId: currentSnippetId
      })

      for (const connection of outgoing) {
        if (shouldIncludeConnection(connection)) {
          discoveredConnections.push(connection)
          relatedSnippets.add(connection.targetSnippetId)

          if (currentDepth < maxDepth - 1) {
            await traverse(connection.targetSnippetId, currentDepth + 1)
          }
        }
      }
    }

    if (options.direction === 'incoming' || options.direction === 'both') {
      const incoming = await queryConnections({
        projectId: options.projectId,
        targetSnippetId: currentSnippetId
      })

      for (const connection of incoming) {
        if (shouldIncludeConnection(connection)) {
          discoveredConnections.push(connection)
          relatedSnippets.add(connection.sourceSnippetId)

          if (currentDepth < maxDepth - 1) {
            await traverse(connection.sourceSnippetId, currentDepth + 1)
          }
        }
      }
    }
  }

  await traverse(options.snippetId, 0)

  return {
    connections: discoveredConnections,
    relatedSnippets: Array.from(relatedSnippets)
  }
}

export const deleteConnection = async (
  projectId: string,
  connectionId: string,
  userId: string
): Promise<void> => {
  const params: Parameters<DocumentClientType['delete']>[0] = {
    TableName: TABLES.CONNECTIONS,
    Key: {
      projectId,
      id: connectionId
    },
    ConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }

  try {
    await dynamodb.delete(params).promise()

    logger.info('Connection deleted', { connectionId, userId })
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      throw createNotFoundError('Connection')
    }

    logger.error('Failed to delete connection', { error, connectionId, userId })
    throw error
  }
}

export const deleteSnippetConnections = async (
  snippetId: string,
  userId: string
): Promise<void> => {
  try {
    const sourceConnections = await queryConnections({ sourceSnippetId: snippetId })
    const targetConnections = await queryConnections({ targetSnippetId: snippetId })

    const uniqueConnections = new Map<string, Connection>()
    for (const connection of [...sourceConnections, ...targetConnections]) {
      uniqueConnections.set(connection.id, connection)
    }

    for (const connection of uniqueConnections.values()) {
      await deleteConnection(connection.projectId, connection.id, userId)
    }

    logger.info('Snippet connections deleted', {
      snippetId,
      connectionsCount: uniqueConnections.size,
      userId
    })
  } catch (error) {
    logger.error('Failed to delete snippet connections', { error, snippetId, userId })
    throw error
  }
}

export const exportConnectionsForNeptune = async (projectId: string) => {
  const connections = await queryConnections({ projectId })

  const vertices = new Set<string>()
  const edges = connections.map((connection) => {
    vertices.add(connection.sourceSnippetId)
    vertices.add(connection.targetSnippetId)

    return {
      id: connection.id,
      label: connection.connectionType,
      from: connection.sourceSnippetId,
      to: connection.targetSnippetId,
      properties: {
        label: connection.label,
        description: connection.description,
        metadata: connection.metadata,
        createdAt: connection.createdAt
      }
    }
  })

  return { vertices: Array.from(vertices), edges }
}
