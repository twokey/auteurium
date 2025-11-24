import { create } from 'zustand';

export interface VideoModelSettings {
  model: string;
  duration: number;
  resolution: string;
  audio: boolean;
  voiceId?: string;
  seed?: number;
  movementAmplitude: string;
  offPeak: boolean;
}

interface VideoPromptState {
  // Active snippet tracking
  activeSnippetId: string | null;

  // Model settings
  modelSettings: VideoModelSettings;

  // Prompt preview
  combinedPrompt: string;

  // Reference images
  referenceImages: { url: string; snippetId: string; snippetTitle?: string }[];

  // Actions
  setActiveSnippet: (snippetId: string | null) => void;
  updateModelSettings: (settings: Partial<VideoModelSettings>) => void;
  updateCombinedPrompt: (prompt: string) => void;
  updateReferenceImages: (images: { url: string; snippetId: string; snippetTitle?: string }[]) => void;
  clearActive: () => void;
}

export const DEFAULT_SETTINGS: VideoModelSettings = {
  model: 'vidu-q2',
  duration: 4,
  resolution: '720p',
  audio: false,
  movementAmplitude: 'auto',
  offPeak: false,
};

export const useVideoPromptStore = create<VideoPromptState>((set) => ({
  // Initial state
  activeSnippetId: null,
  modelSettings: DEFAULT_SETTINGS,
  combinedPrompt: '',
  referenceImages: [],

  // Actions
  setActiveSnippet: (snippetId) => {
    set({
      activeSnippetId: snippetId,
    });
  },

  updateModelSettings: (settings) => {
    set((state) => ({
      modelSettings: {
        ...state.modelSettings,
        ...settings,
      },
    }));
  },

  updateCombinedPrompt: (prompt) => {
    set({ combinedPrompt: prompt });
  },

  updateReferenceImages: (images) => {
    set({ referenceImages: images });
  },

  clearActive: () => {
    set({
      activeSnippetId: null,
      combinedPrompt: '',
      referenceImages: [],
      modelSettings: DEFAULT_SETTINGS,
    });
  },
}));
