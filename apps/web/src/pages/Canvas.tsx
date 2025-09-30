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
import { Navigation } from '../components/ui/Navigation'
import { CREATE_SNIPPET } from '../graphql/mutations'
import { GET_PROJECT_WITH_SNIPPETS } from '../graphql/queries'

import type { Connection, Edge, Node, ReactFlowInstance } from 'reactflow'

interface Snippet {
  id: string
  textField1: string
  textField2: string
  position?: {
    x: number
    y: number
  } | null
  tags?: string[]
  categories?: string[]
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
const initialNodes: Node[] = []
const initialEdges: Edge[] = []

export const Canvas = () => {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [isLoading, setIsLoading] = useState(false)

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
    console.log('Query data updated:', {
      loading,
      hasProject: !!data?.project,
      snippetCount: data?.project?.snippets?.length ?? 0
    })
  }, [data, loading])

  const [createSnippetMutation] = useMutation(CREATE_SNIPPET, {
    refetchQueries: [
      {
        query: GET_PROJECT_WITH_SNIPPETS,
        variables: { projectId }
      }
    ],
    awaitRefetchQueries: true,
    onCompleted: (data) => {
      console.log('Snippet created successfully:', data)
    },
    onError: (error) => {
      console.error('Error creating snippet:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('GraphQL errors:', error.graphQLErrors)
      console.error('Network error:', error.networkError)
      alert(`Failed to create snippet: ${error.message}`)
    }
  })

  const project: Project | null = data?.project ?? null
  const rawSnippets = project?.snippets
  const snippets = useMemo<Snippet[]>(() => {
    const result = rawSnippets ?? EMPTY_SNIPPET_LIST
    console.log('Snippets from query:', result)
    return result
  }, [rawSnippets])

  const flowNodes = useMemo(() => {
    console.log('Creating flow nodes from snippets:', snippets.length)
    return snippets.map((snippet) => {
      const position = snippet.position ?? { x: 0, y: 0 }
      console.log('Creating node for snippet:', snippet.id, position)
      const snippetTitle = snippet.textField1?.trim() ? snippet.textField1 : 'Untitled snippet'

      return {
        id: snippet.id,
        type: 'default',
        position,
        data: {
          label: (
            <div
              className="p-3"
              data-testid="snippet-node"
              data-snippet-id={snippet.id}
            >
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span className="uppercase tracking-wide">Snippet</span>
                <span className="font-mono text-[11px] text-gray-400">#{snippet.id}</span>
              </div>
              <div className="font-medium text-sm mb-1 text-gray-900">
                {snippetTitle}
              </div>
            {snippet.textField2 && (
                <div className="text-xs text-gray-600 max-w-48 truncate">
                  {snippet.textField2}
                </div>
              )}
              {snippet.tags && snippet.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {snippet.tags.slice(0, 2).map((tag) => (
                    <span
                      key={`${snippet.id}-${tag}`}
                      className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {snippet.tags.length > 2 && (
                    <span className="text-xs text-gray-500">
                      +{snippet.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        },
        style: {
          background: '#fff',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          minWidth: 200,
          boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.08)'
        }
      } as Node
    })
  }, [snippets])

  useEffect(() => {
    setNodes(flowNodes)
  }, [flowNodes, setNodes])

  const flowEdges = useMemo(() => {
    const edgesMap = new Map<string, Edge>()

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
            labelStyle: { fill: '#374151', fontWeight: 500 }
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
      // For now, just add the edge visually
      // Later we'll implement the mutation to save connections
      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges]
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

  const handleCreateSnippet = useCallback(async (position: { x: number; y: number }) => {
    if (!projectId) {
      console.error('Cannot create snippet: no project ID')
      return
    }

    console.log('Creating snippet at position:', position, 'for project:', projectId)

    setIsLoading(true)
    try {
      const variables = {
        input: {
          projectId,
          textField1: 'New Snippet',
          textField2: 'Click to edit...',
          position: {
            x: position.x,
            y: position.y
          },
          tags: [],
          categories: []
        }
      }
      console.log('Mutation variables:', JSON.stringify(variables, null, 2))

      const result = await createSnippetMutation({ variables })
      console.log('Mutation result:', result)
    } catch (error) {
      console.error('Failed to create snippet (caught in handler):', error)
    } finally {
      setIsLoading(false)
    }
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
  }, [])

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
            fitView
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
    </>
  )
}
