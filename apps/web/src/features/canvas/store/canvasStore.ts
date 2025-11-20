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
  generatingVideoSnippetIds: Record<string, boolean>
  viewport: Viewport | null
  selectedSnippetIds: Set<string>

  // Actions
  setProjectId: (projectId: string | null) => void
  setLoading: (isLoading: boolean) => void
  setGeneratingImage: (snippetId: string, isGenerating: boolean) => void
  setGeneratingVideo: (snippetId: string, isGenerating: boolean) => void
  setViewport: (viewport: Viewport) => void
  setSelectedSnippetIds: (ids: Set<string>) => void
  addToSelection: (id: string) => void
  removeFromSelection: (id: string) => void
  clearSelection: () => void
  toggleSelection: (id: string) => void
  saveViewportToStorage: (projectId: string, viewport: Viewport) => void
  loadViewportFromStorage: (projectId: string) => Viewport | null
  reset: () => void
}

const INITIAL_STATE = {
  projectId: null,
  isLoading: false,
  generatingImageSnippetIds: {},
  generatingVideoSnippetIds: {},
  viewport: null,
  selectedSnippetIds: new Set<string>(),
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

  setGeneratingVideo: (snippetId, isGenerating) =>
    set((state) => {
      const newGeneratingIds = { ...state.generatingVideoSnippetIds }
      if (isGenerating) {
        newGeneratingIds[snippetId] = true
      } else {
        delete newGeneratingIds[snippetId]
      }
      return { generatingVideoSnippetIds: newGeneratingIds }
    }),
    
  setViewport: (viewport) =>
    set({ viewport }),

  setSelectedSnippetIds: (ids) =>
    set({ selectedSnippetIds: new Set(ids) }),

  addToSelection: (id) =>
    set((state) => {
      const newSelection = new Set(state.selectedSnippetIds)
      newSelection.add(id)
      return { selectedSnippetIds: newSelection }
    }),

  removeFromSelection: (id) =>
    set((state) => {
      const newSelection = new Set(state.selectedSnippetIds)
      newSelection.delete(id)
      return { selectedSnippetIds: newSelection }
    }),

  clearSelection: () =>
    set({ selectedSnippetIds: new Set<string>() }),

  toggleSelection: (id) =>
    set((state) => {
      const newSelection = new Set(state.selectedSnippetIds)
      if (newSelection.has(id)) {
        newSelection.delete(id)
      } else {
        newSelection.add(id)
      }
      return { selectedSnippetIds: newSelection }
    }),

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
