/**
 * Canvas Data Hook
 * Handles data fetching, transformation, and memoization for the canvas
 */

import { useMemo, useRef, useCallback, useEffect } from 'react'

import { GET_PROJECT_CONNECTIONS, GET_PROJECT_WITH_SNIPPETS } from '../../../graphql/queries'
import { useGraphQLQueryWithCache } from '../../../shared/hooks/useGraphQLQueryWithCache'
import { snapToColumn } from '../../../shared/utils/columnLayout'
import { useOptimisticUpdatesStore } from '../store/optimisticUpdatesStore'
import { usePendingPositionsStore } from '../store/pendingPositionsStore'

import type {
  Snippet,
  Project,
  ProjectWithSnippetsQueryData,
  ProjectWithSnippetsQueryVariables,
  ProjectConnectionsQueryData,
  ProjectConnectionsQueryVariables,
  SnippetNodeData,
  Connection,
  ConnectedContentItem,
  AvailableModel,
  VideoGenerationInput,
  VideoMetadata
} from '../../../types'
import type { Node, Edge } from 'reactflow'

const EMPTY_SNIPPET_LIST: Snippet[] = []
const EMPTY_CONNECTION_LIST: Connection[] = []

interface ConnectionEdgeData {
  connectionId?: string
}

interface ConnectedContentEntry {
  snippetId: string
  snippetTitle?: string | null
  text?: string
  imageUrl?: string | null
  imageMetadata?: {
    width: number
    height: number
    aspectRatio: string
  } | null
  videoUrl?: string | null
  videoMetadata?: VideoMetadata | null
}

const mergeConnectedEntries = (
  base: ConnectedContentEntry[],
  addition: ConnectedContentEntry[]
): ConnectedContentEntry[] => {
  if (addition.length === 0) {
    return base
  }

  const merged = base.map(entry => ({ ...entry }))
  const lookup = new Map<string, ConnectedContentEntry>()

  merged.forEach((entry) => {
    lookup.set(entry.snippetId, entry)
  })

  for (const entry of addition) {
    const trimmedText = entry.text?.trim() ?? ''
    const hasText = trimmedText !== ''
    const hasImage = Boolean(entry.imageUrl)
    const hasVideo = Boolean(entry.videoUrl)

    if (!hasText && !hasImage && !hasVideo) {
      continue
    }

    const existing = lookup.get(entry.snippetId)

    if (existing) {
      if (hasText && !existing.text) {
        existing.text = trimmedText
      }

      if (hasImage && !existing.imageUrl) {
        existing.imageUrl = entry.imageUrl
        existing.imageMetadata = entry.imageMetadata ?? existing.imageMetadata ?? null
      }

      if (hasVideo && !existing.videoUrl) {
        existing.videoUrl = entry.videoUrl
        existing.videoMetadata = entry.videoMetadata ?? existing.videoMetadata ?? null
      }

      continue
    }

    const newEntry: ConnectedContentEntry = {
      snippetId: entry.snippetId,
      snippetTitle: entry.snippetTitle ?? null
    }

    if (hasText) {
      newEntry.text = trimmedText
    }

    if (hasImage) {
      newEntry.imageUrl = entry.imageUrl
      newEntry.imageMetadata = entry.imageMetadata ?? null
    }

    if (hasVideo) {
      newEntry.videoUrl = entry.videoUrl
      newEntry.videoMetadata = entry.videoMetadata ?? null
    }

    merged.push(newEntry)
    lookup.set(entry.snippetId, newEntry)
  }

  return merged
}

