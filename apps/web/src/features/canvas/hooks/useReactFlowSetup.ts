/**
 * ReactFlow Setup Hook
 * Manages ReactFlow configuration, viewport, and node/edge updates
 */

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type OnNodesChange,
  type OnEdgesChange,
  type ReactFlowInstance,
  type Connection,
  type Node,
  type Edge
} from 'reactflow'

import { UPDATE_SNIPPET_POSITIONS } from '../../../graphql/mutations'
import { getClient } from '../../../services/graphql'
import { CANVAS_CONSTANTS } from '../../../constants'
import { useDebouncedCallback } from '../../../hooks/useDebounce'
import { mutateWithInvalidate } from '../../../utils/cacheHelpers'
import { snapPositionToColumn } from '../../../utils/columnLayout'
import { useCanvasKeyboardShortcut } from '../context/canvasKeyboard'
import { useCanvasStore } from '../store/canvasStore'
import { useOptimisticUpdatesStore } from '../store/optimisticUpdatesStore'
import { usePendingPositionsStore } from '../store/pendingPositionsStore'

import type {
  Snippet,
  SnippetNodeData,
  UseGraphQLMutationResult,
  CreateConnectionVariables,
  CreateConnectionMutationData,
  DeleteConnectionVariables,
  DeleteConnectionMutationData,
  UpdateSnippetPositionsMutationData,
  UpdateSnippetPositionsVariables,
  UpdateSnippetMutationData,
  UpdateSnippetVariables
} from '../../../types'

interface ConnectionEdgeData {
  connectionId?: string
}

const BULK_POSITION_CHUNK_SIZE = 20 // Conservative chunk size to stay well below AppSync limits
const BULK_POSITION_SUPPORT_STORAGE_KEY = 'canvas-bulk-position-mutation-supported-v2'
const BULK_POSITION_SUPPORT_RETRY_MS = 30 * 60 * 1000 // Retry bulk detection every 30 minutes

interface GraphQLClient {
  graphql: <TData = unknown, TVariables = Record<string, unknown>>(input: {
    query: string
    variables?: TVariables
  }) => Promise<{
    data?: TData | null
    errors?: { message?: string }[]
  }>
}

const haveNodesChanged = (
  previousNodes: Node<SnippetNodeData>[],
  nextNodes: Node<SnippetNodeData>[]
): boolean => {
  if (previousNodes === nextNodes) return false
  if (previousNodes.length !== nextNodes.length) return true

  const previousById = new Map(previousNodes.map(node => [node.id, node]))

  for (const node of nextNodes) {
    const previousNode = previousById.get(node.id)
    if (!previousNode) return true

    const previousSnippet = previousNode.data?.snippet
    const nextSnippet = node.data?.snippet

    if (
      previousNode.type !== node.type ||
      previousNode.zIndex !== node.zIndex ||
      previousNode.position.x !== node.position.x ||
      previousNode.position.y !== node.position.y ||
      Boolean(previousNode.data?.isGeneratingImage) !== Boolean(node.data?.isGeneratingImage)
    ) {
      return true
    }

    if (previousSnippet || nextSnippet) {
      if (!previousSnippet || !nextSnippet) return true

      if (
        previousSnippet.title !== nextSnippet.title ||
        previousSnippet.textField1 !== nextSnippet.textField1 ||
        previousSnippet.connectionCount !== nextSnippet.connectionCount ||
        previousSnippet.snippetType !== nextSnippet.snippetType ||
        previousSnippet.imageUrl !== nextSnippet.imageUrl ||
        previousSnippet.imageS3Key !== nextSnippet.imageS3Key
      ) {
        return true
      }
    }
  }

  return false
}

