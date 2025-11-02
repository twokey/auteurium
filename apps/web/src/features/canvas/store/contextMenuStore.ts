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
  snippetIds: string[]
  position: ContextMenuPosition

  // Actions
  openContextMenu: (snippetIds: string[], position: ContextMenuPosition) => void
  closeContextMenu: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  // Initial State
  isOpen: false,
  snippetIds: [],
  position: {},

  // Actions
  openContextMenu: (snippetIds, position) =>
    set({ isOpen: true, snippetIds, position }),

  closeContextMenu: () =>
    set({ isOpen: false, snippetIds: [], position: {} }),
}))