const analyzeSnippetConnections = (
  snippets: Snippet[]
): {
  snippetMap: Map<string, Snippet>
  incomingSourcesMap: Map<string, string[]>
  connectedContentMap: Map<string, ConnectedContentItem[]>
} => {
  const snippetMap = new Map<string, Snippet>()
  const snippetOrder = new Map<string, number>()

  snippets.forEach((snippet, index) => {
    snippetMap.set(snippet.id, snippet)
    snippetOrder.set(snippet.id, index)
  })

  const rawIncomingMap = new Map<
    string,
    { sourceId: string; createdAt?: string | null; order: number }[]
  >()

  snippets.forEach((snippet) => {
    const outgoingConnections = snippet.connections ?? []

    outgoingConnections.forEach((connection) => {
      const targetId = connection.targetSnippetId
      if (!targetId || !snippetMap.has(targetId)) {
        return
      }

      const entry = {
        sourceId: snippet.id,
        createdAt: connection.createdAt ?? null,
        order: snippetOrder.get(snippet.id) ?? Number.MAX_SAFE_INTEGER
      }

      const existing = rawIncomingMap.get(targetId)
      if (existing) {
        existing.push(entry)
      } else {
        rawIncomingMap.set(targetId, [entry])
      }
    })
  })

  const incomingSourcesMap = new Map<string, string[]>()

  rawIncomingMap.forEach((entries, targetId) => {
    entries.sort((a, b) => {
      if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
        return a.createdAt.localeCompare(b.createdAt)
      }

      return a.order - b.order
    })

    incomingSourcesMap.set(
      targetId,
      entries.map(entry => entry.sourceId)
    )
  })

  const connectedEntriesMap = new Map<string, ConnectedContentEntry[]>()
  const visiting = new Set<string>()

  const computeConnectedContent = (snippetId: string): ConnectedContentEntry[] => {
    if (connectedEntriesMap.has(snippetId)) {
      return connectedEntriesMap.get(snippetId)!
    }

    if (visiting.has(snippetId)) {
      return []
    }

    visiting.add(snippetId)

    const sourceIds = incomingSourcesMap.get(snippetId) ?? []
    let aggregated: ConnectedContentEntry[] = []

    for (const sourceId of sourceIds) {
      const sourceContent = computeConnectedContent(sourceId)
      const sourceSnippet = snippetMap.get(sourceId)
      const trimmedText = sourceSnippet?.textField1?.trim() ?? ''
      const imageUrl = sourceSnippet?.imageUrl ?? null
      const hasText = trimmedText !== ''
      const hasImage = Boolean(imageUrl)
      const videoUrl = sourceSnippet?.videoUrl ?? null
      const hasVideo = Boolean(videoUrl)

      let branchContent: ConnectedContentEntry[] = [...sourceContent]

      if (hasText || hasImage || hasVideo) {
        branchContent = [
          ...sourceContent,
          {
            snippetId: sourceId,
            snippetTitle: sourceSnippet?.title ?? null,
            ...(hasText ? { text: trimmedText } : {}),
            ...(hasImage
              ? {
                  imageUrl,
                  imageMetadata: sourceSnippet?.imageMetadata ?? null
                }
              : {}),
            ...(hasVideo
              ? {
                  videoUrl,
                  videoMetadata: sourceSnippet?.videoMetadata ?? null
                }
              : {})
          }
        ]
      }

      aggregated = mergeConnectedEntries(aggregated, branchContent)
    }

    connectedEntriesMap.set(snippetId, aggregated)
    visiting.delete(snippetId)

    return aggregated
  }

  snippets.forEach((snippet) => {
    if (!connectedEntriesMap.has(snippet.id)) {
      connectedEntriesMap.set(snippet.id, computeConnectedContent(snippet.id))
    }
  })

  const connectedContentMap = new Map<string, ConnectedContentItem[]>()

  connectedEntriesMap.forEach((entries, snippetId) => {
    const items: ConnectedContentItem[] = []

    entries.forEach((entry) => {
      if (entry.text && entry.text.trim() !== '') {
        items.push({
          snippetId: entry.snippetId,
          snippetTitle: entry.snippetTitle ?? null,
          type: 'text',
          value: entry.text
        })
      }

      if (entry.imageUrl) {
        items.push({
          snippetId: entry.snippetId,
          snippetTitle: entry.snippetTitle ?? null,
          type: 'image',
          value: entry.imageUrl,
          imageMetadata: entry.imageMetadata ?? null
        })
      }

      if (entry.videoUrl) {
        items.push({
          snippetId: entry.snippetId,
          snippetTitle: entry.snippetTitle ?? null,
          type: 'video',
          value: entry.videoUrl,
          videoMetadata: entry.videoMetadata ?? null
        })
      }
    })

    connectedContentMap.set(snippetId, items)
  })

  return {
    snippetMap,
    incomingSourcesMap,
    connectedContentMap
  }
}

