/**
 * ReactFlow Setup Hook
 * Manages ReactFlow configuration, viewport, and node/edge updates
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addEdge, useEdgesState, useNodesState } from 'reactflow'

import { useDebouncedCallback } from '../../../shared/hooks/useDebounce'
import { mutateWithInvalidate } from '../../../shared/utils/cacheHelpers'
import { snapPositionToColumn } from '../../../shared/utils/columnLayout'
import { useCanvasStore } from '../store/canvasStore'
import { useOptimisticUpdatesStore } from '../store/optimisticUpdatesStore'
import { usePendingPositionsStore } from '../store/pendingPositionsStore'
import { useCanvasKeyboardShortcut } from '../context/canvasKeyboard'

import type { Snippet, SnippetNodeData, UseGraphQLMutationResult, CreateConnectionVariables, DeleteConnectionVariables } from '../../../types'
import type { ReactFlowInstance, Connection, Node, Edge } from 'reactflow'

interface ConnectionEdgeData {
  connectionId?: string
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
  flowEdges: any[]
  snippets: Snippet[]
  updateSnippetMutation: any
  createConnectionMutation: UseGraphQLMutationResult<any, CreateConnectionVariables>['mutate']
  deleteConnectionMutation: UseGraphQLMutationResult<any, DeleteConnectionVariables>['mutate']
}

export interface UseReactFlowSetupResult {
  nodes: Node<SnippetNodeData>[]
  edges: any[]
  setNodes: any
  setEdges: any
  onNodesChange: any
  onEdgesChange: any
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
  // This sends all accumulated position changes in batch (max one per snippet)
  const flushPendingPositions = useCallback(async () => {
    const pendingPositions = getPendingPositions()
    const snippetIds = Object.keys(pendingPositions)

    if (snippetIds.length === 0 || !projectId || isFlushing) {
      return
    }

    setIsFlushing(true)

    try {
      // Send each pending position update sequentially
      // In a future optimization, could batch these into a single mutation
      await Promise.all(
        snippetIds.map(async (snippetId) => {
          const position = pendingPositions[snippetId]
          const snapshot = snippetsRef.current.find(s => s.id === snippetId)
          const fallbackSnippet = snapshot
            ? {
                ...snapshot,
                position: snapshot.position ? { ...snapshot.position } : null
              }
            : undefined

          updateSnippetPosition(snippetId, { x: position.x, y: position.y }, fallbackSnippet)

          try {
            await updateSnippetMutation({
              variables: {
                projectId,
                id: snippetId,
                input: {
                  position: {
                    x: position.x,
                    y: position.y
                  }
                }
              }
            })
          } catch (error: unknown) {
            console.error(`Failed to save position for snippet ${snippetId}:`, error)
            // On failure, position overrides remain; next successful flush will resync
          }
        })
      )

      // Clear all pending positions after successful flush
      clearPendingPositions()
    } finally {
      setIsFlushing(false)
    }
  }, [projectId, getPendingPositions, updateSnippetMutation, isFlushing, clearPendingPositions, updateSnippetPosition])

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
  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    const snippet = snippetsRef.current.find(s => s.id === node.id)
    if (!snippet || !projectId) return

    // Snap position to column constraints (x only, y remains free)
    const snappedPosition = snapPositionToColumn({
      x: node.position.x,
      y: node.position.y
    })

    const previousPosition = snippet.position ?? undefined
    const previousX = previousPosition?.x
    const previousY = previousPosition?.y

    const hasPositionChanged =
      previousPosition === undefined
      || Math.abs((previousX ?? 0) - snappedPosition.x) >= 0.5
      || Math.abs((previousY ?? 0) - snappedPosition.y) >= 0.5

    if (!hasPositionChanged) {
      return
    }

    // Add snapped position to pending store (instant, no mutation yet)
    addPendingPosition(node.id, snappedPosition)

    // Trigger debounced flush (will send all pending positions after 500ms delay)
    debouncedFlushPositions()
  }, [projectId, addPendingPosition, debouncedFlushPositions])

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

      const sourceSnippetId = params.source!
      const targetSnippetId = params.target!

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
