import { useMutation, useQuery } from '@apollo/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { CanvasInfoPanel } from '../components/canvas/CanvasInfoPanel'
import { CanvasToolbar } from '../components/canvas/CanvasToolbar'
import { DeleteSnippetConfirmation } from '../components/modals/DeleteSnippetConfirmation'
import { EditSnippetModal } from '../components/modals/EditSnippetModal'
import { ManageConnectionsModal } from '../components/modals/ManageConnectionsModal'
import { VersionHistoryModal } from '../components/modals/VersionHistoryModal'
import { SnippetNode } from '../components/snippets/SnippetNode'
import { Navigation } from '../components/ui/Navigation'
import { CREATE_SNIPPET, UPDATE_SNIPPET, CREATE_CONNECTION, DELETE_CONNECTION } from '../graphql/mutations'
import { GET_PROJECT_WITH_SNIPPETS } from '../graphql/queries'

import type { Connection, Edge, Node, NodeTypes, ReactFlowInstance, Viewport } from 'reactflow'

interface Snippet {
  id: string
  projectId: string
  title?: string
  textField1: string
  textField2: string
  position?: {
    x: number
    y: number
  } | null
  tags?: string[]
  categories?: string[]
  version: number
  connections?: ProjectConnection[]
}

interface ProjectConnection {
  id: string
  sourceSnippetId: string
  targetSnippetId: string
  label?: string
}

interface Project {
  id: string
  name: string
  description?: string
  lastModified?: string
  updatedAt?: string
  createdAt?: string
  snippets?: Snippet[]
}

interface ProjectWithSnippetsQueryData {
  project: Project | null
}

interface ProjectWithSnippetsQueryVariables {
  projectId: string
}

const EMPTY_SNIPPET_LIST: Snippet[] = []
interface SnippetNodeData {
  snippet: {
    id: string
    title?: string
    textField1: string
    textField2: string
    tags?: string[]
    categories?: string[]
  }
  onEdit: (snippetId: string) => void
  onDelete: (snippetId: string) => void
  onManageConnections: (snippetId: string) => void
  onViewVersions: (snippetId: string) => void
}

interface ConnectionEdgeData {
  connectionId?: string
}

const initialNodes: Node<SnippetNodeData>[] = []
const initialEdges: Edge<ConnectionEdgeData>[] = []

const isViewport = (value: unknown): value is Viewport => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.zoom === 'number'
  )
}

