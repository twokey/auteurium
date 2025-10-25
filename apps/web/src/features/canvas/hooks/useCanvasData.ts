/**
 * Canvas Data Hook
 * Handles data fetching, transformation, and memoization for the canvas
 */

import { useMemo, useRef, useCallback } from 'react'

import { GET_PROJECT_CONNECTIONS, GET_PROJECT_WITH_SNIPPETS } from '../../../graphql/queries'
import { useGraphQLQuery } from '../../../hooks/useGraphQLQuery'
import { useOptimisticUpdatesStore } from '../store/optimisticUpdatesStore'

import type {
  Snippet,
  Project,
  ProjectWithSnippetsQueryData,
  ProjectWithSnippetsQueryVariables,
  ProjectConnectionsQueryData,
  ProjectConnectionsQueryVariables,
  SnippetNodeData,
  Connection
} from '../../../types'
import type { Node, Edge } from 'reactflow'

const EMPTY_SNIPPET_LIST: Snippet[] = []
const EMPTY_CONNECTION_LIST: Connection[] = []

interface ConnectionEdgeData {
  connectionId?: string
}

// Helper to compare snippets for deep equality
const areSnippetsEqual = (a: Snippet[], b: Snippet[]): boolean => {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i++) {
    const snippetA = a[i]
    const snippetB = b[i]

    if (
      snippetA.id !== snippetB.id ||
      snippetA.textField1 !== snippetB.textField1 ||
      snippetA.textField2 !== snippetB.textField2 ||
      snippetA.version !== snippetB.version ||
      snippetA.imageUrl !== snippetB.imageUrl ||
      snippetA.imageS3Key !== snippetB.imageS3Key ||
      snippetA.position?.x !== snippetB.position?.x ||
      snippetA.position?.y !== snippetB.position?.y ||
      !areConnectionsEqual(snippetA.connections, snippetB.connections)
    ) {
      return false
    }
  }

  return true
}

const areConnectionsEqual = (aConnections?: Connection[], bConnections?: Connection[]): boolean => {
  const left = aConnections ?? EMPTY_CONNECTION_LIST
  const right = bConnections ?? EMPTY_CONNECTION_LIST

  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index++) {
    const connectionA = left[index]
    const connectionB = right[index]

    if (!connectionB) {
      return false
    }

    if (
      connectionA.id !== connectionB.id ||
      connectionA.sourceSnippetId !== connectionB.sourceSnippetId ||
      connectionA.targetSnippetId !== connectionB.targetSnippetId ||
      (connectionA.label ?? null) !== (connectionB.label ?? null)
    ) {
      return false
    }
  }

  return true
}

export interface UseCanvasDataResult {
  project: Project | null
  snippets: Snippet[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCanvasData(projectId: string | undefined): UseCanvasDataResult {
  const { optimisticSnippets, realSnippets, deletingSnippets, deletedSnippets } = useOptimisticUpdatesStore()

  const queryVariables = useMemo(
    () => (projectId ? { projectId } : undefined),
    [projectId]
  )

  const {
    data: projectData,
    loading: projectLoading,
    error: projectError,
    refetch: refetchProject
  } = useGraphQLQuery<
    ProjectWithSnippetsQueryData,
    ProjectWithSnippetsQueryVariables
  >(GET_PROJECT_WITH_SNIPPETS, {
    variables: queryVariables,
    skip: !projectId
  })

  const {
    data: connectionData,
    loading: connectionsLoading,
    error: connectionsError,
    refetch: refetchConnections
  } = useGraphQLQuery<ProjectConnectionsQueryData, ProjectConnectionsQueryVariables>(
    GET_PROJECT_CONNECTIONS,
    {
      variables: queryVariables,
      skip: !projectId
    }
  )

  const combinedLoading = projectLoading || connectionsLoading
  const combinedError = projectError ?? connectionsError ?? null

  const project = projectData?.project ?? null
  const rawSnippets = project?.snippets

  // Memoize projectConnections to prevent recreating the array reference
  const projectConnections = useMemo(
    () => connectionData?.projectConnections ?? EMPTY_CONNECTION_LIST,
    [connectionData?.projectConnections]
  )

  // Memoize connection mapping for performance
  const connectionsBySource = useMemo(() => {
    if (projectConnections === EMPTY_CONNECTION_LIST) {
      return new Map<string, Connection[]>()
    }

    const map = new Map<string, Connection[]>()

    for (const connection of projectConnections) {
      const list = map.get(connection.sourceSnippetId)
      if (list) {
        list.push(connection)
      } else {
        map.set(connection.sourceSnippetId, [connection])
      }
    }

    map.forEach((list) => {
      list.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return a.createdAt.localeCompare(b.createdAt)
        }
        return a.id.localeCompare(b.id)
      })
    })

    return map
  }, [projectConnections])
  const previousSnippetsRef = useRef<Snippet[]>(EMPTY_SNIPPET_LIST)

  // Memoize snippets to prevent unnecessary re-renders
  const snippets = useMemo<Snippet[]>(() => {
    const baseSnippets = rawSnippets ?? EMPTY_SNIPPET_LIST

    // Filter out snippets that are being deleted OR already confirmed deleted
    const filteredSnippets = baseSnippets.filter(
      snippet => !deletingSnippets.has(snippet.id) && !deletedSnippets.has(snippet.id)
    )

    // Create a map of existing snippet IDs
    const existingIds = new Set(filteredSnippets.map(s => s.id))

    // Replace server snippets with real ones from optimistic store if they exist
    const snippetsWithRealOnes = filteredSnippets.map(snippet =>
      realSnippets[snippet.id] ?? snippet
    )

    // Add real snippets that aren't in the server data yet (just created)
    const newRealSnippets = Object.values(realSnippets).filter(
      snippet => !existingIds.has(snippet.id) && !deletedSnippets.has(snippet.id)
    )

    // Add optimistic snippets (converting to Snippet type)
    const optimisticSnippetsArray = Object.values(optimisticSnippets) as Snippet[]
    const combinedSnippets = [...snippetsWithRealOnes, ...newRealSnippets, ...optimisticSnippetsArray]

    const enrichedSnippets = combinedSnippets.map((snippet) => {
      const connectionsForSnippet = connectionsBySource.get(snippet.id) ?? EMPTY_CONNECTION_LIST

      if (connectionsForSnippet === EMPTY_CONNECTION_LIST) {
        return {
          ...snippet,
          connections: EMPTY_CONNECTION_LIST
        }
      }

      return {
        ...snippet,
        connections: connectionsForSnippet
      }
    })

    // Use deep equality to prevent unnecessary re-renders
    if (areSnippetsEqual(previousSnippetsRef.current, enrichedSnippets)) {
      return previousSnippetsRef.current
    }

    previousSnippetsRef.current = enrichedSnippets
    return enrichedSnippets
  }, [rawSnippets, connectionsBySource, optimisticSnippets, realSnippets, deletingSnippets, deletedSnippets])

  const projectWithConnections = useMemo<Project | null>(() => {
    if (!project) {
      return null
    }

    return {
      ...project,
      snippets
    }
  }, [project, snippets])

  // Combined refetch function for both queries
  const refetch = useCallback(async () => {
    await Promise.all([refetchProject(), refetchConnections()])
  }, [refetchProject, refetchConnections])

  return {
    project: projectWithConnections,
    snippets,
    loading: combinedLoading,
    error: combinedError,
    refetch
  }
}