const haveEdgesChanged = (
  previousEdges: Edge<ConnectionEdgeData>[],
  nextEdges: Edge<ConnectionEdgeData>[]
): boolean => {
  if (previousEdges === nextEdges) return false
  if (previousEdges.length !== nextEdges.length) return true

  const previousById = new Map(previousEdges.map(edge => [edge.id, edge]))

  for (const edge of nextEdges) {
    const previousEdge = previousById.get(edge.id)
    if (!previousEdge) return true

    if (
      previousEdge.source !== edge.source ||
      previousEdge.target !== edge.target ||
      previousEdge.label !== edge.label ||
      previousEdge.type !== edge.type ||
      previousEdge.data?.connectionId !== edge.data?.connectionId
    ) {
      return true
    }
  }

  return false
}

export interface UseReactFlowSetupProps {
  projectId: string | undefined
  flowNodes: Node<SnippetNodeData>[]
  flowEdges: Edge<ConnectionEdgeData>[]
  snippets: Snippet[]
  updateSnippetMutation: UseGraphQLMutationResult<UpdateSnippetMutationData, UpdateSnippetVariables>['mutate']
  createConnectionMutation: UseGraphQLMutationResult<CreateConnectionMutationData, CreateConnectionVariables>['mutate']
  deleteConnectionMutation: UseGraphQLMutationResult<DeleteConnectionMutationData, DeleteConnectionVariables>['mutate']
}

export interface UseReactFlowSetupResult {
  nodes: Node<SnippetNodeData>[]
  edges: Edge<ConnectionEdgeData>[]
  setNodes: Dispatch<SetStateAction<Node<SnippetNodeData>[]>>
  setEdges: Dispatch<SetStateAction<Edge<ConnectionEdgeData>[]>>
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: (params: Connection) => void
  onInit: (instance: ReactFlowInstance) => void
  onNodeDragStop: (_event: React.MouseEvent, node: Node) => void
  onMoveEnd: () => void
  onZoomToFit: () => void
  reactFlowInstance: React.MutableRefObject<ReactFlowInstance | null>
}

