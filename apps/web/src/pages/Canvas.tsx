import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { GET_PROJECT_WITH_SNIPPETS } from '../graphql/queries'
import { Navigation } from '../components/ui/Navigation'
import { CanvasToolbar } from '../components/canvas/CanvasToolbar'
import { CanvasInfoPanel } from '../components/canvas/CanvasInfoPanel'

interface Project {
  id: string
  name: string
  description?: string
}

interface Snippet {
  id: string
  textField1: string
  textField2: string
  position: {
    x: number
    y: number
  }
  tags?: string[]
  categories?: string[]
}

interface ProjectConnection {
  id: string
  sourceSnippetId: string
  targetSnippetId: string
  label?: string
}

const initialNodes: Node[] = []
const initialEdges: Edge[] = []

export const Canvas = () => {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [isLoading, setIsLoading] = useState(false)

  const { data, loading, error } = useQuery(GET_PROJECT_WITH_SNIPPETS, {
    variables: { projectId },
    skip: !projectId,
    errorPolicy: 'all'
  })

  const project: Project | null = data?.getProject || null
  const snippets: Snippet[] = data?.getSnippetsByProject || []
  const connections: ProjectConnection[] = data?.getConnectionsByProject || []

  // Convert snippets to React Flow nodes
  useEffect(() => {
    if (snippets.length > 0) {
      const flowNodes = snippets.map((snippet) => ({
        id: snippet.id,
        type: 'default',
        position: snippet.position,
        data: {
          label: (
            <div className="p-3">
              <div className="font-medium text-sm mb-1 text-gray-900">
                {snippet.textField1 || 'Untitled'}
              </div>
              {snippet.textField2 && (
                <div className="text-xs text-gray-600 max-w-48 truncate">
                  {snippet.textField2}
                </div>
              )}
              {snippet.tags && snippet.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {snippet.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
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
          minWidth: '200px'
        }
      }))
      setNodes(flowNodes)
    }
  }, [snippets, setNodes])

  // Convert connections to React Flow edges
  useEffect(() => {
    if (connections.length > 0) {
      const flowEdges = connections.map((connection) => ({
        id: connection.id,
        source: connection.sourceSnippetId,
        target: connection.targetSnippetId,
        label: connection.label,
        type: 'default',
        style: { stroke: '#6366f1', strokeWidth: 2 },
        labelStyle: { fill: '#374151', fontWeight: 500 }
      }))
      setEdges(flowEdges)
    }
  }, [connections, setEdges])

  const onConnect = useCallback(
    (params: Connection) => {
      // For now, just add the edge visually
      // Later we'll implement the mutation to save connections
      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges]
  )

  const handleCreateSnippet = useCallback((position: { x: number; y: number }) => {
    // For now, create a temporary snippet visually
    // Later we'll implement the mutation to create actual snippets
    const newNode: Node = {
      id: `temp-${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: (
          <div className="p-3">
            <div className="font-medium text-sm mb-1 text-gray-900">
              New Snippet
            </div>
            <div className="text-xs text-gray-600">
              Click to edit...
            </div>
          </div>
        )
      },
      style: {
        background: '#fff',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        minWidth: '200px'
      }
    }
    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

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
        <Navigation currentProject={project || undefined} />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navigation currentProject={project || undefined} />
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
      <Navigation currentProject={project} />
      <div className="h-[calc(100vh-64px)] relative">
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
            gap={20} 
            size={1} 
            color="#e5e7eb"
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
        
        {/* Canvas Toolbar */}
        <CanvasToolbar
          onCreateSnippet={handleCreateSnippet}
          onSaveCanvas={handleSaveCanvas}
          onZoomToFit={handleZoomToFit}
          isLoading={isLoading}
        />
        
        {/* Canvas Info Panel */}
        <CanvasInfoPanel
          project={{ ...project!, lastModified: project!.description || new Date().toISOString() }}
          snippetCount={snippets.length}
          connectionCount={connections.length}
        />
      </div>
    </>
  )
}