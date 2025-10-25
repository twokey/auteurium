/**
 * ReactFlow Setup Hook
 * Manages ReactFlow configuration, viewport, and node/edge updates
 */

import { useCallback, useEffect, useRef } from 'react'
import { addEdge, useEdgesState, useNodesState } from 'reactflow'

import { useCanvasStore } from '../store/canvasStore'

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
        previousSnippet.textField2 !== nextSnippet.textField2 ||
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
  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    const snippet = snippetsRef.current.find(s => s.id === node.id)
    if (!snippet || !projectId) return

    updateSnippetMutation({
      variables: {
        projectId,
        id: node.id,
        input: {
          position: {
            x: node.position.x,
            y: node.position.y
          }
        }
      }
    }).catch((error: unknown) => {
      console.error('Failed to save snippet position:', error)
    })
  }, [projectId, updateSnippetMutation])

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

      // Add edge visually immediately
      setEdges((eds) => addEdge(params, eds))

      // Persist to database
      createConnectionMutation({
        variables: {
          input: {
            projectId,
            sourceSnippetId: params.source,
            targetSnippetId: params.target,
            label: ''
          }
        }
      }).catch((error) => {
        console.error('Failed to save connection:', error)
        // Remove edge if save failed
        setEdges((eds) => eds.filter(e => !(e.source === params.source && e.target === params.target)))
      })
    },
    [projectId, setEdges, createConnectionMutation]
  )

  // Zoom to fit all nodes
  const onZoomToFit = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView({ padding: 0.2 })
    }
  }, [])

  // Handle Delete key for connections - Using ref to avoid recreating listener when edges change
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedEdges = edgesRef.current.filter(edge => edge.selected)

        if (selectedEdges.length > 0 && projectId) {
          event.preventDefault()

          selectedEdges.forEach(edge => {
            const connectionId = edge.data?.connectionId ?? edge.id
            if (!connectionId) {
              console.error('No connection ID found for edge:', edge)
              return
            }

            deleteConnectionMutation({
              variables: {
                projectId,
                connectionId
              }
            }).catch((error) => {
              console.error('Failed to delete connection:', error)
            })
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [projectId, deleteConnectionMutation])

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
