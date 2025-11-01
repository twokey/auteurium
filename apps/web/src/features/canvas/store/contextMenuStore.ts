/**
 * Context menu state management using Zustand
 * Manages the visibility and positioning of the snippet context menu
 */

import { create } from 'zustand'

interface ContextMenuPosition {
  top?: number
  left?: number
  right?: number
  bottom?: number
}

interface ContextMenuState {
  isOpen: boolean
  snippetId: string | null
  position: ContextMenuPosition

  // Actions
  openContextMenu: (snippetId: string, position: ContextMenuPosition) => void
  closeContextMenu: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  // Initial State
  isOpen: false,
  snippetId: null,
  position: {},

  // Actions
  openContextMenu: (snippetId, position) =>
    set({ isOpen: true, snippetId, position }),

  closeContextMenu: () =>
    set({ isOpen: false, snippetId: null, position: {} }),
}))
