import { useMemo, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes
} from 'reactflow'
import 'reactflow/dist/style.css'

import { CanvasInfoPanel } from '../components/canvas/CanvasInfoPanel'
import { CanvasToolbar } from '../components/canvas/CanvasToolbar'
import { SnippetNode } from '../components/snippets/SnippetNode'
import { Navigation } from '../components/ui/Navigation'
import { LoadingSpinner } from '../shared/components/ui/LoadingSpinner'
import { useCanvasData, useFlowNodes, useFlowEdges } from '../features/canvas/hooks/useCanvasData'
import { useCanvasHandlers } from '../features/canvas/hooks/useCanvasHandlers'
import { useReactFlowSetup } from '../features/canvas/hooks/useReactFlowSetup'
import { CanvasModals } from '../features/canvas/components/CanvasModals'
import { useCanvasStore } from '../features/canvas/store/canvasStore'
import { useModels } from '../contexts/ModelsContext'
import { PromptDesignerPanel } from '../components/canvas/PromptDesignerPanel'

const NODE_TYPES: NodeTypes = {
  snippet: SnippetNode
}

/**
 * Canvas Component - Refactored
 * Orchestrates canvas functionality using custom hooks
 */

const Canvas = () => {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { generatingImageSnippetIds } = useCanvasStore()

  // Data fetching
  const { project, snippets, loading, error, refetch } = useCanvasData(projectId)

  // Get text generation models from Context
  const { textModels, isLoadingTextModels } = useModels()

  // Create a ref for setNodes that will be populated after ReactFlow setup
  const setNodesRef = useRef<any>(() => {})
  const reactFlowInstanceRef = useRef<any>(null)

  // Event handlers and mutations
  const handlers = useCanvasHandlers({
    projectId,
    snippets,
    setNodes: (updateFn: any) => setNodesRef.current(updateFn),
    refetch,
    reactFlowInstance: reactFlowInstanceRef.current
  })

  // Create handlers object for flow nodes
  // Handlers are now stable from useCanvasHandlers (using useCallback with stable deps)
  const nodeHandlers = useMemo(() => ({
    onEdit: handlers.handleEditSnippet,
    onDelete: handlers.handleDeleteSnippet,
    onManageConnections: handlers.handleManageConnections,
    onViewVersions: handlers.handleViewVersions,
    onUpdateContent: handlers.handleUpdateSnippetContent,
    onCombine: handlers.handleCombineSnippetContent,
    onGenerateImage: handlers.handleGenerateImage,
    onGenerateText: handlers.handleGenerateTextSnippet
  }), [
    handlers.handleEditSnippet,
    handlers.handleDeleteSnippet,
    handlers.handleManageConnections,
    handlers.handleViewVersions,
    handlers.handleUpdateSnippetContent,
    handlers.handleCombineSnippetContent,
    handlers.handleGenerateImage,
    handlers.handleGenerateTextSnippet
  ])

  // Create flow nodes and edges
  const flowNodes = useFlowNodes(
    snippets,
    nodeHandlers,
    generatingImageSnippetIds,
    textModels,
    isLoadingTextModels
  )

  const flowEdges = useFlowEdges(snippets)

  // ReactFlow setup
  const {
    nodes,
    edges,
    setNodes,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onInit,
    onNodeDragStop,
    onMoveEnd,
    onZoomToFit,
    reactFlowInstance
  } = useReactFlowSetup({
    projectId,
    flowNodes,
    flowEdges,
    snippets,
    updateSnippetMutation: handlers.updateSnippetMutation,
    createConnectionMutation: handlers.createConnectionMutation,
    deleteConnectionMutation: handlers.deleteConnectionMutation,
    refetch
  })

  // Update the refs with the actual functions
  useEffect(() => {
    setNodesRef.current = setNodes
  }, [setNodes])

  useEffect(() => {
    reactFlowInstanceRef.current = reactFlowInstance
  }, [reactFlowInstance])

  // Normalize project data
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

  // Loading state
  if (loading) {
    return (
      <>
        <Navigation currentProject={currentProjectForNav} />
        <LoadingSpinner fullScreen text="Loading canvas..." size="large" />
      </>
    )
  }

  // Error state
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

  // Not found state
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

  // Render
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
            nodeTypes={NODE_TYPES}
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
          onCreateSnippet={handlers.handleCreateSnippet}
          onSaveCanvas={handlers.handleSaveCanvas}
          onZoomToFit={onZoomToFit}
          isLoading={false}
          reactFlowInstance={reactFlowInstance.current}
        />
        
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-3">
          {normalisedProject && (
            <CanvasInfoPanel
              project={normalisedProject}
              snippetCount={snippetCount}
              connectionCount={connectionCount}
              className="pointer-events-auto"
            />
          )}
          <PromptDesignerPanel />
        </div>
      </div>

      {/* All Modals - Now managed centrally */}
      <CanvasModals
        snippets={snippets}
        onCreateGeneratedSnippet={handlers.handleCreateGeneratedSnippet}
        refetch={refetch}
      />
    </>
  )
}

// Named export for lazy loading
export { Canvas }
