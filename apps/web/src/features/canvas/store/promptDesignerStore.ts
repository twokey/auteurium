import { create } from 'zustand'

import type { ConnectedContentItem } from '../../../types/components'
import { IMAGE_GENERATION } from '../../../constants'
import { DEFAULT_SETTINGS, type VideoModelSettings } from '../../snippets/store/videoPromptStore'

type PromptDesignerMode = 'text' | 'image' | 'video' | 'scenes'

export interface TextModelSettings {
  model: string
}

export interface ImageModelSettings {
  model: string
  aspectRatio: string
  numberOfImages: number
}

export type PromptDesignerGenerationSettings =
  | {
    type: 'video'
    settings: VideoModelSettings
  }
  | {
    type: 'image'
    settings: ImageModelSettings
  }
  | {
    type: 'text'
    settings: TextModelSettings
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
  updateGenerationSettings: (
    settings: Partial<VideoModelSettings> | Partial<ImageModelSettings> | Partial<TextModelSettings>
  ) => void
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
    } else if (!initialSettings && mode === 'image') {
      initialSettings = {
        type: 'image',
        settings: {
          model: IMAGE_GENERATION.DEFAULT_MODEL,
          aspectRatio: '16:9',
          numberOfImages: 1
        }
      }
    } else if (!initialSettings && mode === 'text') {
      initialSettings = {
        type: 'text',
        settings: {
          model: ''
        }
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
  updateGenerationSettings: (newSettings) =>
    set((state) => {
      if (!state.generationSettings) return {}
      return {
        generationSettings: {
          ...state.generationSettings,
          settings: {
            ...state.generationSettings.settings,
            ...newSettings
          }
        } as PromptDesignerGenerationSettings
      }
    })
}))
