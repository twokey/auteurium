import { create } from 'zustand'

import type { ConnectedContentItem } from '../../../types/components'

type PromptDesignerMode = 'text' | 'image' | 'video'

interface PromptDesignerOpenPayload {
  snippetId: string
  snippetTitle?: string | null
  mode: PromptDesignerMode
  initialPrompt: string
  connectedContent?: ConnectedContentItem[]
  onGenerate?: (prompt: string) => Promise<void> | void
}

interface PromptDesignerState {
  isOpen: boolean
  isGenerating: boolean
  snippetId: string | null
  snippetTitle: string | null
  mode: PromptDesignerMode | null
  prompt: string
  connectedContent: ConnectedContentItem[]
  onGenerate: ((prompt: string) => Promise<void> | void) | null
  open: (payload: PromptDesignerOpenPayload) => void
  close: () => void
  setPrompt: (prompt: string) => void
  setGenerating: (isGenerating: boolean) => void
}

const INITIAL_STATE: Omit<
  PromptDesignerState,
  'open' | 'close' | 'setPrompt' | 'setGenerating'
> = {
  isOpen: false,
  isGenerating: false,
  snippetId: null,
  snippetTitle: null,
  mode: null,
  prompt: '',
  connectedContent: [],
  onGenerate: null
}

export const usePromptDesignerStore = create<PromptDesignerState>((set, get) => ({
  ...INITIAL_STATE,
  open: ({ snippetId, snippetTitle = null, mode, initialPrompt, connectedContent = [], onGenerate }) => {
    set({
      isOpen: true,
      isGenerating: false,
      snippetId,
      snippetTitle,
      mode,
      prompt: initialPrompt,
      connectedContent,
      onGenerate: onGenerate ?? null
    })
  },
  close: () => {
    const state = get()
    if (!state.isOpen && state.snippetId === null) {
      return
    }
    set(() => ({ ...INITIAL_STATE }))
  },
  setPrompt: (prompt) => {
    if (get().prompt === prompt) {
      return
    }
    set({ prompt })
  },
  setGenerating: (isGenerating) => {
    if (get().isGenerating === isGenerating) {
      return
    }
    set({ isGenerating })
  }
}))