export const Canvas = () => {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<SnippetNodeData>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<ConnectionEdgeData>(initialEdges)
  const [isLoading, setIsLoading] = useState(false)

  // Modal states
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null)
  const [deletingSnippet, setDeletingSnippet] = useState<Snippet | null>(null)
  const [managingConnectionsSnippet, setManagingConnectionsSnippet] = useState<Snippet | null>(null)
  const [viewingVersionsSnippet, setViewingVersionsSnippet] = useState<Snippet | null>(null)

  const queryVariables = projectId ? { projectId } : undefined

  const { data, loading, error } = useQuery<
    ProjectWithSnippetsQueryData,
    ProjectWithSnippetsQueryVariables
  >(GET_PROJECT_WITH_SNIPPETS, {
    variables: queryVariables,
    skip: !projectId,
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true
  })

  useEffect(() => {
    // Query data updated
  }, [data, loading])

  const [createSnippetMutation] = useMutation(CREATE_SNIPPET, {
    refetchQueries: [
      {
        query: GET_PROJECT_WITH_SNIPPETS,
        variables: { projectId }
      }
    ],
    awaitRefetchQueries: true,
    onCompleted: () => {
      // Snippet created successfully
    },
    onError: (error) => {
      console.error('Error creating snippet:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('GraphQL errors:', error.graphQLErrors)
      console.error('Network error:', error.networkError)
      alert(`Failed to create snippet: ${error.message}`)
    }
  })

  const [updateSnippetMutation] = useMutation(UPDATE_SNIPPET, {
    onError: (error) => {
      console.error('Error updating snippet position:', error)
    }
  })

  const [createConnectionMutation] = useMutation(CREATE_CONNECTION, {
    refetchQueries: [
      {
        query: GET_PROJECT_WITH_SNIPPETS,
        variables: { projectId }
      }
    ],
    awaitRefetchQueries: true,
    onError: (error) => {
      console.error('Error creating connection:', error)
      alert(`Failed to create connection: ${error.message}`)
    }
  })

  const [deleteConnectionMutation] = useMutation(DELETE_CONNECTION, {
    refetchQueries: [
      {
        query: GET_PROJECT_WITH_SNIPPETS,
        variables: { projectId }
      }
    ],
    awaitRefetchQueries: true,
    onError: (error) => {
      console.error('Error deleting connection:', error)
      alert(`Failed to delete connection: ${error.message}`)
    }
  })

  const project: Project | null = data?.project ?? null
  const rawSnippets = project?.snippets
  const snippets = useMemo<Snippet[]>(() => {
    const result = rawSnippets ?? EMPTY_SNIPPET_LIST
    return result
  }, [rawSnippets])

  // Modal handlers
  const handleEditSnippet = useCallback((snippetId: string) => {
    const snippet = snippets.find(s => s.id === snippetId)
    if (snippet) setEditingSnippet(snippet)
  }, [snippets])

  const handleDeleteSnippet = useCallback((snippetId: string) => {
    const snippet = snippets.find(s => s.id === snippetId)
    if (snippet) setDeletingSnippet(snippet)
  }, [snippets])

  const handleManageConnections = useCallback((snippetId: string) => {
    const snippet = snippets.find(s => s.id === snippetId)
    if (snippet) setManagingConnectionsSnippet(snippet)
  }, [snippets])

  const handleViewVersions = useCallback((snippetId: string) => {
    const snippet = snippets.find(s => s.id === snippetId)
    if (snippet) setViewingVersionsSnippet(snippet)
  }, [snippets])

  // Custom node types
  const nodeTypes = useMemo<NodeTypes>(() => ({
    snippet: SnippetNode
  }), [])

  const flowNodes = useMemo(() => {
    return snippets.map((snippet) => {
      const position = snippet.position ?? { x: 0, y: 0 }

      return {
        id: snippet.id,
        type: 'snippet',
        position,
        data: {
          snippet: {
            id: snippet.id,
            title: snippet.title,
            textField1: snippet.textField1,
            textField2: snippet.textField2,
            tags: snippet.tags,
            categories: snippet.categories
          },
          onEdit: handleEditSnippet,
          onDelete: handleDeleteSnippet,
          onManageConnections: handleManageConnections,
          onViewVersions: handleViewVersions
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
  }, [snippets, handleEditSnippet, handleDeleteSnippet, handleManageConnections, handleViewVersions])

  useEffect(() => {
    setNodes(flowNodes)
  }, [flowNodes, setNodes])

  const flowEdges = useMemo(() => {
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

  useEffect(() => {
    setEdges(flowEdges)
  }, [flowEdges, setEdges])

  const onConnect = useCallback(
    (params: Connection) => {
      if (!projectId || !params.source || !params.target) return

      // Add edge visually immediately for better UX
      setEdges((eds) => addEdge(params, eds))

      // Persist connection to database
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
        // Remove the edge if save failed
        setEdges((eds) => eds.filter(e => !(e.source === params.source && e.target === params.target)))
      })
    },
    [projectId, setEdges, createConnectionMutation]
  )

  const normalisedProject = project
    ? {
      id: project.id,
      name: project.name,
      description: project.description,
      lastModified:
        [project.lastModified, project.updatedAt, project.createdAt].find(
          (value): value is string => typeof value === 'string' && value.trim() !== ''
        ) ?? new Date().toISOString()
    }
    : null

  const snippetCount = snippets.length
  const connectionCount = flowEdges.length
  const currentProjectForNav = normalisedProject
    ? { id: normalisedProject.id, name: normalisedProject.name }
    : undefined

  const handleCreateSnippet = useCallback((position: { x: number; y: number }) => {
    if (!projectId) {
      console.error('Cannot create snippet: no project ID')
      return
    }

    setIsLoading(true)
    const variables = {
      input: {
        projectId,
        title: 'New snippet',
        textField1: '',
        textField2: '',
        position: {
          x: position.x,
          y: position.y
        },
        tags: [],
        categories: []
      }
    }

    createSnippetMutation({ variables })
      .catch((error) => {
        console.error('Failed to create snippet (caught in handler):', error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [projectId, createSnippetMutation])

  const handleSaveCanvas = useCallback(() => {
    setIsLoading(true)
    // For now, just simulate saving
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleZoomToFit = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView({ padding: 0.2 })
    }
  }, [])

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance

    // Restore saved viewport for this project
    if (projectId) {
      const savedViewport = localStorage.getItem(`canvas-viewport-${projectId}`)
      if (savedViewport) {
        try {
          const parsed: unknown = JSON.parse(savedViewport)
          if (isViewport(parsed)) {
            instance.setViewport(parsed)
          }
        } catch (error) {
          console.error('Failed to restore viewport:', error)
        }
      }
    }
  }, [projectId])

  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    // Find the snippet to get its projectId
    const snippet = snippets.find(s => s.id === node.id)
    if (!snippet || !projectId) return

    // Update the snippet position in the backend
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
    }).catch((error) => {
      console.error('Failed to save snippet position:', error)
    })
  }, [snippets, projectId, updateSnippetMutation])

  // Save viewport when it changes (pan, zoom)
  const onMoveEnd = useCallback(() => {
    if (reactFlowInstance.current && projectId) {
      const viewport = reactFlowInstance.current.getViewport()
      localStorage.setItem(`canvas-viewport-${projectId}`, JSON.stringify(viewport))
    }
  }, [projectId])

  // Handle Delete key press for selected edges
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Get selected edges
        const selectedEdges = edges.filter(edge => edge.selected)

        if (selectedEdges.length > 0) {
          event.preventDefault()

          if (!projectId) {
            console.error('Cannot delete connection: no project ID')
            return
          }

          // Delete each selected connection
          selectedEdges.forEach(edge => {
            const connectionId = edge.data?.connectionId ?? edge.id

            console.warn('Deleting connection', {
              projectId,
              edgeId: edge.id,
              connectionId,
              edgeData: edge.data
            })

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
              console.error('Connection details:', { projectId, connectionId })
            })
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [edges, projectId, deleteConnectionMutation])

  if (loading) {
    return (
      <>
        <Navigation currentProject={currentProjectForNav} />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navigation currentProject={currentProjectForNav} />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="text-red-500 text-lg font-medium mb-2">Error loading project</div>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    )
  }

  if (!project) {
    return (
      <>
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="text-gray-500 text-lg font-medium mb-2">Project not found</div>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation currentProject={currentProjectForNav} />
      <div className="h-[calc(100vh-64px)] relative" data-testid="canvas-container">
        <div className="h-full" data-testid="react-flow-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onNodeDragStop={onNodeDragStop}
            onMoveEnd={onMoveEnd}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{
              style: { stroke: '#6366f1', strokeWidth: 2 }
            }}
            connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
            edgesFocusable={true}
            edgesUpdatable={false}
            nodesDraggable={true}
            nodesConnectable={true}
            nodesFocusable={true}
            elementsSelectable={true}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={2}
              color="#94a3b8"
              style={{ opacity: 0.5 }}
            />
            <Controls 
              position="bottom-right"
              showInteractive={false}
            />
            <MiniMap 
              position="bottom-left"
              nodeColor="#6366f1"
              maskColor="rgba(0, 0, 0, 0.1)"
              style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb'
              }}
            />
          </ReactFlow>
        </div>
        
        {/* Canvas Toolbar */}
        <CanvasToolbar
          onCreateSnippet={handleCreateSnippet}
          onSaveCanvas={handleSaveCanvas}
          onZoomToFit={handleZoomToFit}
          isLoading={isLoading}
          reactFlowInstance={reactFlowInstance.current}
        />
        
        {/* Canvas Info Panel */}
        {normalisedProject && (
          <CanvasInfoPanel
            project={normalisedProject}
            snippetCount={snippetCount}
            connectionCount={connectionCount}
          />
        )}
      </div>

      {/* Modals */}
      {editingSnippet && (
        <EditSnippetModal
          isOpen={true}
          onClose={() => setEditingSnippet(null)}
          snippet={editingSnippet}
        />
      )}

      {deletingSnippet && (
        <DeleteSnippetConfirmation
          isOpen={true}
          onClose={() => setDeletingSnippet(null)}
          snippet={deletingSnippet}
        />
      )}

      {managingConnectionsSnippet && (
        <ManageConnectionsModal
          isOpen={true}
          onClose={() => setManagingConnectionsSnippet(null)}
          snippet={managingConnectionsSnippet}
          allSnippets={snippets}
        />
      )}

      {viewingVersionsSnippet && (
        <VersionHistoryModal
          isOpen={true}
          onClose={() => setViewingVersionsSnippet(null)}
          snippet={viewingVersionsSnippet}
        />
      )}
    </>
  )
}
