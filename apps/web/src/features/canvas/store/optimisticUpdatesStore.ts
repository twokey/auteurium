/**
 * Optimistic Updates Store
 * Manages temporary snippets during create/delete operations for instant UI feedback
 */

import { create } from 'zustand'
import type { Snippet } from '../../../types'

interface OptimisticSnippet {
  id: string
  projectId: string
  title: string
  textField1: string
  position: { x: number; y: number }
  tags: string[]
  categories: string[]
  connections: []
  createdAt: string
  updatedAt: string
  version: number
  isOptimistic: true
}

interface OptimisticUpdatesState {
  // Optimistic snippets being created (keyed by temporary ID)
  optimisticSnippets: Record<string, OptimisticSnippet>

  // Real snippets that replaced optimistic ones (keyed by real ID)
  realSnippets: Record<string, Snippet>

  // Mapping from temp ID to real ID
  tempToRealIdMap: Record<string, string>

  // Snippets currently being deleted (optimistic, waiting for server)
  deletingSnippets: Set<string>

  // Snippets confirmed deleted by server (keep hidden permanently)
  deletedSnippets: Set<string>

  // Add optimistic snippet
  addOptimisticSnippet: (snippet: OptimisticSnippet) => void

  // Replace optimistic snippet with real one (after server confirmation)
  replaceOptimisticSnippet: (tempId: string, realSnippet: Snippet) => void

  // Remove optimistic snippet (if creation failed)
  removeOptimisticSnippet: (tempId: string) => void

  // Mark snippet as being deleted
  markSnippetDeleting: (snippetId: string) => void

  // Confirm deletion (move to deleted set, keep hidden)
  confirmDeletion: (snippetId: string) => void

  // Rollback deletion (if failed)
  rollbackDeletion: (snippetId: string) => void

  // Update stored real snippet
  updateRealSnippet: (snippet: Snippet) => void

  // Clear real snippets store (call after refetch completes)
  clearRealSnippets: () => void

  // Clear all optimistic updates
  clearAll: () => void
}

export const useOptimisticUpdatesStore = create<OptimisticUpdatesState>((set) => ({
  optimisticSnippets: {},
  realSnippets: {},
  tempToRealIdMap: {},
  deletingSnippets: new Set(),
  deletedSnippets: new Set(),

  addOptimisticSnippet: (snippet) => set((state) => ({
    optimisticSnippets: {
      ...state.optimisticSnippets,
      [snippet.id]: snippet
    }
  })),

  replaceOptimisticSnippet: (tempId, realSnippet) => set((state) => {
    const { [tempId]: removed, ...remainingOptimistic } = state.optimisticSnippets
    return {
      optimisticSnippets: remainingOptimistic,
      realSnippets: {
        ...state.realSnippets,
        [realSnippet.id]: realSnippet
      },
      tempToRealIdMap: {
        ...state.tempToRealIdMap,
        [tempId]: realSnippet.id
      }
    }
  }),

  removeOptimisticSnippet: (tempId) => set((state) => {
    const { [tempId]: removed, ...remaining } = state.optimisticSnippets
    return {
      optimisticSnippets: remaining
    }
  }),

  markSnippetDeleting: (snippetId) => set((state) => ({
    deletingSnippets: new Set(state.deletingSnippets).add(snippetId)
  })),

  confirmDeletion: (snippetId) => set((state) => {
    const newDeletingSet = new Set(state.deletingSnippets)
    newDeletingSet.delete(snippetId)

    const newDeletedSet = new Set(state.deletedSnippets)
    newDeletedSet.add(snippetId)

    return {
      deletingSnippets: newDeletingSet,
      deletedSnippets: newDeletedSet
    }
  }),

  rollbackDeletion: (snippetId) => set((state) => {
    const newSet = new Set(state.deletingSnippets)
    newSet.delete(snippetId)
    return { deletingSnippets: newSet }
  }),

  updateRealSnippet: (snippet) => set((state) => ({
    realSnippets: {
      ...state.realSnippets,
      [snippet.id]: snippet
    }
  })),

  clearRealSnippets: () => set({
    realSnippets: {}
  }),

  clearAll: () => set({
    optimisticSnippets: {},
    realSnippets: {},
    tempToRealIdMap: {},
    deletingSnippets: new Set(),
    deletedSnippets: new Set()
  })
}))
