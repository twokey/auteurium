import { memo, useState, useRef, useCallback, useEffect } from 'react'
import { Handle, Position } from 'reactflow'

import { Accordion } from '../../components/ui/Accordion'
import { VIDEO_GENERATION } from '../../constants'
import { useOptimisticUpdatesStore } from '../../features/canvas/store/optimisticUpdatesStore'
import { StarMenu } from '../../features/snippets/components/StarMenu'
import { usePromptDesignerStore } from '../../features/canvas/store/promptDesignerStore'
import { useVideoPromptStore } from '../../features/snippets/store/videoPromptStore'
import { useToast } from '../../store/toastStore'

import { VIDU_Q2_MODEL_CONFIG } from './videoPromptUtils'

import type { AvailableModel, ConnectedContentItem, VideoGenerationInput, VideoMetadata, SnippetField } from '../../types'
import { getPrimaryFieldValue, getPrimaryTextValue } from '../../utils/snippetContent'

interface VideoSnippetNodeProps {
  id: string
  data: {
    snippet: {
      id: string
      title: string
      content: Record<string, SnippetField>
      connectedContent?: ConnectedContentItem[]
      videoS3Key?: string | null
      videoUrl?: string | null
      videoMetadata?: VideoMetadata | null
    }
    onFocusSnippet: (snippetId: string) => void
    onUpdateContent: (
      snippetId: string,
      changes: Partial<{ title: string; content: Record<string, SnippetField | null> }>
    ) => Promise<void>
    videoModels?: AvailableModel[]
    isLoadingVideoModels?: boolean
    onGenerateVideo: (snippetId: string, options: VideoGenerationInput) => Promise<void> | void
    isGeneratingVideo: boolean
  }
}

interface VideoFormData {
  subject: string
  action: string
  cameraMotion: string
  composition: string
  focusLens: string
  style: string
  ambiance: string
  dialogue: string
  soundEffects: string
  ambientNoise: string
}

interface TextareaFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  maxLength: number
  rows?: number
}

const TextareaField = ({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  maxLength,
  rows = 3
}: TextareaFieldProps) => {
  const handleSnippetSelect = (content: string) => {
    // Append content to the current value
    const separator = value.trim() ? ' ' : ''
    const newValue = value + separator + content
    // Truncate if exceeds maxLength
    onChange(newValue.slice(0, maxLength))
  }

  return (
    <div className="space-y-1">
      {/* Field Label - Updated to match Prompt Designer */}
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </div>

      <div className="flex items-start gap-2">
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className="w-full text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-gray-300 resize-none leading-relaxed transition-colors"
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <StarMenu fieldType={label} onSelect={handleSnippetSelect} />
      </div>
      <div className={`text-[10px] text-right ${value.length >= maxLength ? 'text-red-500' : 'text-gray-400'}`}>
        {value.length}/{maxLength}
      </div>
    </div>
  )
}



const parseLabeledValue = (source: string, labels: string[]): string | undefined => {
  for (const label of labels) {
    const regex = new RegExp(`${label} \\s *: \\s * ([^\\n] +)`, 'i')
    const match = source.match(regex)
    if (match?.[1]) {
      const value = match[1].trim()
      if (value) {
        return value
      }
    }
  }
  return undefined
}

const getVideoReferenceLimit = (modelId: string): number => {
  if (!modelId) {
    return VIDEO_GENERATION.MAX_REFERENCE_IMAGES
  }

  const normalized = modelId.toLowerCase()
  if (normalized.includes('q1') || normalized.includes('q2')) {
    return 7
  }

  return 3
}