/**
 * Transform snippets to ReactFlow nodes
 */
export function useFlowNodes(
  snippets: Snippet[],
  handlers: {
    onEdit: (snippetId: string) => void
    onDelete: (snippetId: string) => void
    onManageConnections: (snippetId: string) => void
    onViewVersions: (snippetId: string) => void
    onUpdateContent: (snippetId: string, changes: Partial<Pick<Snippet, 'textField1' | 'textField2'>>) => Promise<void>
    onCombine: (snippetId: string) => Promise<void>
    onGenerateImage: (snippetId: string, modelId?: string) => void
  },
  generatingImageSnippetIds: Record<string, boolean>
): Node<SnippetNodeData>[] {
  return useMemo(() => {
    // Sort snippets by creation time to assign z-index
    const sortedSnippets = [...snippets].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeA - timeB
    })

    return sortedSnippets.map((snippet, index) => {
      const position = snippet.position ?? { x: 0, y: 0 }

      // Get incoming connections to find connected snippets
      const incomingConnections = (snippet.connections ?? []).filter(
        conn => conn.targetSnippetId === snippet.id
      )

      // Map source snippets for connected image counting
      const connectedSnippets = incomingConnections
        .map(conn => snippets.find(s => s.id === conn.sourceSnippetId))
        .filter((s): s is Snippet => s !== undefined)
        .map(s => ({ id: s.id, imageS3Key: s.imageS3Key }))

      return {
        id: snippet.id,
        type: 'snippet',
        position,
        zIndex: index + 1,
        data: {
          snippet: {
            id: snippet.id,
            title: snippet.title,
            textField1: snippet.textField1,
            textField2: snippet.textField2,
            tags: snippet.tags,
            categories: snippet.categories,
            connectionCount: snippet.connections?.length ?? 0,
            imageUrl: snippet.imageUrl,
            imageS3Key: snippet.imageS3Key,
            imageMetadata: snippet.imageMetadata
          },
          ...handlers,
          isGeneratingImage: Boolean(generatingImageSnippetIds[snippet.id]),
          connectedSnippets
        },
        style: {
          background: '#fff',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          minWidth: 200,
          boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.08)'
        }
      } as Node<SnippetNodeData>
    })
  }, [snippets, handlers, generatingImageSnippetIds])
}

/**
 * Transform snippets to ReactFlow edges
 */
export function useFlowEdges(snippets: Snippet[]): Edge<ConnectionEdgeData>[] {
  return useMemo(() => {
    const edgesMap = new Map<string, Edge<ConnectionEdgeData>>()

    snippets.forEach((snippet) => {
      if (!snippet.connections) return

      snippet.connections.forEach((connection) => {
        if (!connection.sourceSnippetId || !connection.targetSnippetId) {
          return
        }

        const edgeId =
          connection.id && connection.id.trim() !== ''
            ? connection.id
            : `${connection.sourceSnippetId}-${connection.targetSnippetId}`

        if (!edgesMap.has(edgeId)) {
          edgesMap.set(edgeId, {
            id: edgeId,
            source: connection.sourceSnippetId,
            target: connection.targetSnippetId,
            label: connection.label,
            type: 'default',
            style: { stroke: '#6366f1', strokeWidth: 2 },
            labelStyle: { fill: '#374151', fontWeight: 500 },
            data: { connectionId: connection.id }
          })
        }
      })
    })

    return Array.from(edgesMap.values())
  }, [snippets])
}
