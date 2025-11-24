import { create } from 'zustand'

import type { ConnectedContentItem } from '../../../types/components'
import { DEFAULT_SETTINGS, type VideoModelSettings } from '../../snippets/store/videoPromptStore'

type PromptDesignerMode = 'text' | 'image' | 'video' | 'scenes'

export type PromptDesignerGenerationSettings =
  | {
    type: 'video'
    settings: VideoModelSettings
  }

export interface PromptDesignerGeneratePayload {
  fullPrompt: string
  userPrompt: string
  systemPrompt: string
  settings?: PromptDesignerGenerationSettings | null
}

interface PromptDesignerOpenPayload {
  snippetId: string
  snippetTitle?: string | null
  mode: PromptDesignerMode
  initialPrompt: string
  initialSystemPrompt?: string
  connectedContent?: ConnectedContentItem[]
  onGenerate?: (payload: PromptDesignerGeneratePayload) => Promise<void> | void
  generationSettings?: PromptDesignerGenerationSettings | null
}

interface PromptDesignerState {
  isOpen: boolean
  isGenerating: boolean
  snippetId: string | null
  snippetTitle: string | null
  mode: PromptDesignerMode | null
  prompt: string
  systemPrompt: string
  connectedContent: ConnectedContentItem[]
  generationSettings: PromptDesignerGenerationSettings | null
  onGenerate: ((payload: PromptDesignerGeneratePayload) => Promise<void> | void) | null
  open: (payload: PromptDesignerOpenPayload) => void
  close: () => void
  setPrompt: (prompt: string) => void
  setSystemPrompt: (prompt: string) => void
  setGenerating: (isGenerating: boolean) => void
  updateGenerationSettings: (settings: Partial<VideoModelSettings>) => void
  lastOpenedAt: number | null
}

const INITIAL_STATE: Omit<
  PromptDesignerState,
  'open' | 'close' | 'setPrompt' | 'setSystemPrompt' | 'setGenerating' | 'updateGenerationSettings'
> = {
  isOpen: false,
  isGenerating: false,
  snippetId: null,
  snippetTitle: null,
  mode: null,
  prompt: '',
  systemPrompt: '',
  connectedContent: [],
  generationSettings: null,
  onGenerate: null,
  lastOpenedAt: null
}

export const usePromptDesignerStore = create<PromptDesignerState>((set, get) => ({
  ...INITIAL_STATE,
  open: ({
    snippetId,
    snippetTitle = null,
    mode,
    initialPrompt,
    initialSystemPrompt,
    connectedContent = [],
    onGenerate,
    generationSettings = null
  }) => {
    let initialSettings = generationSettings
    if (!initialSettings && mode === 'video') {
      initialSettings = {
        type: 'video',
        settings: DEFAULT_SETTINGS
      }
    }

    set({
      isOpen: true,
      isGenerating: false,
      snippetId,
      snippetTitle,
      mode,
      prompt: initialPrompt,
      systemPrompt: initialSystemPrompt ?? '',
      connectedContent,
      generationSettings: initialSettings,
      onGenerate: onGenerate ?? null,
      lastOpenedAt: Date.now()
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
  setSystemPrompt: (prompt) => {
    if (get().systemPrompt === prompt) {
      return
    }
    set({ systemPrompt: prompt })
  },
  setGenerating: (isGenerating) => {
    set({ isGenerating })
  },
  updateGenerationSettings: (settings) => {
    set((state) => {
      if (!state.generationSettings || state.generationSettings.type !== 'video') {
        return state
      }
      return {
        generationSettings: {
          ...state.generationSettings,
          settings: {
            ...state.generationSettings.settings,
            ...settings
          }
        }
      }
    })
  }
}))