// Helper to compare snippets for deep equality
const areSnippetsEqual = (a: Snippet[], b: Snippet[]): boolean => {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i++) {
    const snippetA = a[i]
    const snippetB = b[i]

    if (
      snippetA.id !== snippetB.id ||
      (snippetA.title ?? '') !== (snippetB.title ?? '') ||
      snippetA.textField1 !== snippetB.textField1 ||
      snippetA.version !== snippetB.version ||
      snippetA.snippetType !== snippetB.snippetType ||
      snippetA.imageUrl !== snippetB.imageUrl ||
      snippetA.imageS3Key !== snippetB.imageS3Key ||
      snippetA.videoUrl !== snippetB.videoUrl ||
      snippetA.videoS3Key !== snippetB.videoS3Key ||
      snippetA.position?.x !== snippetB.position?.x ||
      snippetA.position?.y !== snippetB.position?.y ||
      snippetA.videoGenerationStatus !== snippetB.videoGenerationStatus ||
      (snippetA.videoGenerationTaskId ?? null) !== (snippetB.videoGenerationTaskId ?? null) ||
      (snippetA.videoGenerationError ?? '') !== (snippetB.videoGenerationError ?? '') ||
      !areVideoMetadataEqual(snippetA.videoMetadata, snippetB.videoMetadata) ||
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

const areVideoMetadataEqual = (left?: VideoMetadata | null, right?: VideoMetadata | null): boolean => {
  if (!left && !right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  return (
    left.duration === right.duration &&
    left.resolution === right.resolution &&
    left.aspectRatio === right.aspectRatio &&
    (left.style ?? null) === (right.style ?? null) &&
    (left.seed ?? null) === (right.seed ?? null) &&
    (left.format ?? null) === (right.format ?? null) &&
    (left.fileSize ?? null) === (right.fileSize ?? null) &&
    (left.movementAmplitude ?? null) === (right.movementAmplitude ?? null)
  )
}

export interface UseCanvasDataResult {
  project: Project | null
  snippets: Snippet[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCanvasData(projectId: string | undefined): UseCanvasDataResult {
  const {
    optimisticSnippets,
    realSnippets,
    deletingSnippets,
    deletedSnippets,
    optimisticConnections,
    realConnections,
    deletingConnections,
    deletedConnections
  } = useOptimisticUpdatesStore()

  const queryVariables = useMemo(
    () => (projectId ? { projectId } : undefined),
    [projectId]
  )

  const {
    data: projectData,
    loading: projectLoading,
    error: projectError,
    refetch: refetchProject
  } = useGraphQLQueryWithCache<
    ProjectWithSnippetsQueryData,
    ProjectWithSnippetsQueryVariables
  >(GET_PROJECT_WITH_SNIPPETS, {
    variables: queryVariables,
    skip: !projectId,
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 300000 // Keep in cache for 5 minutes
  })

  const {
    data: connectionData,
    loading: connectionsLoading,
    error: connectionsError,
    refetch: refetchConnections
  } = useGraphQLQueryWithCache<ProjectConnectionsQueryData, ProjectConnectionsQueryVariables>(
    GET_PROJECT_CONNECTIONS,
    {
      variables: queryVariables,
      skip: !projectId,
      staleTime: 30000, // Consider data fresh for 30 seconds
      cacheTime: 300000 // Keep in cache for 5 minutes
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

  // Merge real connections with optimistic connections, filter out deleted ones
  const mergedConnections = useMemo<Connection[]>(() => {
    const mergedById = new Map<string, Connection>()

    // Start with real connections from server, filtering out deleted/deleting ones
    projectConnections.forEach((connection) => {
      if (deletedConnections.has(connection.id) || deletingConnections.has(connection.id)) {
        return
      }
      mergedById.set(connection.id, connection)
    })

    // Inject real connections that replaced optimistic ones but aren't yet in server response
    Object.values(realConnections).forEach((connection) => {
      if (deletedConnections.has(connection.id) || deletingConnections.has(connection.id)) {
        return
      }
      mergedById.set(connection.id, connection)
    })

    // Append active optimistic connections (temp IDs)
    Object.values(optimisticConnections).forEach((connection) => {
      if (deletedConnections.has(connection.id) || deletingConnections.has(connection.id)) {
        return
      }
      mergedById.set(connection.id, connection as Connection)
    })

    return Array.from(mergedById.values())
  }, [projectConnections, realConnections, optimisticConnections, deletingConnections, deletedConnections])

  // Memoize connection mapping for performance
  const connectionsBySource = useMemo(() => {
    if (mergedConnections.length === 0) {
      return new Map<string, Connection[]>()
    }

    const map = new Map<string, Connection[]>()

    for (const connection of mergedConnections) {
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
  }, [mergedConnections])
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
      const hasImageAsset = Boolean(snippet.imageUrl ?? snippet.imageS3Key)
      const sanitizedSnippet =
        hasImageAsset && snippet.textField1 !== ''
          ? { ...snippet, textField1: '' }
          : snippet
      const connectionsForSnippet = connectionsBySource.get(snippet.id) ?? EMPTY_CONNECTION_LIST

      if (connectionsForSnippet === EMPTY_CONNECTION_LIST) {
        return {
          ...sanitizedSnippet,
          connections: EMPTY_CONNECTION_LIST
        }
      }

      return {
        ...sanitizedSnippet,
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
    onUpdateContent: (snippetId: string, changes: Partial<Pick<Snippet, 'textField1' | 'title'>>) => Promise<void>
    onCombine: (snippetId: string) => Promise<void>
    onGenerateImage: (snippetId: string, modelId?: string, promptOverride?: string) => void
    onGenerateText: (snippetId: string, content: string) => Promise<void>
    onGenerateVideo: (snippetId: string, options: VideoGenerationInput) => Promise<void>
    onFocusSnippet: (snippetId: string) => void
    onCreateUpstreamSnippet: (snippetId: string) => Promise<void> | void
  },
  generatingImageSnippetIds: Record<string, boolean>,
  generatingVideoSnippetIds: Record<string, boolean>,
  textModels?: AvailableModel[],
  isLoadingTextModels?: boolean,
  imageModels?: AvailableModel[],
  isLoadingImageModels?: boolean,
  videoModels?: AvailableModel[],
  isLoadingVideoModels?: boolean
): Node<SnippetNodeData>[] {
  // Track which snippets have been migrated to column layout
  const migratedSnippetsRef = useRef<Set<string>>(new Set())
  const { addPendingPosition } = usePendingPositionsStore()

  // Migrate existing snippets to column layout on first render
  useEffect(() => {
    const snippetsNeedingMigration = snippets.filter(snippet => {
      if (!snippet.position) return false
      if (migratedSnippetsRef.current.has(snippet.id)) return false

      const currentX = snippet.position.x
      const snappedX = snapToColumn(currentX)

      // Check if position needs to be adjusted
      return Math.abs(currentX - snappedX) > 1 // Allow 1px tolerance
    })

    if (snippetsNeedingMigration.length > 0) {
      // Batch migrate all snippets that need adjustment
      snippetsNeedingMigration.forEach(snippet => {
        const snappedPosition = {
          x: snapToColumn(snippet.position!.x),
          y: snippet.position!.y
        }

        // Add to pending positions for batch update
        addPendingPosition(snippet.id, snappedPosition)

        // Mark as migrated
        migratedSnippetsRef.current.add(snippet.id)
      })

      // Note: The pending positions will be flushed by the existing debounced mechanism
      // in useReactFlowSetup, so no need to trigger flush here
      console.warn(`Migrated ${snippetsNeedingMigration.length} snippets to column layout`)
    }
  }, [snippets, addPendingPosition])

  // Memoize connection analysis separately - only recompute when snippets actually change
  const connectionAnalysis = useMemo(() => {
    return analyzeSnippetConnections(snippets)
  }, [snippets])

  return useMemo(() => {
    const { snippetMap, incomingSourcesMap, connectedContentMap } = connectionAnalysis

    // Sort snippets by creation time to assign z-index
    const sortedSnippets = [...snippets].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeA - timeB
    })

    return sortedSnippets.map((snippet, index) => {
      // Apply column snapping to position for rendering
      const rawPosition = snippet.position ?? { x: 0, y: 0 }
      const position = {
        x: snapToColumn(rawPosition.x),
        y: rawPosition.y
      }

      const incomingSourceIds = incomingSourcesMap.get(snippet.id) ?? []
      const connectedSnippets = incomingSourceIds
        .map(sourceId => snippetMap.get(sourceId))
        .filter((s): s is Snippet => s !== undefined)
        .map(s => ({ id: s.id, imageS3Key: s.imageS3Key }))
      const connectedContent = connectedContentMap.get(snippet.id) ?? []

      // Compute downstream connections (snippets this snippet connects TO)
      const downstreamConnections = (snippet.connections ?? [])
        .map(conn => {
          const targetSnippet = snippetMap.get(conn.targetSnippetId)
          return targetSnippet ? { id: targetSnippet.id, title: targetSnippet.title } : null
        })
        .filter(conn => conn !== null) as { id: string; title?: string }[]

      const isVideoSnippet = snippet.snippetType === 'video'
      const nodeBackground = isVideoSnippet ? '#ede9fe' : '#dbeafe' // purple-100 vs blue-100
      const nodeBorder = isVideoSnippet ? '2px solid #c4b5fd' : '2px solid #93c5fd'

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
            tags: snippet.tags,
            categories: snippet.categories,
            connectionCount: snippet.connections?.length ?? 0,
            imageUrl: snippet.imageUrl,
            imageS3Key: snippet.imageS3Key,
            imageMetadata: snippet.imageMetadata,
            connectedContent,
            downstreamConnections,
            snippetType: snippet.snippetType,
            videoUrl: snippet.videoUrl,
            videoS3Key: snippet.videoS3Key,
            videoMetadata: snippet.videoMetadata,
            videoGenerationStatus: snippet.videoGenerationStatus,
            videoGenerationTaskId: snippet.videoGenerationTaskId,
            videoGenerationError: snippet.videoGenerationError
          },
          ...handlers,
          onGenerateVideo: handlers.onGenerateVideo,
          isGeneratingImage: Boolean(generatingImageSnippetIds[snippet.id]),
          isGeneratingVideo: Boolean(generatingVideoSnippetIds[snippet.id]),
          connectedSnippets,
          textModels,
          isLoadingTextModels,
          imageModels,
          isLoadingImageModels,
          videoModels,
          isLoadingVideoModels
        },
        style: {
          background: nodeBackground,
          border: nodeBorder,
          borderRadius: '8px',
          minWidth: 200,
          boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.08)'
        }
      } as Node<SnippetNodeData>
    })
  }, [
    snippets,
    handlers,
    generatingImageSnippetIds,
    generatingVideoSnippetIds,
    textModels,
    isLoadingTextModels,
    imageModels,
    isLoadingImageModels,
    videoModels,
    isLoadingVideoModels,
    connectionAnalysis
  ])
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
