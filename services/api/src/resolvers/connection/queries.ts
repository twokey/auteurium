import { ConnectionType, type Connection, type GraphNode, type GraphTraversalResult } from '@auteurium/shared-types'
import { z } from 'zod'

import {
  queryConnections,
  traverseGraph,
  type ConnectionQueryOptions,
  type GraphTraversalOptions
} from '../../database/connections'
import { requireAuth, validateInput } from '../../middleware/validation'

import type { GraphQLContext } from '../../types/context'

// Validation schemas
const projectConnectionsSchema = z.object({
  projectId: z.string(),
  limit: z.number().min(1).max(100).optional().default(50)
})

const snippetConnectionsSchema = z.object({
  snippetId: z.string(),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional().default('both'),
  limit: z.number().min(1).max(100).optional().default(50)
})

const connectionsByTypeSchema = z.object({
  projectId: z.string(),
  connectionType: z.nativeEnum(ConnectionType),
  limit: z.number().min(1).max(100).optional().default(50)
})

const graphTraversalSchema = z.object({
  snippetId: z.string(),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional().default('both'),
  maxDepth: z.number().min(1).max(5).optional().default(3),
  connectionTypes: z.array(z.nativeEnum(ConnectionType)).optional()
})

export const connectionQueries = {
  // Get all connections for a project
  projectConnections: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Connection[]> => {
    const { projectId, limit } = validateInput(projectConnectionsSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Getting project connections', {
      projectId,
      userId: user.id,
      limit
    })

    const options: ConnectionQueryOptions = {
      projectId,
      limit
    }

    const connections = await queryConnections(options)

    // Filter connections to only include those owned by the user
    return connections.filter(conn => conn.userId === user.id)
  },

  // Get connections for a specific snippet
  snippetConnections: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Connection[]> => {
    const { snippetId, direction, limit } = validateInput(snippetConnectionsSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Getting snippet connections', {
      snippetId,
      direction,
      userId: user.id,
      limit
    })

    const connections: Connection[] = []

    // Get outgoing connections
    if (direction === 'outgoing' || direction === 'both') {
      const outgoingConnections = await queryConnections({
        projectId: '', // We'll need to get this from the snippet
        sourceSnippetId: snippetId,
        limit
      })
      connections.push(...outgoingConnections)
    }

    // Get incoming connections
    if (direction === 'incoming' || direction === 'both') {
      const incomingConnections = await queryConnections({
        projectId: '', // We'll need to get this from the snippet
        targetSnippetId: snippetId,
        limit
      })
      connections.push(...incomingConnections)
    }

    // Filter connections to only include those owned by the user
    return connections.filter(conn => conn.userId === user.id)
  },

  // Get connections by type
  connectionsByType: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Connection[]> => {
    const { projectId, connectionType, limit } = validateInput(connectionsByTypeSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Getting connections by type', {
      projectId,
      connectionType,
      userId: user.id,
      limit
    })

    const options: ConnectionQueryOptions = {
      projectId,
      connectionType,
      limit
    }

    const connections = await queryConnections(options)

    // Filter connections to only include those owned by the user
    return connections.filter(conn => conn.userId === user.id)
  },

  // Perform graph traversal to find related snippets
  exploreGraph: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<GraphTraversalResult> => {
    const { snippetId, direction, maxDepth, connectionTypes } = validateInput(graphTraversalSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Performing graph traversal', {
      snippetId,
      direction,
      maxDepth,
      connectionTypes,
      userId: user.id
    })

    const options: GraphTraversalOptions = {
      snippetId,
      direction: direction ?? 'both',
      maxDepth,
      connectionTypes
    }

    const result = await traverseGraph(options)

    // Filter connections to only include those owned by the user
    const userConnections = result.connections.filter(conn => conn.userId === user.id)

    // Group connections by snippet for nodes
    const nodeMap = new Map<string, GraphNode>()

    for (const connection of userConnections) {
      const sourceId = connection.sourceSnippetId
      const targetId = connection.targetSnippetId

      // Add source node
      if (!nodeMap.has(sourceId)) {
        nodeMap.set(sourceId, {
          snippetId: sourceId,
          connections: [],
          depth: 0 // We'll calculate proper depth in a real implementation
        })
      }
      nodeMap.get(sourceId)!.connections.push(connection)

      // Add target node
      if (!nodeMap.has(targetId)) {
        nodeMap.set(targetId, {
          snippetId: targetId,
          connections: [],
          depth: 0 // We'll calculate proper depth in a real implementation
        })
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      connections: userConnections,
      totalNodes: nodeMap.size,
      maxDepthReached: maxDepth ?? 3
    }
  },

  // Get connection statistics for a project
  connectionStats: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<{
    totalConnections: number
    connectionsByType: { type: ConnectionType, count: number }[]
    mostConnectedSnippets: { snippetId: string, connectionCount: number }[]
  }> => {
    const { projectId } = validateInput(z.object({ projectId: z.string() }), args)
    const user = requireAuth(context.user)

    context.logger.info('Getting connection statistics', {
      projectId,
      userId: user.id
    })

    const allConnections = await queryConnections({ projectId })
    const userConnections = allConnections.filter(conn => conn.userId === user.id)

    // Count connections by type
    const typeMap = new Map<ConnectionType, number>()
    for (const conn of userConnections) {
      typeMap.set(conn.connectionType, (typeMap.get(conn.connectionType) ?? 0) + 1)
    }

    // Count connections per snippet
    const snippetConnectionMap = new Map<string, number>()
    for (const conn of userConnections) {
      snippetConnectionMap.set(
        conn.sourceSnippetId,
        (snippetConnectionMap.get(conn.sourceSnippetId) ?? 0) + 1
      )
      snippetConnectionMap.set(
        conn.targetSnippetId,
        (snippetConnectionMap.get(conn.targetSnippetId) ?? 0) + 1
      )
    }

    // Get most connected snippets
    const sortedSnippets = Array.from(snippetConnectionMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([snippetId, connectionCount]) => ({ snippetId, connectionCount }))

    return {
      totalConnections: userConnections.length,
      connectionsByType: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })),
      mostConnectedSnippets: sortedSnippets
    }
  }
}