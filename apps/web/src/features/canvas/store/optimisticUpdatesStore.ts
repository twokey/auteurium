/**
 * Optimistic Updates Store
 * Manages temporary snippets and connections during create/delete operations for instant UI feedback
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

interface OptimisticConnection {
  id: string
  projectId: string
  sourceSnippetId: string
  targetSnippetId: string
  label?: string | null
  createdAt: string
  updatedAt?: string // Optional to match Connection type
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

  // Optimistic connections being created (keyed by temporary ID)
  optimisticConnections: Record<string, OptimisticConnection>

  // Connections currently being deleted (optimistic, waiting for server)
  deletingConnections: Set<string>

  // Connections confirmed deleted by server (keep hidden permanently)
  deletedConnections: Set<string>

  // Snippets with local unsaved drafts (user editing)
  dirtySnippets: Set<string>

  // Snippets currently saving (mutation in-flight)
  savingSnippets: Set<string>

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

  // Add optimistic connection
  addOptimisticConnection: (connection: OptimisticConnection) => void

  // Remove optimistic connection (if creation failed)
  removeOptimisticConnection: (tempId: string) => void

  // Mark connection as being deleted
  markConnectionDeleting: (connectionId: string) => void

  // Confirm connection deletion (move to deleted set, keep hidden)
  confirmConnectionDeletion: (connectionId: string) => void

  // Rollback connection deletion (if failed)
  rollbackConnectionDeletion: (connectionId: string) => void

  // Mark snippet as having unsaved local draft
  markSnippetDirty: (snippetId: string) => void

  // Unmark snippet as dirty (user saved or discarded draft)
  clearSnippetDirty: (snippetId: string) => void

  // Mark snippet as currently saving (mutation in-flight)
  markSnippetSaving: (snippetId: string) => void

  // Clear saving state (mutation completed or failed)
  clearSnippetSaving: (snippetId: string) => void

  // Clear all optimistic updates
  clearAll: () => void
}

export const useOptimisticUpdatesStore = create<OptimisticUpdatesState>((set) => ({
  optimisticSnippets: {},
  realSnippets: {},
  tempToRealIdMap: {},
  deletingSnippets: new Set(),
  deletedSnippets: new Set(),
  optimisticConnections: {},
  deletingConnections: new Set(),
  deletedConnections: new Set(),
  dirtySnippets: new Set(),
  savingSnippets: new Set(),

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

  addOptimisticConnection: (connection) => set((state) => ({
    optimisticConnections: {
      ...state.optimisticConnections,
      [connection.id]: connection
    }
  })),

  removeOptimisticConnection: (tempId) => set((state) => {
    const { [tempId]: removed, ...remaining } = state.optimisticConnections
    return {
      optimisticConnections: remaining
    }
  }),

  markConnectionDeleting: (connectionId) => set((state) => ({
    deletingConnections: new Set(state.deletingConnections).add(connectionId)
  })),

  confirmConnectionDeletion: (connectionId) => set((state) => {
    const newDeletingSet = new Set(state.deletingConnections)
    newDeletingSet.delete(connectionId)

    const newDeletedSet = new Set(state.deletedConnections)
    newDeletedSet.add(connectionId)

    return {
      deletingConnections: newDeletingSet,
      deletedConnections: newDeletedSet
    }
  }),

  rollbackConnectionDeletion: (connectionId) => set((state) => {
    const newSet = new Set(state.deletingConnections)
    newSet.delete(connectionId)
    return { deletingConnections: newSet }
  }),

  markSnippetDirty: (snippetId) =>
    set((state) => ({
      dirtySnippets: new Set(state.dirtySnippets).add(snippetId)
    })),

  clearSnippetDirty: (snippetId) =>
    set((state) => {
      const newSet = new Set(state.dirtySnippets)
      newSet.delete(snippetId)
      return { dirtySnippets: newSet }
    }),

  markSnippetSaving: (snippetId) =>
    set((state) => ({
      savingSnippets: new Set(state.savingSnippets).add(snippetId)
    })),

  clearSnippetSaving: (snippetId) =>
    set((state) => {
      const newSet = new Set(state.savingSnippets)
      newSet.delete(snippetId)
      return { savingSnippets: newSet }
    }),

  clearAll: () => set({
    optimisticSnippets: {},
    realSnippets: {},
    tempToRealIdMap: {},
    deletingSnippets: new Set(),
    deletedSnippets: new Set(),
    optimisticConnections: {},
    deletingConnections: new Set(),
    deletedConnections: new Set(),
    dirtySnippets: new Set(),
    savingSnippets: new Set()
  })
}))
