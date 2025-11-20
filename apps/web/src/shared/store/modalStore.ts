/**
 * Centralized modal state management using Zustand
 * Replaces multiple useState hooks for modal management
 */

import { create } from 'zustand'

import type { Snippet } from '../../types'

interface ModalState {
  // Edit Snippet Modal
  editSnippet: {
    isOpen: boolean
    snippet: Snippet | null
  }
  
  // Delete Snippet Modal
  deleteSnippet: {
    isOpen: boolean
    snippet: Snippet | null
  }

  // Delete Multiple Snippets Modal
  deleteMultipleSnippets: {
    isOpen: boolean
    snippets: Snippet[]
    projectId: string | null
  }

  // Manage Connections Modal
  manageConnections: {
    isOpen: boolean
    snippet: Snippet | null
  }
  
  // Version History Modal
  versionHistory: {
    isOpen: boolean
    snippet: Snippet | null
  }
  
  // Generated Snippet Preview Modal
  generatedSnippetPreview: {
    isOpen: boolean
    sourceSnippetId: string | null
    content: string
    isCreating: boolean
  }
  
  // Actions
  openEditSnippet: (snippet: Snippet) => void
  closeEditSnippet: () => void
  
  openDeleteSnippet: (snippet: Snippet) => void
  closeDeleteSnippet: () => void

  openDeleteMultipleSnippets: (snippets: Snippet[], projectId: string) => void
  closeDeleteMultipleSnippets: () => void

  openManageConnections: (snippet: Snippet) => void
  closeManageConnections: () => void
  
  openVersionHistory: (snippet: Snippet) => void
  closeVersionHistory: () => void
  
  openGeneratedSnippetPreview: (sourceSnippetId: string, content: string) => void
  closeGeneratedSnippetPreview: () => void
  setGeneratedSnippetCreating: (isCreating: boolean) => void
  
  closeAllModals: () => void
}

export const useModalStore = create<ModalState>((set) => ({
  // Initial State
  editSnippet: {
    isOpen: false,
    snippet: null,
  },
  
  deleteSnippet: {
    isOpen: false,
    snippet: null,
  },

  deleteMultipleSnippets: {
    isOpen: false,
    snippets: [],
    projectId: null,
  },

  manageConnections: {
    isOpen: false,
    snippet: null,
  },
  
  versionHistory: {
    isOpen: false,
    snippet: null,
  },
  
  generatedSnippetPreview: {
    isOpen: false,
    sourceSnippetId: null,
    content: '',
    isCreating: false,
  },
  
  // Actions
  openEditSnippet: (snippet) =>
    set({ editSnippet: { isOpen: true, snippet } }),
    
  closeEditSnippet: () =>
    set({ 
      editSnippet: { isOpen: false, snippet: null },
      generatedSnippetPreview: { isOpen: false, sourceSnippetId: null, content: '', isCreating: false }
    }),
    
  openDeleteSnippet: (snippet) =>
    set({ deleteSnippet: { isOpen: true, snippet } }),
    
  closeDeleteSnippet: () =>
    set({ deleteSnippet: { isOpen: false, snippet: null } }),

  openDeleteMultipleSnippets: (snippets, projectId) =>
    set({ deleteMultipleSnippets: { isOpen: true, snippets, projectId } }),

  closeDeleteMultipleSnippets: () =>
    set({ deleteMultipleSnippets: { isOpen: false, snippets: [], projectId: null } }),

  openManageConnections: (snippet) =>
    set({ manageConnections: { isOpen: true, snippet } }),
    
  closeManageConnections: () =>
    set({ manageConnections: { isOpen: false, snippet: null } }),
    
  openVersionHistory: (snippet) =>
    set({ versionHistory: { isOpen: true, snippet } }),
    
  closeVersionHistory: () =>
    set({ versionHistory: { isOpen: false, snippet: null } }),
    
  openGeneratedSnippetPreview: (sourceSnippetId, content) =>
    set({ 
      generatedSnippetPreview: { 
        isOpen: true, 
        sourceSnippetId, 
        content,
        isCreating: false
      } 
    }),
    
  closeGeneratedSnippetPreview: () =>
    set({ 
      generatedSnippetPreview: { 
        isOpen: false, 
        sourceSnippetId: null, 
        content: '',
        isCreating: false
      } 
    }),
    
  setGeneratedSnippetCreating: (isCreating) =>
    set((state) => ({
      generatedSnippetPreview: {
        ...state.generatedSnippetPreview,
        isCreating
      }
    })),
    
  closeAllModals: () =>
    set({
      editSnippet: { isOpen: false, snippet: null },
      deleteSnippet: { isOpen: false, snippet: null },
      deleteMultipleSnippets: { isOpen: false, snippets: [], projectId: null },
      manageConnections: { isOpen: false, snippet: null },
      versionHistory: { isOpen: false, snippet: null },
      generatedSnippetPreview: { isOpen: false, sourceSnippetId: null, content: '', isCreating: false },
    }),
}))



