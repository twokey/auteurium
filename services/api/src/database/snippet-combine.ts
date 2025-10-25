import { Logger } from '@aws-lambda-powertools/logger'

import { Connection, Snippet } from '@auteurium/shared-types'

import { getSnippet, batchGetSnippets, updateSnippet } from './snippets'
import { queryConnections } from './connections'
import { createNotFoundError } from '../utils/errors'

const logger = new Logger({ serviceName: 'snippet-combine' })

/**
 * Connection graph structure for efficient traversal
 */
interface ConnectionGraph {
  incoming: Connection[]
  outgoing: Connection[]
}

/**
 * Branch structure representing a path from root to target
 */
interface Branch {
  rootId: string
  path: string[] // Snippet IDs from root to current (excluding current)
  createdAt: string
}

/**
 * Build a connection graph from an array of connections
 * Maps each snippet ID to its incoming and outgoing connections
 */
const buildConnectionGraph = (connections: Connection[]): Map<string, ConnectionGraph> => {
  const graph = new Map<string, ConnectionGraph>()

  for (const connection of connections) {
    // Add to source snippet's outgoing connections
    if (!graph.has(connection.sourceSnippetId)) {
      graph.set(connection.sourceSnippetId, { incoming: [], outgoing: [] })
    }
    graph.get(connection.sourceSnippetId)!.outgoing.push(connection)

    // Add to target snippet's incoming connections
    if (!graph.has(connection.targetSnippetId)) {
      graph.set(connection.targetSnippetId, { incoming: [], outgoing: [] })
    }
    graph.get(connection.targetSnippetId)!.incoming.push(connection)
  }

  return graph
}

/**
 * Find the root snippet by traversing backward through incoming connections
 * Root = snippet with no incoming connections
 * Returns the root snippet ID or null if circular dependency detected
 */
const findRootSnippetId = (
  snippetId: string,
  graph: Map<string, ConnectionGraph>,
  visited: Set<string> = new Set()
): string | null => {
  // Detect circular dependency
  if (visited.has(snippetId)) {
    logger.warn('Circular dependency detected', { snippetId, visited: Array.from(visited) })
    return null
  }

  visited.add(snippetId)

  const node = graph.get(snippetId)

  // If no incoming connections, this is the root
  if (!node || node.incoming.length === 0) {
    return snippetId
  }

  // Traverse backward through the first incoming connection
  // In a well-formed chain, there should be one primary path
  const firstIncoming = node.incoming[0]
  return findRootSnippetId(firstIncoming.sourceSnippetId, graph, visited)
}

/**
 * Build the ordered path of snippet IDs from root to target (excluding target)
 * Uses BFS to find the path through the connection graph
 */
const buildPathIds = (
  rootId: string,
  targetId: string,
  graph: Map<string, ConnectionGraph>
): string[] => {
  if (rootId === targetId) {
    return []
  }

  // BFS to find path from root to target
  const queue: Array<{ id: string; path: string[] }> = [{ id: rootId, path: [rootId] }]
  const visited = new Set<string>([rootId])

  while (queue.length > 0) {
    const current = queue.shift()!
    const node = graph.get(current.id)

    if (!node) continue

    // Check each outgoing connection
    for (const connection of node.outgoing) {
      const nextId = connection.targetSnippetId

      if (nextId === targetId) {
        // Found the target, return the path (excluding target itself)
        return current.path
      }

      if (!visited.has(nextId)) {
        visited.add(nextId)
        queue.push({
          id: nextId,
          path: [...current.path, nextId]
        })
      }
    }
  }

  // No path found
  logger.warn('No path found from root to target', { rootId, targetId })
  return [rootId]
}

/**
 * Extract all unique snippet IDs needed from all branches
 */
const getAllRequiredSnippetIds = (branches: Branch[]): string[] => {
  const idSet = new Set<string>()

  for (const branch of branches) {
    idSet.add(branch.rootId)
    for (const id of branch.path) {
      idSet.add(id)
    }
  }

  return Array.from(idSet)
}

/**
 * Main function to combine connected snippets' text values
 *
 * Algorithm:
 * 1. Get current snippet and all project connections
 * 2. Build connection graph for efficient traversal
 * 3. Find all incoming connections to current snippet
 * 4. For each incoming connection, traverse to find root and build path
 * 5. Batch fetch all required snippets
 * 6. Sort branches by root creation time (oldest first)
 * 7. Concatenate all ancestor textField1 values in order, then append current textField1
 * 8. Update current snippet with combined text
 */
