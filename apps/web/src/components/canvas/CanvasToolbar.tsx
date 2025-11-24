import { useState } from 'react'

import { CANVAS_CONSTANTS } from '../../constants'

import type { ReactFlowInstance } from 'reactflow'

interface CanvasToolbarProps {
  onCreateSnippet: (position: { x: number; y: number }) => void
  onCreateVideoSnippet: (position: { x: number; y: number }) => void
  onCreateImageSnippet: (position: { x: number; y: number }) => void
  onSaveCanvas: () => void
  onZoomToFit: () => void
  isLoading?: boolean
  reactFlowInstance: ReactFlowInstance | null
}

export const CanvasToolbar = ({
  onCreateSnippet,
  onCreateVideoSnippet,
  onCreateImageSnippet,
  onSaveCanvas,
  onZoomToFit,
  isLoading = false,
  reactFlowInstance
}: CanvasToolbarProps) => {
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatingVideo, setIsCreatingVideo] = useState(false)
  const [isCreatingImage, setIsCreatingImage] = useState(false)

  const getCenterPosition = (): { x: number; y: number } => {
    let centerPosition: { x: number; y: number } = { x: CANVAS_CONSTANTS.DEFAULT_NODE_POSITION.x, y: CANVAS_CONSTANTS.DEFAULT_NODE_POSITION.y }

    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport()
      const bounds = document.querySelector('[data-testid="react-flow-canvas"]')?.getBoundingClientRect()

      if (bounds) {
        // Calculate the center of the visible viewport in flow coordinates
        const centerX = (bounds.width / 2 - viewport.x) / viewport.zoom
        const centerY = (bounds.height / 2 - viewport.y) / viewport.zoom
        centerPosition = { x: centerX, y: centerY }
      }
    }

    return centerPosition
  }

  const handleCreateSnippet = () => {
    setIsCreating(true)
    onCreateSnippet(getCenterPosition())
    setIsCreating(false)
  }

  const handleCreateVideoSnippet = () => {
    setIsCreatingVideo(true)
    onCreateVideoSnippet(getCenterPosition())
    setIsCreatingVideo(false)
  }

  const handleCreateImageSnippet = () => {
    setIsCreatingImage(true)
    onCreateImageSnippet(getCenterPosition())
    setIsCreatingImage(false)
  }

  return (
    <div
      className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200"
      data-testid="canvas-toolbar"
    >
      <div className="flex items-center p-2 space-x-2">
        {/* Create Snippet Button */}
        <button
          onClick={handleCreateSnippet}
          disabled={isCreating || isLoading}
          className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors"
          title="Create new snippet"
          data-testid="create-snippet"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {isCreating ? 'Creating...' : 'New Snippet'}
        </button>

        {/* Create Video Snippet Button */}
        <button
          onClick={handleCreateVideoSnippet}
          disabled={isCreatingVideo || isLoading}
          className="flex items-center px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded-md transition-colors"
          title="Create new video snippet"
          data-testid="create-video-snippet"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {isCreatingVideo ? 'Creating...' : 'Video Snippet'}
        </button>

        {/* Create Image Snippet Button */}
        <button
          onClick={handleCreateImageSnippet}
          disabled={isCreatingImage || isLoading}
          className="flex items-center px-3 py-2 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 rounded-md transition-colors"
          title="Create new image snippet"
          data-testid="create-image-snippet"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {isCreatingImage ? 'Creating...' : 'Image Snippet'}
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* Zoom to Fit Button */}
        <button
          onClick={onZoomToFit}
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          title="Zoom to fit all snippets"
          data-testid="zoom-reset"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        {/* Save Button */}
        <button
          onClick={onSaveCanvas}
          disabled={isLoading}
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-50 rounded-md transition-colors"
          title="Save canvas"
          data-testid="save-canvas"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        </button>

        {/* Help Button */}
        <button
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          title="Canvas help and shortcuts"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
