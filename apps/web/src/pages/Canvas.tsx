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
import { GeneratedSnippetPreviewModal } from '../components/modals/GeneratedSnippetPreviewModal'
import { ManageConnectionsModal } from '../components/modals/ManageConnectionsModal'
import { VersionHistoryModal } from '../components/modals/VersionHistoryModal'
import { SnippetNode } from '../components/snippets/SnippetNode'
import { Navigation } from '../components/ui/Navigation'
import {
  CREATE_SNIPPET,
  UPDATE_SNIPPET,
  CREATE_CONNECTION,
  DELETE_CONNECTION,
  COMBINE_SNIPPET_CONNECTIONS,
  GENERATE_SNIPPET_IMAGE
} from '../graphql/mutations'
import { GET_PROJECT_WITH_SNIPPETS } from '../graphql/queries'
import { useGraphQLMutation } from '../hooks/useGraphQLMutation'
import { useGraphQLQuery } from '../hooks/useGraphQLQuery'

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
  createdAt: string
  updatedAt?: string
  imageUrl?: string | null
  imageS3Key?: string | null
  imageMetadata?: {
    width: number
    height: number
    aspectRatio: string
  } | null
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
type SnippetContentChanges = Partial<Pick<Snippet, 'textField1' | 'textField2'>>

// Helper function to compare snippets for deep equality
const areSnippetsEqual = (a: Snippet[], b: Snippet[]): boolean => {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i++) {
    const snippetA = a[i]
    const snippetB = b[i]

    // Compare key fields that would affect rendering
    if (
      snippetA.id !== snippetB.id ||
      snippetA.textField1 !== snippetB.textField1 ||
      snippetA.textField2 !== snippetB.textField2 ||
      snippetA.version !== snippetB.version ||
      snippetA.imageUrl !== snippetB.imageUrl ||
      snippetA.imageS3Key !== snippetB.imageS3Key ||
      snippetA.position?.x !== snippetB.position?.x ||
      snippetA.position?.y !== snippetB.position?.y ||
      (snippetA.connections?.length ?? 0) !== (snippetB.connections?.length ?? 0)
    ) {
      return false
    }
  }

  return true
}

interface CombineSnippetConnectionsResponse {
  combineSnippetConnections: {
    id: string
    textField1: string
    textField2: string
  }
}

interface CombineSnippetConnectionsVariables {
  projectId: string
  snippetId: string
}

interface SnippetNodeData {
  snippet: {
    id: string
    title?: string
    textField1: string
    textField2: string
    tags?: string[]
    categories?: string[]
    connectionCount: number
  }
  onEdit: (snippetId: string) => void
  onDelete: (snippetId: string) => void
  onManageConnections: (snippetId: string) => void
  onViewVersions: (snippetId: string) => void
  onUpdateContent: (snippetId: string, changes: SnippetContentChanges) => Promise<void>
  onCombine: (snippetId: string) => Promise<void>
  onGenerateImage: (snippetId: string) => void
  isGeneratingImage: boolean
}

interface ConnectionEdgeData {
  connectionId?: string
}

