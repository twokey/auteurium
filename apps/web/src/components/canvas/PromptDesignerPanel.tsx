import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { CANVAS_CONSTANTS, VIDEO_GENERATION } from '../../constants'
import { usePromptDesignerStore } from '../../features/canvas/store/promptDesignerStore'
import { useToast } from '../../store/toastStore'
import {
  CAPABILITY_LABELS,
  VIDU_Q2_MODEL_CONFIG,
  calculatePricing,
  determineCapability,
  formatUsd,
  getPricingDefinition,
  isResolutionOption,
  type ResolutionOption
} from '../snippets/videoPromptUtils'
import rawSystemPrompts from '../../../../../system-prompts.md?raw'

const MODE_LABEL: Record<'text' | 'image' | 'video' | 'scenes', string> = {
  text: 'Text generation',
  image: 'Image generation',
  video: 'Video generation',
  scenes: 'Scene generation'
}

// Available voice IDs (placeholder - should be loaded from API or constants)
const VOICE_IDS = [
  { id: 'voice_1', name: 'Voice 1 - Natural' },
  { id: 'voice_2', name: 'Voice 2 - Energetic' },
  { id: 'voice_3', name: 'Voice 3 - Calm' },
]

const extractSystemPromptSection = (raw: string, heading: string, fallback: string) => {
  const pattern = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i')
  const match = raw.match(pattern)
  const content = match?.[1]?.trim()
  return content && content.length > 0 ? content : fallback
}

export interface PromptDesignerPanelProps {
  width?: number
  style?: CSSProperties
}

