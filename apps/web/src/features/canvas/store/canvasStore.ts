/**
 * Canvas-specific state management
 * Manages ReactFlow nodes, edges, viewport, and canvas-level operations
 */

import { create } from 'zustand'
import type { Viewport } from 'reactflow'

interface CanvasState {
  // State
  projectId: string | null
  isLoading: boolean
  generatingImageSnippetIds: Record<string, boolean>
  viewport: Viewport | null
  selectedSnippetId: string | null

  // Actions
  setProjectId: (projectId: string | null) => void
  setLoading: (isLoading: boolean) => void
  setGeneratingImage: (snippetId: string, isGenerating: boolean) => void
  setViewport: (viewport: Viewport) => void
  setSelectedSnippetId: (id: string | null) => void
  saveViewportToStorage: (projectId: string, viewport: Viewport) => void
  loadViewportFromStorage: (projectId: string) => Viewport | null
  reset: () => void
}

const INITIAL_STATE = {
  projectId: null,
  isLoading: false,
  generatingImageSnippetIds: {},
  viewport: null,
  selectedSnippetId: null,
}

export const useCanvasStore = create<CanvasState>((set) => ({
  ...INITIAL_STATE,
  
  setProjectId: (projectId) =>
    set({ projectId }),
    
  setLoading: (isLoading) =>
    set({ isLoading }),
    
  setGeneratingImage: (snippetId, isGenerating) =>
    set((state) => {
      const newGeneratingIds = { ...state.generatingImageSnippetIds }
      if (isGenerating) {
        newGeneratingIds[snippetId] = true
      } else {
        delete newGeneratingIds[snippetId]
      }
      return { generatingImageSnippetIds: newGeneratingIds }
    }),
    
  setViewport: (viewport) =>
    set({ viewport }),

  setSelectedSnippetId: (id) =>
    set({ selectedSnippetId: id }),

  saveViewportToStorage: (projectId, viewport) => {
    try {
      localStorage.setItem(
        `canvas-viewport-${projectId}`,
        JSON.stringify(viewport)
      )
    } catch (error) {
      console.warn('Failed to save viewport to storage:', error)
    }
  },
  
  loadViewportFromStorage: (projectId) => {
    try {
      const saved = localStorage.getItem(`canvas-viewport-${projectId}`)
      if (saved) {
        const parsed = JSON.parse(saved) as unknown
        // Type guard for Viewport
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'x' in parsed &&
          'y' in parsed &&
          'zoom' in parsed &&
          typeof (parsed as { x: unknown }).x === 'number' &&
          typeof (parsed as { y: unknown }).y === 'number' &&
          typeof (parsed as { zoom: unknown }).zoom === 'number'
        ) {
          return parsed as Viewport
        }
      }
    } catch (error) {
      console.warn('Failed to load viewport from storage:', error)
    }
    return null
  },
  
  reset: () =>
    set(INITIAL_STATE),
}))