export function useReactFlowSetup({
  projectId,
  flowNodes,
  flowEdges,
  snippets,
  updateSnippetMutation,
  createConnectionMutation,
  deleteConnectionMutation
}: UseReactFlowSetupProps): UseReactFlowSetupResult {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const { saveViewportToStorage, loadViewportFromStorage } = useCanvasStore()
  const {
    addOptimisticConnection,
    replaceOptimisticConnection,
    removeOptimisticConnection,
    markConnectionDeleting,
  rollbackConnectionDeletion,
  updateSnippetPosition
} = useOptimisticUpdatesStore()
  const { addPendingPosition, getPendingPositions, clearAll: clearPendingPositions } = usePendingPositionsStore()
  const [isFlushing, setIsFlushing] = useState(false)
  const allowBulkPositionMutation = Boolean(CANVAS_CONSTANTS.ENABLE_BULK_POSITION_MUTATION)
  const bulkUpdateSupportedRef = useRef<boolean>(allowBulkPositionMutation)

  useEffect(() => {
    if (!allowBulkPositionMutation || typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.removeItem('canvas-bulk-position-mutation-supported')

      const storedValue = window.localStorage.getItem(BULK_POSITION_SUPPORT_STORAGE_KEY)
      if (!storedValue) {
        return
      }

      const parsed = JSON.parse(storedValue) as { status?: 'supported' | 'unsupported'; updatedAt?: number }

      if (parsed?.status === 'unsupported') {
        const lastCheckedAt = parsed.updatedAt ?? 0
        const ageMs = Date.now() - lastCheckedAt

        if (ageMs < BULK_POSITION_SUPPORT_RETRY_MS) {
          bulkUpdateSupportedRef.current = false
        } else {
          window.localStorage.removeItem(BULK_POSITION_SUPPORT_STORAGE_KEY)
        }
      }
    } catch (error) {
      console.warn('[useReactFlowSetup] Failed to read bulk position support flag from storage.', error)
    }
  }, [allowBulkPositionMutation])

  // Use refs to avoid recreating callbacks when snippets/edges change
  const snippetsRef = useRef<Snippet[]>(snippets)
  const edgesRef = useRef<Edge<ConnectionEdgeData>[]>([])
  snippetsRef.current = snippets

  const [nodes, setNodes, onNodesChange] = useNodesState<SnippetNodeData>(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<ConnectionEdgeData>(flowEdges)

  const flowNodesRef = useRef<Node<SnippetNodeData>[]>(flowNodes)
  const flowEdgesRef = useRef<Edge<ConnectionEdgeData>[]>(flowEdges)

  // Ensure ReactFlow receives latest nodes/edges when fetched data updates without causing update loops
  useEffect(() => {
    if (haveNodesChanged(flowNodesRef.current, flowNodes)) {
      setNodes(flowNodes)
    }

    flowNodesRef.current = flowNodes
  }, [flowNodes, setNodes])

  useEffect(() => {
    if (haveEdgesChanged(flowEdgesRef.current, flowEdges)) {
      setEdges(flowEdges)
    }

    flowEdgesRef.current = flowEdges
  }, [flowEdges, setEdges])

  // Update edgesRef for keyboard listener
  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  // Flush all pending position updates to backend
  // Prefer bulk mutation in chunks; fall back to legacy per-snippet updates if needed
  const flushPendingPositions = useCallback(async () => {
    if (!projectId || isFlushing) {
      return
    }

    const pendingPositions = getPendingPositions()
    const snippetIds = Object.keys(pendingPositions)

    if (snippetIds.length === 0) {
      return
    }

    const preparedUpdates = snippetIds.reduce<{
      snippetId: string
      position: { x: number; y: number }
      fallbackSnippet?: Snippet
    }[]>((acc, snippetId) => {
      const position = pendingPositions[snippetId]
      if (!position) {
        return acc
      }

      const snapshot = snippetsRef.current.find(s => s.id === snippetId)
      const fallbackSnippet = snapshot
        ? {
            ...snapshot,
            position: snapshot.position ? { ...snapshot.position } : null
          }
        : undefined

      acc.push({
        snippetId,
        position: { x: position.x, y: position.y },
        fallbackSnippet
      })

      return acc
    }, [])

    if (preparedUpdates.length === 0) {
      return
    }

    setIsFlushing(true)

    try {
      preparedUpdates.forEach(({ snippetId, position, fallbackSnippet }) => {
        updateSnippetPosition(snippetId, position, fallbackSnippet)
      })

      const updates = preparedUpdates.map(({ snippetId, position }) => ({
        snippetId,
        position
      }))

      let bulkSucceeded = false
      const attemptedBulk = allowBulkPositionMutation && bulkUpdateSupportedRef.current
      const bulkErrors: string[] = []

      if (attemptedBulk) {
        try {
          const client = getClient() as GraphQLClient
          bulkSucceeded = true

          for (let i = 0; i < updates.length; i += BULK_POSITION_CHUNK_SIZE) {
            const chunk = updates.slice(i, i + BULK_POSITION_CHUNK_SIZE)
            const { data, errors } = await client.graphql<UpdateSnippetPositionsMutationData, UpdateSnippetPositionsVariables>({
              query: UPDATE_SNIPPET_POSITIONS,
              variables: {
                projectId,
                updates: chunk
              }
            })

            if (errors && errors.length > 0) {
              bulkErrors.push(...errors.map(error => error?.message ?? 'Unknown bulk position error'))
              bulkSucceeded = false
              break
            }

            if (!data?.updateSnippetPositions) {
              bulkErrors.push('Bulk mutation returned no data.')
              bulkSucceeded = false
              break
            }
          }
        } catch (error) {
          console.warn('[useReactFlowSetup] Bulk position mutation failed, falling back to single updates.', error)
          if (error instanceof Error && error.message) {
            bulkErrors.push(error.message)
          }
          bulkSucceeded = false
        }

        if (!bulkSucceeded) {
          bulkUpdateSupportedRef.current = false

          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(
                BULK_POSITION_SUPPORT_STORAGE_KEY,
                JSON.stringify({ status: 'unsupported', updatedAt: Date.now() })
              )
            } catch (error) {
              console.warn('[useReactFlowSetup] Failed to persist bulk position support flag.', error)
            }
          }
        }
      }

      if (bulkSucceeded) {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(
              BULK_POSITION_SUPPORT_STORAGE_KEY,
              JSON.stringify({ status: 'supported', updatedAt: Date.now() })
            )
          } catch (error) {
            console.warn('[useReactFlowSetup] Failed to persist bulk position support flag.', error)
          }
        }

        clearPendingPositions()
        return
      }

      if (attemptedBulk) {
        console.warn('[useReactFlowSetup] Bulk position update failed, falling back to single mutations', {
          errors: bulkErrors
        })
      }

      await Promise.all(
        preparedUpdates.map(async ({ snippetId, position }) => {
          try {
            await updateSnippetMutation({
              variables: {
                projectId,
                id: snippetId,
                input: {
                  position
                }
              }
            })
          } catch (error: unknown) {
            console.error(`Failed to save position for snippet ${snippetId}:`, error)
          }
        })
      )

      clearPendingPositions()
    } finally {
      setIsFlushing(false)
    }
  }, [
    projectId,
    isFlushing,
    getPendingPositions,
    updateSnippetPosition,
    clearPendingPositions,
    updateSnippetMutation,
    allowBulkPositionMutation
  ])

  // Debounced version of flush (500ms delay)
  const debouncedFlushPositions = useDebouncedCallback(flushPendingPositions, 500)

  // Initialize ReactFlow
  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance

    // Restore saved viewport for this project
    if (projectId) {
      const savedViewport = loadViewportFromStorage(projectId)
      if (savedViewport) {
        instance.setViewport(savedViewport)
      }
    }
  }, [projectId, loadViewportFromStorage])

  // Handle node drag - Using ref to avoid recreating callback when snippets change
  // Positions are added to pending store and flushed in batch after 500ms delay
  // Supports multi-select: all selected nodes are moved together
  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!projectId || !reactFlowInstance.current) return

    // Get all nodes from ReactFlow instance to check for selected ones
    const allNodes = reactFlowInstance.current.getNodes()
    const selectedNodes = allNodes.filter(n => n.selected)

    // If no nodes are selected, fallback to single node behavior
    const nodesToUpdate = selectedNodes.length > 0 ? selectedNodes : [node]

    let hasAnyPositionChanged = false
    const snappedPositions = new Map<string, { x: number; y: number }>()

    // Process each node that was moved
    nodesToUpdate.forEach(n => {
      const snippet = snippetsRef.current.find(s => s.id === n.id)
      if (!snippet) return

      // Snap position to column constraints (x only, y remains free)
      const snappedPosition = snapPositionToColumn({
        x: n.position.x,
        y: n.position.y
      })

      const previousPosition = snippet.position ?? undefined
      const previousX = previousPosition?.x
      const previousY = previousPosition?.y

      const hasPositionChanged =
        previousPosition === undefined
        || Math.abs((previousX ?? 0) - snappedPosition.x) >= 0.5
        || Math.abs((previousY ?? 0) - snappedPosition.y) >= 0.5

      if (hasPositionChanged) {
        // Add snapped position to pending store (instant, no mutation yet)
        addPendingPosition(n.id, snappedPosition)
        hasAnyPositionChanged = true
        snappedPositions.set(n.id, snappedPosition)
      }
    })

    if (snappedPositions.size > 0) {
      // Update local node state so ReactFlow reflects snapped columns immediately (multi-select friendly)
      setNodes((currentNodes: Node<SnippetNodeData>[]) =>
        currentNodes.map(existingNode => {
          const snapped = snappedPositions.get(existingNode.id)
          if (!snapped) {
            return existingNode
          }

          const hasNodePositionChanged =
            Math.abs(existingNode.position.x - snapped.x) >= 0.5
            || Math.abs(existingNode.position.y - snapped.y) >= 0.5

          if (!hasNodePositionChanged) {
            return existingNode
          }

          return {
            ...existingNode,
            position: {
              ...existingNode.position,
              x: snapped.x,
              y: snapped.y
            },
            positionAbsolute: existingNode.positionAbsolute
              ? {
                  ...existingNode.positionAbsolute,
                  x: snapped.x,
                  y: snapped.y
                }
              : {
                  x: snapped.x,
                  y: snapped.y
                }
          }
        })
      )
    }

    // Trigger debounced flush if any positions changed
    if (hasAnyPositionChanged) {
      debouncedFlushPositions()
    }
  }, [projectId, addPendingPosition, debouncedFlushPositions, reactFlowInstance, setNodes])

  // Save viewport when it changes
  const onMoveEnd = useCallback(() => {
    if (reactFlowInstance.current && projectId) {
      const viewport = reactFlowInstance.current.getViewport()
      saveViewportToStorage(projectId, viewport)
    }
  }, [projectId, saveViewportToStorage])

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (!projectId || !params.source || !params.target) return

      const sourceSnippetId = params.source
      const targetSnippetId = params.target

      // Generate temporary ID for optimistic connection
      const tempId = `temp-conn-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

      // Add optimistic connection immediately for instant feedback
      addOptimisticConnection({
        id: tempId,
        projectId,
        sourceSnippetId,
        targetSnippetId,
        label: '',
        createdAt: new Date().toISOString(),
        isOptimistic: true
      })

      // Add edge visually immediately
      setEdges((eds) => addEdge(params, eds))

      // Persist to database - changes list shape, so invalidate
      mutateWithInvalidate(
        () =>
          createConnectionMutation({
            variables: {
              input: {
                projectId,
                sourceSnippetId,
                targetSnippetId,
                label: ''
              }
            }
          }),
        ['ProjectConnections']
      )
        .then((result) => {
          const connectionData = result?.createConnection

          if (connectionData) {
            replaceOptimisticConnection(tempId, connectionData)
          } else {
            console.warn('createConnection returned no data; keeping optimistic connection in place')
          }
        })
        .catch((error) => {
          console.error('Failed to save connection:', error)
          // Remove optimistic connection on failure
          removeOptimisticConnection(tempId)
          // Remove edge if save failed
          setEdges((eds) => eds.filter(e => !(e.source === sourceSnippetId && e.target === targetSnippetId)))
        })
    },
    [projectId, setEdges, createConnectionMutation, addOptimisticConnection, replaceOptimisticConnection, removeOptimisticConnection]
  )

  // Zoom to fit all nodes
  const onZoomToFit = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView({ padding: 0.2 })
    }
  }, [])

  const deleteEdgesShortcut = useMemo(
    () => ({
      keys: ['Delete', 'Backspace'],
      preventDefault: true,
      allowWhileTyping: false
    }),
    []
  )

  const handleDeleteEdgesShortcut = useCallback(() => {
    const selectedEdges = edgesRef.current.filter(edge => edge.selected)

    if (selectedEdges.length === 0 || !projectId) {
      return
    }

    selectedEdges.forEach(edge => {
      const connectionId = edge.data?.connectionId ?? edge.id
      if (!connectionId) {
        console.error('No connection ID found for edge:', edge)
        return
      }

      markConnectionDeleting(connectionId)

      setEdges((eds) => eds.filter(e => e.id !== edge.id))

      mutateWithInvalidate(
        () =>
          deleteConnectionMutation({
            variables: {
              projectId,
              connectionId
            }
          }),
        ['ProjectConnections']
      )
        .then(() => {
          // Connection is now deleted on server, no need to keep in deleting state
        })
        .catch((error) => {
          console.error('Failed to delete connection:', error)
          rollbackConnectionDeletion(connectionId)
          setEdges((eds) => [...eds, edge])
        })
    })
  }, [projectId, deleteConnectionMutation, markConnectionDeleting, rollbackConnectionDeletion, setEdges])

  useCanvasKeyboardShortcut(deleteEdgesShortcut, handleDeleteEdgesShortcut)

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onInit,
    onNodeDragStop,
    onMoveEnd,
    onZoomToFit,
    reactFlowInstance
  }
}