export const combineSnippetConnectionsLogic = async (
  projectId: string,
  snippetId: string,
  userId: string
): Promise<Snippet> => {
  logger.info('Starting snippet combination', { projectId, snippetId, userId })

  // Step 1: Get current snippet
  const currentSnippet = await getSnippet(projectId, snippetId, userId)
  if (!currentSnippet) {
    throw createNotFoundError('Snippet')
  }

  // Step 2: Get all project connections
  const allConnections = await queryConnections({ projectId })
  logger.info('Fetched connections', {
    projectId,
    connectionCount: allConnections.length
  })

  if (allConnections.length === 0) {
    throw new Error('No connections found in this project')
  }

  // Step 3: Build connection graph
  const graph = buildConnectionGraph(allConnections)

  // Step 4: Find all incoming connections to current snippet
  const currentNode = graph.get(snippetId)
  if (!currentNode || currentNode.incoming.length === 0) {
    throw new Error('No incoming connections found for this snippet')
  }

  logger.info('Found incoming connections', {
    snippetId,
    incomingCount: currentNode.incoming.length
  })

  // Step 5: For each incoming connection, find root and build path
  const branches: Array<Omit<Branch, 'createdAt'>> = []

  for (const incomingConnection of currentNode.incoming) {
    const sourceId = incomingConnection.sourceSnippetId

    // Find root for this branch
    const rootId = findRootSnippetId(sourceId, graph)

    if (!rootId) {
      logger.warn('Skipping branch due to circular dependency', { sourceId })
      continue
    }

    // Build path from root to current snippet (excluding current)
    const path = buildPathIds(rootId, snippetId, graph)

    branches.push({
      rootId,
      path
    })
  }

  if (branches.length === 0) {
    throw new Error('No valid branches found (possible circular dependencies)')
  }

  logger.info('Built branches', {
    branchCount: branches.length,
    branches: branches.map(b => ({ rootId: b.rootId, pathLength: b.path.length }))
  })

  // Step 6: Extract all unique snippet IDs and batch fetch
  const requiredIds = getAllRequiredSnippetIds(branches as Branch[])
  logger.info('Fetching required snippets', { count: requiredIds.length })

  const snippetMap = await batchGetSnippets(projectId, requiredIds)

  // Step 7: Populate branches with createdAt and sort
  const branchesWithCreatedAt: Branch[] = branches
    .map(branch => {
      const rootSnippet = snippetMap.get(branch.rootId)
      if (!rootSnippet) {
        logger.warn('Root snippet not found', { rootId: branch.rootId })
        return null
      }

      return {
        ...branch,
        createdAt: rootSnippet.createdAt
      }
    })
    .filter((branch): branch is Branch => branch !== null)
    .sort((a, b) => {
      // Sort by createdAt ascending (oldest first)
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      if (timeA !== timeB) {
        return timeA - timeB
      }
      // Secondary sort by rootId for consistency
      return a.rootId.localeCompare(b.rootId)
    })

  logger.info('Sorted branches', {
    order: branchesWithCreatedAt.map(b => ({
      rootId: b.rootId,
      createdAt: b.createdAt
    }))
  })

  // Step 8: Build combined text
  const textParts: string[] = []

  for (const branch of branchesWithCreatedAt) {
    // Add all snippets in the path (root → ... → last before current)
    for (const branchSnippetId of branch.path) {
      const snippet = snippetMap.get(branchSnippetId)
      if (snippet && snippet.textField1.trim() !== '') {
        textParts.push(snippet.textField1.trim())
      }
    }
  }

  // Append current snippet's textField1 at the end
  if (currentSnippet.textField1.trim() !== '') {
    textParts.push(currentSnippet.textField1.trim())
  }

  const combinedText = textParts.join('\n\n')

  logger.info('Combined text', {
    snippetId,
    partsCount: textParts.length,
    combinedLength: combinedText.length
  })

  // Step 9: Update snippet with combined text
  const updatedSnippet = await updateSnippet(
    projectId,
    snippetId,
    { textField1: combinedText },
    userId
  )

  logger.info('Successfully combined snippet connections', {
    projectId,
    snippetId,
    branchCount: branchesWithCreatedAt.length,
    finalTextLength: combinedText.length
  })

  return updatedSnippet
}
