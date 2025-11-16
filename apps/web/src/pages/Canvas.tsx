import { useMemo, useRef, useEffect, useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes,
  type ReactFlowInstance,
  type Viewport
} from 'reactflow'
import 'reactflow/dist/style.css'

import { CanvasInfoPanel } from '../components/canvas/CanvasInfoPanel'
import { CanvasToolbar } from '../components/canvas/CanvasToolbar'
import { ColumnGuides } from '../components/canvas/ColumnGuides'
import { SnippetNode } from '../components/snippets/SnippetNode'
import { Navigation } from '../components/ui/Navigation'
import { LoadingSpinner } from '../shared/components/ui/LoadingSpinner'
import { useCanvasData, useFlowNodes, useFlowEdges } from '../features/canvas/hooks/useCanvasData'
import { useCanvasHandlers } from '../features/canvas/hooks/useCanvasHandlers'
import { useReactFlowSetup } from '../features/canvas/hooks/useReactFlowSetup'
import { useCanvasKeyboardShortcut } from '../features/canvas/context/canvasKeyboard'
import { CanvasModals } from '../features/canvas/components/CanvasModals'
import { ContextMenu } from '../features/canvas/components/ContextMenu'
import { useCanvasStore } from '../features/canvas/store/canvasStore'
import { useContextMenuStore } from '../features/canvas/store/contextMenuStore'
import { ModelsProvider, useModels } from '../contexts/ModelsContext'
import { PromptDesignerPanel } from '../components/canvas/PromptDesignerPanel'

const NODE_TYPES: NodeTypes = {
  snippet: SnippetNode
}

/**
 * Canvas Component - Refactored
 * Orchestrates canvas functionality using custom hooks
 */