export const PromptDesignerPanel = ({ width, style }: PromptDesignerPanelProps) => {
  const toast = useToast()

  const isOpen = usePromptDesignerStore((state) => state.isOpen)
  const isGenerating = usePromptDesignerStore((state) => state.isGenerating)
  const snippetId = usePromptDesignerStore((state) => state.snippetId)
  const snippetTitle = usePromptDesignerStore((state) => state.snippetTitle)
  const mode = usePromptDesignerStore((state) => state.mode)
  const prompt = usePromptDesignerStore((state) => state.prompt)
  const systemPrompt = usePromptDesignerStore((state) => state.systemPrompt)
  const connectedContent = usePromptDesignerStore((state) => state.connectedContent)
  const generationSettings = usePromptDesignerStore((state) => state.generationSettings)
  const onGenerate = usePromptDesignerStore((state) => state.onGenerate)
  const close = usePromptDesignerStore((state) => state.close)
  const setPrompt = usePromptDesignerStore((state) => state.setPrompt)
  const setSystemPrompt = usePromptDesignerStore((state) => state.setSystemPrompt)
  const setGenerating = usePromptDesignerStore((state) => state.setGenerating)
  const updateGenerationSettings = usePromptDesignerStore((state) => state.updateGenerationSettings)

  const [isEditing, setIsEditing] = useState(false)
  const [isSystemPromptEditing, setIsSystemPromptEditing] = useState(false)
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true)
  const [isReferenceImagesExpanded, setIsReferenceImagesExpanded] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const systemPromptRef = useRef<HTMLTextAreaElement | null>(null)

  const { scenesPromptText, shotsPromptText } = useMemo(() => ({
    scenesPromptText: extractSystemPromptSection(
      rawSystemPrompts,
      'Scenes',
      'Placeholder scene system prompt. Replace with the real content once available.'
    ),
    shotsPromptText: extractSystemPromptSection(
      rawSystemPrompts,
      'Shots',
      'Placeholder shot system prompt. Replace with the real content once available.'
    )
  }), [])

  useEffect(() => {
    if (!isOpen) {
      if (isEditing) {
        setIsEditing(false)
      }
      if (isSystemPromptEditing) {
        setIsSystemPromptEditing(false)
      }
    }
  }, [isOpen, isEditing, isSystemPromptEditing])

  useEffect(() => {
    if (!isOpen || !isEditing) {
      return
    }

    const target = textareaRef.current
    target?.focus()
    const length = target?.value.length ?? 0
    target?.setSelectionRange(length, length)
  }, [isOpen, isEditing])

  useEffect(() => {
    if (!isOpen || !isSystemPromptEditing) {
      return
    }

    const target = systemPromptRef.current
    target?.focus()
    const length = target?.value.length ?? 0
    target?.setSelectionRange(length, length)
  }, [isOpen, isSystemPromptEditing])

  const headerSubtitle = useMemo(() => {
    if (!mode) {
      return null
    }

    return MODE_LABEL[mode]
  }, [mode])

  const generationSettingsEntries = useMemo(() => {
    if (generationSettings?.type !== 'video') {
      return null
    }

    const { settings } = generationSettings
    const selectedModelId = VIDU_Q2_MODEL_CONFIG[settings.model] ? settings.model : VIDEO_GENERATION.DEFAULT_MODEL
    const modelConfig = VIDU_Q2_MODEL_CONFIG[selectedModelId]

    // Ensure valid settings
    const activeDuration = modelConfig.durations.includes(settings.duration)
      ? settings.duration
      : modelConfig.defaultDuration

    const sanitizedResolution = isResolutionOption(settings.resolution)
      ? settings.resolution
      : modelConfig.defaultResolution
    const activeResolution = modelConfig.resolutions.includes(sanitizedResolution)
      ? sanitizedResolution
      : modelConfig.defaultResolution

    // Calculate pricing
    const hasReferenceImages = connectedContent.some(c => c.type === 'image')
    const capability = determineCapability(modelConfig, hasReferenceImages)
    const pricingDefinition = getPricingDefinition(modelConfig, capability, activeResolution)

    const pricingSummary = pricingDefinition
      ? calculatePricing(activeDuration, pricingDefinition)
      : null

    const appliedCredits = pricingSummary
      ? pricingSummary.standardCredits
      : null
    const appliedUsd = pricingSummary
      ? pricingSummary.standardUsd
      : null

    return {
      modelConfig,
      activeDuration,
      activeResolution,
      pricingSummary,
      appliedCredits,
      appliedUsd,
      capabilityLabel: CAPABILITY_LABELS[capability]
    }
  }, [generationSettings, connectedContent])

  const sanitizedSnippetTitle = snippetTitle?.trim() ?? ''
  const shouldRenderSource = sanitizedSnippetTitle !== '' ? true : Boolean(snippetId)

  // Separate content types
  const textContent = useMemo(() => connectedContent.filter(c => c.type === 'text'), [connectedContent])
  const referenceImages = useMemo(() => connectedContent.filter(c => c.type === 'image'), [connectedContent])
  const videoContent = useMemo(() => connectedContent.filter(c => c.type === 'video'), [connectedContent])

  if (!isOpen) {
    return null
  }

  const handleApplySystemPrompt = (value: string) => {
    setSystemPrompt(value)
    setIsSystemPromptEditing(false)
  }

  const handleGenerate = async () => {
    if (!onGenerate) {
      toast.info('This generation flow is not available yet.')
      return
    }

    setGenerating(true)
    try {
      // Compute final prompt from connected content + snippet text
      const lines = connectedContent
        .map((item) => {
          const value = item.value?.trim()
          if (!value) {
            return null
          }

          return value
        })
        .filter((line): line is string => Boolean(line))

      const connectedText = lines.join(' ')
      const currentText = prompt.trim()

      const promptPreview = [connectedText, currentText].filter(Boolean).join(' ')
      const systemPromptText = systemPrompt.trim()
      const finalTextPrompt = [systemPromptText, promptPreview].filter(Boolean).join('\n\n')

      console.log('LLM prompt:', finalTextPrompt)
      console.log('LLM payload:', {
        prompt: finalTextPrompt,
        settings: generationSettings
      })

      await Promise.resolve(onGenerate({
        fullPrompt: finalTextPrompt,
        userPrompt: promptPreview,
        systemPrompt: systemPromptText,
        settings: generationSettings
      }))
      close()
    } catch (error) {
      console.error('Prompt designer generation failed:', error)
      const isHandled =
        typeof error === 'object' &&
        error !== null &&
        'handled' in (error as Record<string, unknown>) &&
        Boolean((error as { handled?: boolean }).handled)
      if (!isHandled) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        toast.error('Failed to generate content', message)
      }
    } finally {
      setGenerating(false)
    }
  }

  // Calculate dynamic width based on snippet width
  // Default to the canvas column width if no width provided
  const panelWidth = width ?? CANVAS_CONSTANTS.COLUMN_WIDTH

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white shadow-lg origin-top-left"
      style={{
        width: panelWidth,
        position: 'absolute',
        animation: 'fadeIn 0.2s ease-out',
        ...style
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div className="flex items-start justify-between border-b border-gray-200 px-3 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight">Prompt designer</h3>
          {headerSubtitle && (
            <p className="text-[11px] font-medium text-purple-600 uppercase tracking-wide mt-0.5">
              {headerSubtitle}
            </p>
          )}
          {shouldRenderSource && (
            <p className="text-xs text-gray-500 mt-1 truncate" title={snippetTitle ?? snippetId ?? ''}>
              Source: {sanitizedSnippetTitle !== '' ? sanitizedSnippetTitle : 'Untitled'}
              {snippetId ? ` (${snippetId})` : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close prompt designer"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="px-3 py-3">
        {/* Generate Button moved to top */}
        <button
          type="button"
          onClick={() => {
            void handleGenerate()
          }}
          disabled={isGenerating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300 mb-3"
        >
          {isGenerating ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </>
          ) : (
            'Generate'
          )}
        </button>

        {/* Settings Section */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
            className="flex w-full items-center justify-between mb-1 group"
          >
            <p className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 group-hover:text-gray-700">
              Settings
            </p>
            <svg
              className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isSettingsExpanded ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {isSettingsExpanded && (
            <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-2">
              {/* Model Selection */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Model
                </label>
                <select
                  value={generationSettings?.settings.model ?? ''}
                  onChange={(e) => {
                    const newModel = e.target.value
                    if (generationSettings?.type === 'video') {
                      const nextConfig = VIDU_Q2_MODEL_CONFIG[newModel] ?? generationSettingsEntries?.modelConfig
                      updateGenerationSettings({
                        model: newModel,
                        duration: nextConfig?.defaultDuration,
                        resolution: nextConfig?.defaultResolution
                      })
                    }
                  }}
                  className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {Object.values(VIDU_Q2_MODEL_CONFIG).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {generationSettingsEntries && (
                  <p className="mt-1 text-[10px] text-gray-500">
                    {generationSettingsEntries.modelConfig.description}
                  </p>
                )}
              </div>

              {/* Video Specific Settings */}
              {generationSettingsEntries && generationSettings?.type === 'video' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Duration */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Duration
                      </label>
                      <select
                        value={generationSettingsEntries.activeDuration}
                        onChange={(e) => updateGenerationSettings({ duration: Number(e.target.value) })}
                        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        {generationSettingsEntries.modelConfig.durations.map((duration) => (
                          <option key={duration} value={duration}>
                            {duration}s
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Resolution */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Resolution
                      </label>
                      <select
                        value={generationSettingsEntries.activeResolution}
                        onChange={(e) => updateGenerationSettings({ resolution: e.target.value as ResolutionOption })}
                        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        {generationSettingsEntries.modelConfig.resolutions.map((resolution) => (
                          <option key={resolution} value={resolution}>
                            {resolution}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Movement & Audio */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Movement
                      </label>
                      <select
                        value={generationSettings.settings.movementAmplitude ?? 'auto'}
                        onChange={(e) => updateGenerationSettings({ movementAmplitude: e.target.value })}
                        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="auto">Auto</option>
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>

                    <div className="flex items-end pb-1">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={generationSettings.settings.audio}
                          onChange={(e) => updateGenerationSettings({ audio: e.target.checked })}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                        />
                        <span className="text-xs font-medium text-gray-700">Audio</span>
                      </label>
                    </div>
                  </div>

                  {/* Voice Selection (if Audio enabled) */}
                  {generationSettings.settings.audio && (
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Voice
                      </label>
                      <select
                        value={generationSettings.settings.voiceId ?? ''}
                        onChange={(e) => updateGenerationSettings({ voiceId: e.target.value })}
                        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Select voice...</option>
                        {VOICE_IDS.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Cost Preview */}
                  {generationSettingsEntries.pricingSummary && (
                    <div className="mt-2 rounded border border-purple-100 bg-purple-50 px-2 py-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-medium text-purple-900">Estimated Cost</span>
                        <span className="font-bold text-purple-700">
                          {generationSettingsEntries.appliedCredits} credits
                          <span className="text-purple-400 mx-1">·</span>
                          {generationSettingsEntries.appliedUsd !== null ? formatUsd(generationSettingsEntries.appliedUsd) : '—'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Reference Images Section */}
        {referenceImages.length > 0 && generationSettingsEntries && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setIsReferenceImagesExpanded(!isReferenceImagesExpanded)}
              className="flex w-full items-center justify-between mb-1 group"
            >
              <div className="flex items-center gap-2">
                <p className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 group-hover:text-gray-700">
                  Reference Images
                </p>
                <span className="text-[10px] text-gray-500">
                  {referenceImages.length} / {generationSettingsEntries.modelConfig.maxReferenceImages}
                </span>
              </div>
              <svg
                className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isReferenceImagesExpanded ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isReferenceImagesExpanded && (
              <>
                <div className="grid grid-cols-3 gap-2 rounded-md border border-gray-200 bg-gray-50 p-2">
                  {referenceImages.slice(0, generationSettingsEntries.modelConfig.maxReferenceImages).map((item, index) => (
                    <div key={`ref-img-${index}`} className="relative aspect-square">
                      <img
                        src={item.value}
                        alt={item.snippetTitle || `Reference ${index + 1}`}
                        className="w-full h-full object-cover rounded border border-gray-200"
                      />
                    </div>
                  ))}
                </div>
                {referenceImages.length > generationSettingsEntries.modelConfig.maxReferenceImages && (
                  <p className="text-[10px] text-red-500 mt-1">
                    Warning: Only first {generationSettingsEntries.modelConfig.maxReferenceImages} images will be used
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Content Section (Text & Video) */}
        {(textContent.length > 0 || videoContent.length > 0) && (
          <div className="mb-3">
            <p className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Content
            </p>
            <div className="mt-1 space-y-2">
              {[...textContent, ...videoContent].map((item, index) => {
                const connectedTitle = item.snippetTitle?.trim() ?? ''
                return (
                  <div key={`connected-${item.snippetId}-${index}-${item.type}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[10px] text-gray-500 font-medium">
                        {connectedTitle !== '' ? connectedTitle : 'Snippet'}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        #{item.snippetId.slice(0, 8)}
                      </p>
                    </div>
                    <div className="overflow-hidden rounded border border-gray-200 bg-gray-50">
                      {item.type === 'text' ? (
                        <p className="px-2 py-1 text-sm font-medium text-gray-900 whitespace-pre-wrap">
                          {item.value}
                        </p>
                      ) : (
                        <video
                          src={item.value}
                          controls
                          playsInline
                          muted
                          className="block w-full h-auto max-h-48 bg-black"
                          aria-label="Connected video reference preview"
                        >
                          <track kind="captions" />
                        </video>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-3">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[10px] text-gray-500 font-medium">
              {sanitizedSnippetTitle !== '' ? sanitizedSnippetTitle : 'Snippet'}
            </p>
            <div className="flex items-center gap-2">
              {isEditing && (
                <span className={`text-[10px] font-mono ${prompt.length > 2000 ? 'text-red-500' : 'text-gray-400'}`}>
                  {prompt.length}/2000
                </span>
              )}
              <p className="text-[10px] text-gray-400 font-mono">
                #{snippetId?.slice(0, 8)}
              </p>
            </div>
          </div>

          {isEditing ? (
            <textarea
              id="prompt-input"
              ref={textareaRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setIsEditing(false)
                }
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault()
                  setIsEditing(false)
                }
              }}
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
              rows={Math.max(4, Math.min(12, prompt.split('\n').length + 1))}
            />
          ) : (
            <button
              id="prompt-input"
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full cursor-text rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-left transition-colors hover:border-blue-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300"
            >
              {prompt.trim() !== '' ? (
                <span className="whitespace-pre-wrap break-words text-sm font-medium text-gray-900">
                  {prompt}
                </span>
              ) : (
                <span className="text-sm text-gray-400">Click to compose prompt...</span>
              )}
            </button>
          )}
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[10px] text-gray-500 font-medium">System prompt</p>
            {isSystemPromptEditing && (
              <span className={`text-[10px] font-mono ${systemPrompt.length > 2000 ? 'text-red-500' : 'text-gray-400'}`}>
                {systemPrompt.length}/2000
              </span>
            )}
          </div>

          {isSystemPromptEditing ? (
            <textarea
              ref={systemPromptRef}
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              onBlur={() => setIsSystemPromptEditing(false)}
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setIsSystemPromptEditing(false)
                }
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault()
                  setIsSystemPromptEditing(false)
                }
              }}
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
              rows={Math.max(3, Math.min(10, systemPrompt.split('\n').length + 1))}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsSystemPromptEditing(true)}
              className="w-full cursor-text rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-left transition-colors hover:border-blue-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300"
            >
              {systemPrompt.trim() !== '' ? (
                <span className="whitespace-pre-wrap break-words text-sm font-medium text-gray-900">
                  {systemPrompt}
                </span>
              ) : (
                <span className="text-sm text-gray-400">Click to add a system prompt...</span>
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleApplySystemPrompt(scenesPromptText)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Create Scenes
          </button>
          <button
            type="button"
            onClick={() => handleApplySystemPrompt(shotsPromptText)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Create Shots
          </button>
        </div>
      </div>
    </div>
  )
}