const initialNodes: Node<SnippetNodeData>[] = []
const initialEdges: Edge<ConnectionEdgeData>[] = []
const GENERATED_SNIPPET_VERTICAL_OFFSET = 500

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
  const [generatedSnippetPreview, setGeneratedSnippetPreview] = useState<{ sourceSnippetId: string; content: string } | null>(null)
  const [isCreatingGeneratedSnippet, setIsCreatingGeneratedSnippet] = useState(false)
  const [generatingImageSnippetIds, setGeneratingImageSnippetIds] = useState<Record<string, boolean>>({})

  const queryVariables = useMemo(
    () => (projectId ? { projectId } : undefined),
    [projectId]
  )

  const { data, loading, error } = useGraphQLQuery<
    ProjectWithSnippetsQueryData,
    ProjectWithSnippetsQueryVariables
  >(GET_PROJECT_WITH_SNIPPETS, {
    variables: queryVariables,
    skip: !projectId
  })


  const { mutate: createSnippetMutation } = useGraphQLMutation(CREATE_SNIPPET, {
    onCompleted: () => {
      // Snippet created successfully
    },
    onError: (error: Error) => {
      console.error('Error creating snippet:', error)
      alert(`Failed to create snippet: ${error.message}`)
    }
  })

  const { mutate: updateSnippetMutation } = useGraphQLMutation(UPDATE_SNIPPET, {
    onError: (error: Error) => {
      console.error('Error updating snippet position:', error)
    }
  })

  const { mutate: createConnectionMutation } = useGraphQLMutation(CREATE_CONNECTION, {
    onError: (error: Error) => {
      console.error('Error creating connection:', error)
      alert(`Failed to create connection: ${error.message}`)
    }
  })

  const { mutate: deleteConnectionMutation } = useGraphQLMutation(DELETE_CONNECTION, {
    onError: (error: Error) => {
      console.error('Error deleting connection:', error)
      alert(`Failed to delete connection: ${error.message}`)
    }
  })

  const { mutate: combineConnectionsMutation } = useGraphQLMutation<
    CombineSnippetConnectionsResponse,
    CombineSnippetConnectionsVariables
  >(COMBINE_SNIPPET_CONNECTIONS, {
    onError: (error: Error) => {
      console.error('Error combining snippets:', error)
    }
  })

  const { mutate: generateSnippetImageMutation } = useGraphQLMutation(GENERATE_SNIPPET_IMAGE, {
    onError: (error: Error) => {
      console.error('Error generating snippet image:', error)
    }
  })

  const project: Project | null = data?.project ?? null
  const rawSnippets = project?.snippets
  const previousSnippetsRef = useRef<Snippet[]>(EMPTY_SNIPPET_LIST)

  const snippets = useMemo<Snippet[]>(() => {
    const newSnippets = rawSnippets ?? EMPTY_SNIPPET_LIST

    // Use deep equality to prevent unnecessary re-renders
    // Only return a new reference if the content has actually changed
    if (areSnippetsEqual(previousSnippetsRef.current, newSnippets)) {
      return previousSnippetsRef.current
    }

    previousSnippetsRef.current = newSnippets
    return newSnippets
  }, [rawSnippets])

  useEffect(() => {
    if (!editingSnippet) {
      return
    }

    const latest = snippets.find(s => s.id === editingSnippet.id)
    // Only update if snippet exists and content has changed (not just reference)
    if (latest && (
      latest.textField1 !== editingSnippet.textField1 ||
      latest.textField2 !== editingSnippet.textField2 ||
      latest.version !== editingSnippet.version
    )) {
      setEditingSnippet(latest)
    }
  }, [snippets, editingSnippet])

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

  const handleGenerateImage = useCallback((snippetId: string, modelId?: string) => {
    const snippet = snippets.find(s => s.id === snippetId)
    if (!snippet) {
      return
    }

    if (!projectId) {
      console.error('Cannot generate snippet image: no project ID')
      return
    }

    const prompt = snippet.textField1?.trim() ?? ''
    if (prompt === '') {
      alert('Please provide input in Text Field 1 for image generation.')
      return
    }

    setGeneratingImageSnippetIds((current) => ({
      ...current,
      [snippetId]: true
    }))

    generateSnippetImageMutation({
      variables: {
        projectId,
        snippetId,
        modelId // Pass the selected model ID
      }
    })
      .then(() => {
        alert('Image generated successfully!')
      })
      .catch((error: Error) => {
        console.error('Error generating snippet image:', error)
        alert(`Failed to generate image: ${error.message}`)
      })
      .finally(() => {
        setGeneratingImageSnippetIds((current) => {
          const { [snippetId]: _ignored, ...rest } = current
          return rest
        })
      })
  }, [generateSnippetImageMutation, projectId, snippets])

  const handlePreviewGeneratedSnippet = useCallback((payload: { sourceSnippetId: string; generatedText: string }) => {
    setGeneratedSnippetPreview({
      sourceSnippetId: payload.sourceSnippetId,
      content: payload.generatedText
    })
  }, [])

  const handleCancelGeneratedSnippet = useCallback(() => {
    setGeneratedSnippetPreview(null)
  }, [])

  const handleCreateGeneratedSnippet = useCallback(async () => {
    if (!generatedSnippetPreview) {
      return
    }

    if (!projectId) {
      console.error('Cannot create generated snippet: no project ID')
      return
    }

    const sourceSnippet = snippets.find(s => s.id === generatedSnippetPreview.sourceSnippetId)
    const baseX = sourceSnippet?.position?.x ?? 0
    const baseY = sourceSnippet?.position?.y ?? 0
    const targetPosition = {
      x: baseX,
      y: baseY + GENERATED_SNIPPET_VERTICAL_OFFSET
    }

    setIsCreatingGeneratedSnippet(true)
    try {
      const creationResult = await createSnippetMutation({
        variables: {
          input: {
            projectId,
            title: 'Generated snippet',
            textField1: generatedSnippetPreview.content,
            textField2: '',
            position: targetPosition,
            tags: [],
            categories: []
          }
        }
      })

      const newSnippetId = creationResult ? (creationResult as { createSnippet: { id: string } }).createSnippet.id : null
      if (!newSnippetId) {
        throw new Error('Failed to create snippet: missing snippet ID in response')
      }

      await createConnectionMutation({
        variables: {
          input: {
            projectId,
            sourceSnippetId: generatedSnippetPreview.sourceSnippetId,
            targetSnippetId: newSnippetId,
            label: ''
          }
        }
      })

      setGeneratedSnippetPreview(null)
      setEditingSnippet(null)
    } catch (error) {
      console.error('Failed to create generated snippet:', error)
      alert(`Failed to create snippet or connection: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreatingGeneratedSnippet(false)
    }
  }, [createSnippetMutation, createConnectionMutation, generatedSnippetPreview, projectId, snippets])

  const handleUpdateSnippetContent = useCallback(async (snippetId: string, changes: SnippetContentChanges) => {
    if (!projectId) {
      console.error('Cannot update snippet content: no project ID')
      return
    }

    const snippetBeforeUpdate = snippets.find(s => s.id === snippetId)
    if (!snippetBeforeUpdate) {
      console.error('Cannot update snippet content: snippet not found')
      return
    }

    const updateInput: SnippetContentChanges = {}
    const previousValues: SnippetContentChanges = {}

    if (Object.prototype.hasOwnProperty.call(changes, 'textField1')) {
      updateInput.textField1 = changes.textField1 ?? ''
      previousValues.textField1 = snippetBeforeUpdate.textField1
    }

    if (Object.prototype.hasOwnProperty.call(changes, 'textField2')) {
      updateInput.textField2 = changes.textField2 ?? ''
      previousValues.textField2 = snippetBeforeUpdate.textField2
    }

    if (Object.keys(updateInput).length === 0) {
      return
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === snippetId
          ? {
              ...node,
              data: {
                ...node.data,
                snippet: {
                  ...node.data.snippet,
                  ...updateInput
                }
              }
            }
          : node
      )
    )

    try {
      await updateSnippetMutation({
        variables: {
          projectId,
          id: snippetId,
          input: updateInput
        }
      })
    } catch (error) {
      console.error('Failed to update snippet content:', error)
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === snippetId
            ? {
                ...node,
                data: {
                  ...node.data,
                  snippet: {
                    ...node.data.snippet,
                    ...previousValues
                  }
                }
              }
            : node
        )
      )
      throw error
    }
  }, [projectId, setNodes, snippets, updateSnippetMutation])

  const handleCombineSnippetContent = useCallback(async (snippetId: string) => {
    if (!projectId) {
      console.error('Cannot combine snippet content: no project ID')
      return
    }

    const snippetBeforeCombine = snippets.find((snippetItem) => snippetItem.id === snippetId)
    if (!snippetBeforeCombine) {
      console.error('Cannot combine snippet content: snippet not found')
      return
    }

    try {
      const result = await combineConnectionsMutation({
        variables: {
          projectId,
          snippetId
        }
      })

      const updatedSnippet = result?.combineSnippetConnections
      if (!updatedSnippet) {
        throw new Error('No data returned from combine operation')
      }

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === snippetId
            ? {
                ...node,
                data: {
                  ...node.data,
                  snippet: {
                    ...node.data.snippet,
                    textField1: updatedSnippet.textField1,
                    textField2: updatedSnippet.textField2,
                    connectionCount: node.data.snippet.connectionCount
                  }
                }
              }
            : node
        )
      )
    } catch (error) {
      console.error('Failed to combine snippet content:', error)
      throw error
    }
  }, [combineConnectionsMutation, projectId, setNodes, snippets])

  // Custom node types
  const nodeTypes = useMemo<NodeTypes>(() => ({
    snippet: SnippetNode
  }), [])

  const flowNodes = useMemo(() => {
    // Sort snippets by creation time to assign z-index based on creation order
    // Newer snippets get higher z-index and appear on top
    const sortedSnippets = [...snippets].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeA - timeB
    })

    return sortedSnippets.map((snippet, index) => {
      const position = snippet.position ?? { x: 0, y: 0 }

      // Get incoming connections to find connected snippets
      const incomingConnections = (snippet.connections || []).filter(
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
        zIndex: index + 1, // Newer snippets have higher z-index
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
          onEdit: handleEditSnippet,
          onDelete: handleDeleteSnippet,
          onManageConnections: handleManageConnections,
          onViewVersions: handleViewVersions,
          onUpdateContent: handleUpdateSnippetContent,
          onCombine: handleCombineSnippetContent,
          onGenerateImage: handleGenerateImage,
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
  }, [snippets, handleEditSnippet, handleDeleteSnippet, handleManageConnections, handleViewVersions, handleUpdateSnippetContent, handleCombineSnippetContent, handleGenerateImage, generatingImageSnippetIds])

  useEffect(() => {
    // Use queueMicrotask to defer the update and prevent infinite loops
    queueMicrotask(() => {
      setNodes(flowNodes)
    })
    // setNodes is a stable function from useNodesState, safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowNodes])

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
    // Use queueMicrotask to defer the update and prevent infinite loops
    queueMicrotask(() => {
      setEdges(flowEdges)
    })
    // setEdges is a stable function from useEdgesState, safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowEdges])

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
          onClose={() => {
            setEditingSnippet(null)
            setGeneratedSnippetPreview(null)
          }}
          onPreviewGeneratedSnippet={handlePreviewGeneratedSnippet}
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

      <GeneratedSnippetPreviewModal
        isOpen={generatedSnippetPreview !== null}
        content={generatedSnippetPreview?.content ?? ''}
        onCancel={handleCancelGeneratedSnippet}
        onCreate={handleCreateGeneratedSnippet}
        isCreating={isCreatingGeneratedSnippet}
      />
    </>
  )
}
