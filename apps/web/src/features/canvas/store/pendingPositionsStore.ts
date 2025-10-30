/**
 * Pending Positions Store
 * Manages snippet positions that are pending persistence to backend
 * Enables batching of rapid position updates (drag operations) before sending to AppSync
 */

import { create } from 'zustand'

interface PendingPosition {
  x: number
  y: number
}

interface PendingPositionsState {
  // Map of snippetId → pending position
  pendingPositions: Record<string, PendingPosition>

  // Add or update a pending position for a snippet
  addPendingPosition: (snippetId: string, position: PendingPosition) => void

  // Remove a snippet from pending positions (after mutation succeeds)
  clearPendingPosition: (snippetId: string) => void

  // Get all pending positions (for batch mutation)
  getPendingPositions: () => Record<string, PendingPosition>

  // Clear all pending positions
  clearAll: () => void
}

export const usePendingPositionsStore = create<PendingPositionsState>((set, get) => ({
  pendingPositions: {},

  addPendingPosition: (snippetId, position) =>
    set((state) => ({
      pendingPositions: {
        ...state.pendingPositions,
        [snippetId]: position
      }
    })),

  clearPendingPosition: (snippetId) =>
    set((state) => {
      const { [snippetId]: _removed, ...remaining } = state.pendingPositions
      return { pendingPositions: remaining }
    }),

  getPendingPositions: () => get().pendingPositions,

  clearAll: () => set({ pendingPositions: {} })
}))