export const VideoSnippetNode = memo(({ data }: VideoSnippetNodeProps) => {
  const {
    snippet,
    onFocusSnippet,
    onUpdateContent,
    onGenerateVideo,
    videoModels = []
  } = data
  const toast = useToast()
  const { markSnippetDirty, clearSnippetDirty, markSnippetSaving, clearSnippetSaving } = useOptimisticUpdatesStore()

  const {
    modelSettings,
  } = useVideoPromptStore()

  const openPromptDesigner = usePromptDesignerStore((state) => state.open)

  // Local state for all form fields (ephemeral - not persisted)
  const [formData, setFormData] = useState<VideoFormData>({
    subject: '',
    action: '',
    cameraMotion: '',
    composition: '',
    focusLens: '',
    style: '',
    ambiance: '',
    dialogue: '',
    soundEffects: '',
    ambientNoise: ''
  })

  // Accordion expanded states
  const [accordionStates, setAccordionStates] = useState({
    referenceImages: false, // Collapsed by default
    shotDetails: true, // Expanded by default
    visualTone: true, // Expanded by default
    audioDetails: true // Expanded by default
  })
  const [isHydratedFromSnippet, setIsHydratedFromSnippet] = useState(false)

  // Editable title state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(snippet.title)
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  // Pre-fill form fields from snippet text (if labeled) to show generated values
  useEffect(() => {
    if (isHydratedFromSnippet) return
    const sourceText = getPrimaryTextValue({ content: snippet.content }).trim()
    if (!sourceText) return

    const nextData: Partial<VideoFormData> = {}
    const setIfPresent = (key: keyof VideoFormData, value?: string) => {
      if (value) {
        nextData[key] = value
      }
    }

    setIfPresent('subject', parseLabeledValue(sourceText, ['Subject']))
    setIfPresent('action', parseLabeledValue(sourceText, ['Action']))
    setIfPresent('cameraMotion', parseLabeledValue(sourceText, ['Camera & Motion', 'Camera positioning and motion']))
    setIfPresent('composition', parseLabeledValue(sourceText, ['Composition']))
    setIfPresent('focusLens', parseLabeledValue(sourceText, ['Focus & Lens', 'Focus and lens effects']))
    setIfPresent('style', parseLabeledValue(sourceText, ['Style']))
    setIfPresent('ambiance', parseLabeledValue(sourceText, ['Ambiance', 'Ambience']))
    setIfPresent('dialogue', parseLabeledValue(sourceText, ['Dialogue']))
    setIfPresent('soundEffects', parseLabeledValue(sourceText, ['Sound Effects', 'Sound Effects (SFX)', 'Sound']))
    setIfPresent('ambientNoise', parseLabeledValue(sourceText, ['Ambient Noise']))

    if (Object.keys(nextData).length > 0) {
      setFormData((prev) => ({ ...prev, ...nextData }))
      setIsHydratedFromSnippet(true)
    }
  }, [isHydratedFromSnippet, snippet.content])

  const connectedContent = snippet.connectedContent ?? []
  const connectedImageReferences = connectedContent.filter((item) => item.type === 'image')
  const referenceImageLimit = getVideoReferenceLimit(videoModels[0]?.id || '')
  const referenceImages = connectedImageReferences.slice(0, referenceImageLimit)
  const imageSlots = Array.from({ length: referenceImageLimit }, (_, index) => referenceImages[index] || null)

  // Sync draft title when snippet.title changes (if not editing)
  useEffect(() => {
    if (!isEditingTitle) {
      setDraftTitle(snippet.title)
    }
  }, [snippet.title, isEditingTitle])

  // Auto-focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const handleFieldChange = (field: keyof VideoFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAccordionToggle = (section: keyof typeof accordionStates) => (isExpanded: boolean) => {
    setAccordionStates((prev) => ({ ...prev, [section]: isExpanded }))
  }

  const handleIdClick = () => {
    onFocusSnippet(snippet.id)
  }

  // Combine all form fields into a single prompt
  const combineFormFieldsToPrompt = useCallback(() => {
    const promptParts: string[] = []

    if (formData.subject) promptParts.push(`Subject: ${formData.subject} `)
    if (formData.action) promptParts.push(`Action: ${formData.action} `)
    if (formData.cameraMotion) promptParts.push(`Camera & Motion: ${formData.cameraMotion} `)
    if (formData.composition) promptParts.push(`Composition: ${formData.composition} `)
    if (formData.focusLens) promptParts.push(`Focus & Lens: ${formData.focusLens} `)
    if (formData.style) promptParts.push(`Style: ${formData.style} `)
    if (formData.ambiance) promptParts.push(`Ambiance: ${formData.ambiance} `)
    if (formData.dialogue) promptParts.push(`Dialogue: ${formData.dialogue} `)
    if (formData.soundEffects) promptParts.push(`Sound Effects: ${formData.soundEffects} `)
    if (formData.ambientNoise) promptParts.push(`Ambient Noise: ${formData.ambientNoise} `)

    return promptParts.join('\n')
  }, [formData])

  // Update preview when form data changes
  const handleFieldBlur = useCallback(() => {
    // We don't need to update combined prompt in store anymore as preview is gone
    // But we might want to keep local state or update snippet content if autosave is desired
    // For now, let's just update the store's combined prompt if we are the active snippet in designer?
    // Actually, the designer has its own state.
    // We can probably remove this unless it's used for something else.
    // Leaving it empty for now to minimize disruption, or we can remove it.
    // The original code updated the store for the preview panel.
  }, [])

  // Handle snippet click to open Prompt Designer
  const handleSnippetClick = useCallback(() => {
    const combinedPrompt = combineFormFieldsToPrompt()

    // Prepare reference images for designer
    const designerConnectedContent = referenceImages.map((img) => ({
      type: 'image' as const,
      snippetId: img.snippetId,
      snippetTitle: img.snippetTitle ?? undefined,
      value: img.value
    }))

    openPromptDesigner({
      snippetId: snippet.id,
      snippetTitle: snippet.title && snippet.title.trim() !== '' ? snippet.title : 'Untitled Video Snippet',
      mode: 'video',
      initialPrompt: combinedPrompt,
      connectedContent: designerConnectedContent,
      generationSettings: {
        type: 'video',
        settings: modelSettings // Use current store settings as default
      },
      onGenerate: async (finalPrompt, settings) => {
        const storeSettings = useVideoPromptStore.getState().modelSettings
        const latestSettings = settings?.type === 'video' ? settings.settings : storeSettings

        // Sync back to store if settings changed in designer
        if (settings?.type === 'video') {
          useVideoPromptStore.getState().updateModelSettings(settings.settings)
        }

        const primaryField = getPrimaryFieldValue({ content: snippet.content })
        const targetKey = primaryField?.key ?? 'mainText'
        const targetField = primaryField?.field ?? {
          label: 'mainText',
          value: '',
          type: 'longText',
          isSystem: true,
          order: 1
        }

        await onUpdateContent(snippet.id, {
          content: {
            [targetKey]: {
              ...targetField,
              value: finalPrompt
            }
          }
        })

        const fallbackModel = videoModels[0]?.id ?? VIDEO_GENERATION.DEFAULT_MODEL
        const targetModel = latestSettings.model && VIDU_Q2_MODEL_CONFIG[latestSettings.model]
          ? latestSettings.model
          : fallbackModel

        const designerRequest: VideoGenerationInput = {
          modelId: targetModel,
          duration: latestSettings.duration ?? VIDEO_GENERATION.DEFAULT_DURATION,
          aspectRatio: VIDEO_GENERATION.DEFAULT_ASPECT_RATIO,
          resolution: latestSettings.resolution ?? VIDEO_GENERATION.DEFAULT_RESOLUTION,
          style: VIDEO_GENERATION.DEFAULT_STYLE,
          seed: latestSettings.seed,
          movementAmplitude: latestSettings.movementAmplitude ?? VIDEO_GENERATION.DEFAULT_MOVEMENT_AMPLITUDE
        }

        await onGenerateVideo(snippet.id, designerRequest)
      }
    })
  }, [snippet.content, snippet.id, snippet.title, combineFormFieldsToPrompt, referenceImages, openPromptDesigner, modelSettings, onUpdateContent, onGenerateVideo, videoModels])

  const handleTitleActivate = useCallback((event?: React.MouseEvent) => {
    // Don't activate if Cmd/Ctrl is held (user is multi-selecting)
    if (event && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      return
    }

    setIsEditingTitle(true)
    markSnippetDirty(snippet.id)
    setDraftTitle(snippet.title ?? '')
  }, [snippet.id, snippet.title, markSnippetDirty])

  const commitTitle = useCallback(async () => {
    const newValue = draftTitle.trim()
    const currentValue = snippet.title ?? ''

    if (newValue === currentValue) {
      clearSnippetDirty(snippet.id)
      setIsEditingTitle(false)
      return
    }

    setIsSavingTitle(true)
    markSnippetSaving(snippet.id)

    try {
      await onUpdateContent(snippet.id, { title: newValue })
      clearSnippetDirty(snippet.id)
      setIsEditingTitle(false)
    } catch (error) {
      console.error('Failed to update video snippet title:', error)
      toast.error('Failed to save title changes', 'Please try again')
      setDraftTitle(currentValue)
      setIsEditingTitle(false)
    } finally {
      setIsSavingTitle(false)
      clearSnippetSaving(snippet.id)
    }
  }, [draftTitle, snippet.id, snippet.title, onUpdateContent, toast, markSnippetSaving, clearSnippetSaving, clearSnippetDirty])

  const handleTitleBlur = useCallback(() => {
    void commitTitle()
  }, [commitTitle])

  const handleTitleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setDraftTitle(snippet.title ?? '')
      setIsEditingTitle(false)
      clearSnippetDirty(snippet.id)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      void commitTitle()
    }
  }, [commitTitle, snippet.title, snippet.id, clearSnippetDirty])

  const handleTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftTitle(event.target.value)
  }, [])

  // connected images derived via connectedContent above

  return (
    <>
      {/* React Flow handles for connections */}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div
        className="w-[900px] bg-white border border-gray-200 rounded-lg shadow-lg"
        data-testid="video-snippet-node"
        data-snippet-id={snippet.id}
        onClick={handleSnippetClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSnippetClick()
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Header with Editable Title */}
        <div className="flex items-start justify-between border-b border-gray-200 px-3 py-2.5 bg-gray-50/50 rounded-t-lg">
          <div className="min-w-0 flex-1 mr-2">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={draftTitle}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="w-full text-sm font-semibold text-gray-900 bg-white border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Untitled Video Snippet"
                disabled={isSavingTitle}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                type="button"
                onClick={handleTitleActivate}
                className="text-sm font-semibold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer bg-transparent border-none p-0 text-left truncate w-full"
                title="Click to edit title"
              >
                {snippet.title && snippet.title.trim() !== '' ? snippet.title : 'Untitled Video Snippet'}
              </button>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wide">
                Video Generation
              </p>
              <button
                type="button"
                onClick={handleIdClick}
                className="font-mono text-[10px] text-gray-400 hover:text-purple-600 transition-colors cursor-pointer bg-transparent border-none p-0"
                title="Click to zoom and center this snippet"
              >
                #{snippet.id.slice(0, 8)}
              </button>
            </div>
          </div>
        </div>

        <div className="p-3">

          {/* Reference Images Section */}
          <div className="mb-2">
            <Accordion
              title="Reference Images"
              isOptional={true}
              defaultExpanded={accordionStates.referenceImages}
              onToggle={handleAccordionToggle('referenceImages')}
            >
              <div className="grid grid-cols-3 gap-2 mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                {imageSlots.map((image, index) => (
                  <div
                    key={index}
                    className="aspect-video border border-dashed border-gray-300 rounded-md flex items-center justify-center bg-white"
                  >
                    {image ? (
                      <img
                        src={image.value}
                        alt={`Reference ${index + 1} `}
                        className="w-full h-full object-cover rounded-sm"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <svg
                          className="w-6 h-6 mb-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-[10px]">Image {index + 1}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Accordion>
          </div>

          {/* Core Scene Section - Always expanded, cannot collapse */}
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Core Scene
            </div>
            <div className="space-y-2">
              <TextareaField
                label="Subject"
                placeholder="e.g., A cute creature with snow leopard-like fur and large expressive eyes."
                value={formData.subject}
                onChange={handleFieldChange('subject')}
                onBlur={handleFieldBlur}
                maxLength={280}
              />
              <TextareaField
                label="Action"
                placeholder="e.g., happily prances through a whimsical winter forest."
                value={formData.action}
                onChange={handleFieldChange('action')}
                onBlur={handleFieldBlur}
                maxLength={280}
              />
            </div>
          </div>

          {/* Shot Details Section */}
          <div className="mb-2">
            <Accordion
              title="Shot Details"
              isOptional={true}
              defaultExpanded={accordionStates.shotDetails}
              onToggle={handleAccordionToggle('shotDetails')}
            >
              <div className="space-y-2 mt-2">
                <TextareaField
                  label="Camera & Motion"
                  placeholder="e.g., Aerial view, dolly shot"
                  value={formData.cameraMotion}
                  onChange={handleFieldChange('cameraMotion')}
                  onBlur={handleFieldBlur}
                  maxLength={140}
                  rows={2}
                />
                <TextareaField
                  label="Composition"
                  placeholder="e.g., Wide shot, close-up"
                  value={formData.composition}
                  onChange={handleFieldChange('composition')}
                  onBlur={handleFieldBlur}
                  maxLength={140}
                  rows={2}
                />
                <TextareaField
                  label="Focus & Lens"
                  placeholder="e.g., Shallow focus, wide-angle"
                  value={formData.focusLens}
                  onChange={handleFieldChange('focusLens')}
                  onBlur={handleFieldBlur}
                  maxLength={140}
                  rows={2}
                />
              </div>
            </Accordion>
          </div>

          {/* Visual Tone Section */}
          <div className="mb-2">
            <Accordion
              title="Visual Tone"
              defaultExpanded={accordionStates.visualTone}
              onToggle={handleAccordionToggle('visualTone')}
            >
              <div className="space-y-2 mt-2">
                <TextareaField
                  label="Style"
                  placeholder="e.g., 3D animated scene, joyful cartoon style, bright cheerful colors."
                  value={formData.style}
                  onChange={handleFieldChange('style')}
                  onBlur={handleFieldBlur}
                  maxLength={280}
                />
                <TextareaField
                  label="Ambiance"
                  placeholder="e.g., Warm sunlight filtering through branches, eerie glow of a neon sign."
                  value={formData.ambiance}
                  onChange={handleFieldChange('ambiance')}
                  onBlur={handleFieldBlur}
                  maxLength={280}
                />
              </div>
            </Accordion>
          </div>

          {/* Audio Details Section */}
          <div className="mb-2">
            <Accordion
              title="Audio Details"
              isOptional={true}
              defaultExpanded={accordionStates.audioDetails}
              onToggle={handleAccordionToggle('audioDetails')}
            >
              <div className="space-y-2 mt-2">
                <TextareaField
                  label="Dialogue"
                  placeholder='e.g., "This must be the key," he murmured.'
                  value={formData.dialogue}
                  onChange={handleFieldChange('dialogue')}
                  onBlur={handleFieldBlur}
                  maxLength={280}
                />
                <TextareaField
                  label="Sound Effects (SFX)"
                  placeholder="e.g., Tires screeching loudly, engine roaring."
                  value={formData.soundEffects}
                  onChange={handleFieldChange('soundEffects')}
                  onBlur={handleFieldBlur}
                  maxLength={280}
                />
                <TextareaField
                  label="Ambient Noise"
                  placeholder="e.g., A faint, eerie hum resonates."
                  value={formData.ambientNoise}
                  onChange={handleFieldChange('ambientNoise')}
                  onBlur={handleFieldBlur}
                  maxLength={280}
                />
              </div>
            </Accordion>
          </div>


          {snippet.videoUrl ? (
            <div className="mt-6">
              <div className="text-base font-semibold text-gray-800 mb-2">
                Latest Video
              </div>
              <video
                key={snippet.videoUrl}
                className="w-full rounded-lg border border-purple-200"
                src={snippet.videoUrl}
                controls
                playsInline
                muted
              >
                <track kind="captions" />
              </video>
              {snippet.videoMetadata && (
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
                  <div>
                    <dt className="font-semibold text-gray-900">Duration</dt>
                    <dd>{snippet.videoMetadata.duration}s</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-900">Resolution</dt>
                    <dd>{snippet.videoMetadata.resolution}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-900">Aspect</dt>
                    <dd>{snippet.videoMetadata.aspectRatio}</dd>
                  </div>
                  {snippet.videoMetadata.fileSize && (
                    <div>
                      <dt className="font-semibold text-gray-900">Size</dt>
                      <dd>{(snippet.videoMetadata.fileSize / (1024 * 1024)).toFixed(2)} MB</dd>
                    </div>
                  )}
                  {snippet.videoMetadata.style && (
                    <div>
                      <dt className="font-semibold text-gray-900">Style</dt>
                      <dd>{snippet.videoMetadata.style}</dd>
                    </div>
                  )}
                  {snippet.videoMetadata.movementAmplitude && (
                    <div>
                      <dt className="font-semibold text-gray-900">Movement</dt>
                      <dd>{snippet.videoMetadata.movementAmplitude}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          ) : snippet.videoS3Key ? (
            <p className="mt-4 text-sm text-gray-500">
              The previous video exists but its preview link expired. Generate again to refresh the preview.
            </p>
          ) : null}

        </div>
      </div>
    </>
  )
})

VideoSnippetNode.displayName = 'VideoSnippetNode'