const CanvasContent = () => {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { generatingImageSnippetIds, generatingVideoSnippetIds, setSelectedSnippetIds } = useCanvasStore()
  const { openContextMenu, closeContextMenu } = useContextMenuStore()

  // Track viewport for column guides
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })

  // Data fetching
  const { project, snippets, loading, error, refetch } = useCanvasData(projectId)

  // Get text and image generation models from Context
  const {
    textModels,
    imageModels,
    videoModels,
    isLoadingTextModels,
    isLoadingImageModels,
    isLoadingVideoModels
  } = useModels()

  // Create refs that will be populated after ReactFlow setup
  const setNodesRef = useRef<any>(() => {})
  const externalReactFlowInstanceRef = useRef<ReactFlowInstance | null>(null)
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null)

  // Event handlers and mutations
  const handlers = useCanvasHandlers({
    projectId,
    snippets,
    setNodes: (updateFn: any) => setNodesRef.current(updateFn),
    reactFlowInstance: externalReactFlowInstanceRef
  })
  const { handleNumberKeyNavigation } = handlers

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
    onGenerateText: handlers.handleGenerateTextSnippet,
    onGenerateVideo: handlers.handleGenerateVideo,
    onFocusSnippet: handlers.handleFocusSnippet,
    onCreateUpstreamSnippet: handlers.handleCreateUpstreamSnippet
  }), [
    handlers.handleEditSnippet,
    handlers.handleDeleteSnippet,
    handlers.handleManageConnections,
    handlers.handleViewVersions,
    handlers.handleUpdateSnippetContent,
    handlers.handleCombineSnippetContent,
    handlers.handleGenerateImage,
    handlers.handleGenerateTextSnippet,
    handlers.handleGenerateVideo,
    handlers.handleFocusSnippet,
    handlers.handleCreateUpstreamSnippet
  ])

  // Create flow nodes and edges
  const flowNodes = useFlowNodes(
    snippets,
    nodeHandlers,
    generatingImageSnippetIds,
    generatingVideoSnippetIds,
    textModels,
    isLoadingTextModels,
    imageModels,
    isLoadingImageModels,
    videoModels,
    isLoadingVideoModels
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
    onInit: setupOnInit,
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
    deleteConnectionMutation: handlers.deleteConnectionMutation
  })

  // Wrap onInit to write the instance to external ref while preserving setup behavior
  const onInit = useCallback((instance: ReactFlowInstance) => {
    externalReactFlowInstanceRef.current = instance
    setViewport(instance.getViewport())
    setupOnInit(instance)
  }, [setupOnInit])

  const handleMove = useCallback((_event: any, viewport: Viewport) => {
    setViewport(viewport)
  }, [])

  // Wrap onMoveEnd to update viewport state for column guides
  const handleMoveEnd = useCallback((_event: any, viewport: Viewport) => {
    setViewport(viewport)
    onMoveEnd()
  }, [onMoveEnd])

  // Handle zoom level indicator click to reset to 100%
  const handleZoomLevelClick = useCallback(() => {
    if (externalReactFlowInstanceRef.current) {
      // Use zoomTo for smooth animation, preserving current view center
      externalReactFlowInstanceRef.current.zoomTo(1, { duration: 300 })
    }
  }, [])

  // Context menu handlers with viewport-aware positioning
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    event.preventDefault()
    event.stopPropagation()

    const pane = reactFlowWrapperRef.current?.getBoundingClientRect()
    if (!pane) return

    // Calculate position with boundary checking
    // If menu doesn't fit on right/bottom, position from right/bottom edge
    const MENU_WIDTH = 200
    const MENU_HEIGHT = 200

    // Check if right-clicked node is part of current selection
    const { selectedSnippetIds } = useCanvasStore.getState()
    const isClickedNodeSelected = selectedSnippetIds.has(node.id)

    // If node is selected and there are multiple selections, use all selected IDs
    // Otherwise, use only the clicked node ID
    const snippetIdsToShow = isClickedNodeSelected && selectedSnippetIds.size > 1
      ? Array.from(selectedSnippetIds)
      : [node.id]

    openContextMenu(snippetIdsToShow, {
      top: event.clientY < pane.height - MENU_HEIGHT ? event.clientY : undefined,
      left: event.clientX < pane.width - MENU_WIDTH ? event.clientX : undefined,
      right: event.clientX >= pane.width - MENU_WIDTH ? pane.width - event.clientX : undefined,
      bottom: event.clientY >= pane.height - MENU_HEIGHT ? pane.height - event.clientY : undefined,
    })
  }, [openContextMenu])

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const { selectedSnippetIds } = useCanvasStore.getState()
    if (selectedSnippetIds.size <= 1) {
      return
    }

    const pane = reactFlowWrapperRef.current?.getBoundingClientRect()
    if (!pane) return

    const MENU_WIDTH = 200
    const MENU_HEIGHT = 200

    const snippetIdsToShow = Array.from(selectedSnippetIds)

    openContextMenu(snippetIdsToShow, {
      top: event.clientY < pane.height - MENU_HEIGHT ? event.clientY : undefined,
      left: event.clientX < pane.width - MENU_WIDTH ? event.clientX : undefined,
      right: event.clientX >= pane.width - MENU_WIDTH ? pane.width - event.clientX : undefined,
      bottom: event.clientY >= pane.height - MENU_HEIGHT ? pane.height - event.clientY : undefined,
    })
  }, [openContextMenu])

  const handlePaneClick = useCallback(() => {
    closeContextMenu()
    // Note: ReactFlow will automatically deselect nodes and trigger onSelectionChange
  }, [closeContextMenu])

  // React Flow now handles all selection logic natively via multiSelectionKeyCode="Meta"
  // No custom node click handler needed

  const numberKeyNavigationShortcut = useMemo(() => ({
    matcher: (event: KeyboardEvent) => /^[0-9]$/.test(event.key),
    allowWhileTyping: false
  }), [])

  const handleNumberKeyNavigationShortcut = useCallback((event: KeyboardEvent) => {
    handleNumberKeyNavigation(event.key)
  }, [handleNumberKeyNavigation])

  useCanvasKeyboardShortcut(numberKeyNavigationShortcut, handleNumberKeyNavigationShortcut)

  // Cmd/Ctrl+A: Select all snippets
  const selectAllShortcut = useMemo(() => ({
    matcher: (event: KeyboardEvent) =>
      event.key.toLowerCase() === 'a' && (event.metaKey || event.ctrlKey),
    allowWhileTyping: false
  }), [])

  const handleSelectAll = useCallback((event: KeyboardEvent) => {
    event.preventDefault()
    // Select all nodes in ReactFlow
    setNodes((currentNodes: any) =>
      currentNodes.map((node: any) => ({
        ...node,
        selected: true
      }))
    )
  }, [setNodes])

  useCanvasKeyboardShortcut(selectAllShortcut, handleSelectAll)

  // Escape: Deselect all snippets
  const deselectShortcut = useMemo(() => ({
    matcher: (event: KeyboardEvent) => event.key === 'Escape',
    allowWhileTyping: false
  }), [])

  const handleDeselect = useCallback(() => {
    // Deselect all nodes in ReactFlow
    setNodes((currentNodes: any) =>
      currentNodes.map((node: any) => ({
        ...node,
        selected: false
      }))
    )
    closeContextMenu()
  }, [setNodes, closeContextMenu])

  useCanvasKeyboardShortcut(deselectShortcut, handleDeselect)

  // Delete/Backspace: Delete selected snippets
  const deleteShortcut = useMemo(() => ({
    matcher: (event: KeyboardEvent) =>
      event.key === 'Delete' || event.key === 'Backspace',
    allowWhileTyping: false
  }), [])

  const handleDeleteSelected = useCallback(() => {
    const { selectedSnippetIds } = useCanvasStore.getState()
    if (selectedSnippetIds.size > 0) {
      const snippetIdsArray = Array.from(selectedSnippetIds)
      handlers.handleDeleteMultiple(snippetIdsArray)
    }
  }, [handlers])

  useCanvasKeyboardShortcut(deleteShortcut, handleDeleteSelected)

  // Sync ReactFlow selection with Zustand store
  const handleSelectionChange = useCallback((params: { nodes: any[] }) => {
    // Update Zustand store with all selected node IDs
    const selectedIds = new Set(params.nodes.map(node => node.id))
    setSelectedSnippetIds(selectedIds)
  }, [setSelectedSnippetIds])

  // Update the ref with the actual setNodes function
  useEffect(() => {
    setNodesRef.current = setNodes
  }, [setNodes])

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
        <div ref={reactFlowWrapperRef} className="h-full" data-testid="react-flow-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onNodeDragStop={onNodeDragStop}
            onSelectionChange={handleSelectionChange}
            onNodeContextMenu={handleNodeContextMenu}
            onPaneContextMenu={handlePaneContextMenu}
            onPaneClick={handlePaneClick}
            onMove={handleMove}
            onMoveEnd={handleMoveEnd}
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
            selectionOnDrag={false}
            panOnDrag={true}
            selectionKeyCode="Shift"
            multiSelectionKeyCode="Meta"
            deleteKeyCode={null}
          >
            <ColumnGuides viewport={viewport} />
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
            {/* Zoom Level Indicator */}
            <div
              className="react-flow__panel bottom left"
              style={{
                bottom: 110,
                left: 10,
                zIndex: 5
              }}
            >
              <button
                onClick={handleZoomLevelClick}
                className="bg-white border border-gray-300 rounded px-3 py-1.5 shadow-sm hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Click to zoom to 100%"
              >
                <span className="text-sm font-medium text-gray-700">
                  {Math.round(viewport.zoom * 100)}%
                </span>
              </button>
            </div>
          </ReactFlow>
        </div>
        
        {/* Canvas Toolbar */}
        <CanvasToolbar
          onCreateSnippet={handlers.handleCreateSnippet}
          onCreateVideoSnippet={handlers.handleCreateVideoSnippet}
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

      {/* Context Menu */}
      <ContextMenu
        onEdit={handlers.handleEditSnippet}
        onDelete={handlers.handleDeleteSnippet}
        onDeleteMultiple={handlers.handleDeleteMultiple}
        onConnectMultiple={handlers.handleConnectMultiple}
        onManageConnections={handlers.handleManageConnections}
        onViewVersions={handlers.handleViewVersions}
      />
    </>
  )
}

// Wrap with ModelsProvider for lazy loading
const Canvas = () => (
  <ModelsProvider>
    <CanvasContent />
  </ModelsProvider>
)

// Named export for lazy loading
export { Canvas }
