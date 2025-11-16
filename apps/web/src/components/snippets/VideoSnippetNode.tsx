import { memo, useState, useRef, useCallback, useEffect } from 'react'
import { Handle, Position } from 'reactflow'
import { Accordion } from '../../shared/components/ui/Accordion'
import { useOptimisticUpdatesStore } from '../../features/canvas/store/optimisticUpdatesStore'
import { useToast } from '../../shared/store/toastStore'
import { usePromptDesignerStore } from '../../features/canvas/store/promptDesignerStore'
import { VIDEO_GENERATION } from '../../shared/constants'

import type { AvailableModel, ConnectedContentItem, VideoGenerationInput, VideoMetadata, VideoGenerationStatus } from '../../types'

interface VideoSnippetNodeProps {
  id: string
  data: {
    snippet: {
      id: string
      title?: string
      textField1?: string
      connectedContent?: ConnectedContentItem[]
      videoS3Key?: string | null
      videoUrl?: string | null
      videoMetadata?: VideoMetadata | null
      videoGenerationStatus?: VideoGenerationStatus | null
      videoGenerationTaskId?: string | null
      videoGenerationError?: string | null
    }
    onFocusSnippet: (snippetId: string) => void
    onUpdateContent: (snippetId: string, changes: Partial<Record<'textField1' | 'title', string>>) => Promise<void>
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

interface StarDropdownProps {
  fieldName: string
}

const StarDropdown = ({ fieldName }: StarDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="text-gray-600 hover:text-gray-800 transition-colors p-1 text-xl"
            title={`Options for ${fieldName}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded shadow-lg p-4 z-20 min-w-[200px]">
            <div className="text-lg text-gray-500">
              Menu (coming soon)
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface TextareaFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  maxLength: number
  rows?: number
}

const TextareaField = ({
  label,
  placeholder,
  value,
  onChange,
  maxLength,
  rows = 3
}: TextareaFieldProps) => {
  return (
    <div className="space-y-1">
      {/* Field Label - Increased font size by 2 steps (sm -> base -> lg) */}
      <div className="text-lg font-semibold text-gray-800 mb-1">
        {label}
      </div>

      <div className="flex items-start gap-2">
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-2xl font-medium text-gray-900 bg-white border border-gray-200 rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-blue-300 hover:border-blue-400 resize-none leading-relaxed transition-colors"
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        <StarDropdown fieldName={label} />
      </div>
      <div className="text-xl text-gray-500 text-right">
        {value.length}/{maxLength}
      </div>
    </div>
  )
}

// Inline styles outside component to prevent object recreation on every render
const POINTER_EVENTS_STYLES = {
  interactive: { pointerEvents: 'auto' as const }
} as const

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
    videoModels = [],
    isLoadingVideoModels = false,
    onGenerateVideo,
    isGeneratingVideo = false
  } = data
  const toast = useToast()
  const { markSnippetDirty, clearSnippetDirty, markSnippetSaving, clearSnippetSaving } = useOptimisticUpdatesStore()
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

  // Editable title state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(snippet.title ?? '')
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const lastRequestRef = useRef<VideoGenerationInput | null>(null)

  // Video generation state
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('')

  // Auto-select first video model when models load
  useEffect(() => {
    if (videoModels.length > 0 && selectedVideoModel === '') {
      setSelectedVideoModel(videoModels[0].id)
    }
  }, [videoModels, selectedVideoModel])

  const connectedContent = snippet.connectedContent ?? []
  const connectedImageReferences = connectedContent.filter((item) => item.type === 'image')
  const referenceImageLimit = getVideoReferenceLimit(selectedVideoModel || videoModels[0]?.id || '')
  const referenceImages = connectedImageReferences.slice(0, referenceImageLimit)
  const imageSlots = Array.from({ length: referenceImageLimit }, (_, index) => referenceImages[index] || null)
  const hasTooManyReferenceImages = connectedImageReferences.length > referenceImageLimit
  const videoStatus = snippet.videoGenerationStatus ?? null
  const isPendingStatus = videoStatus === 'PENDING' || videoStatus === 'PROCESSING'
  const isFailedStatus = videoStatus === 'FAILED'
  const videoStatusMessage = isPendingStatus
    ? 'Video generating... Please refresh page in a few minutes.'
    : isFailedStatus
      ? 'Video generation failed.'
      : null

  // Sync draft title when snippet.title changes (if not editing)
  useEffect(() => {
    if (!isEditingTitle) {
      setDraftTitle(snippet.title ?? '')
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
        className="p-6 w-[900px] bg-purple-100 border border-purple-200 rounded-2xl shadow-sm"
        data-testid="video-snippet-node"
        data-snippet-id={snippet.id}
      >
        {/* Header with Editable Title */}
        <div className="flex items-center justify-between mb-5">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={draftTitle}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="text-3xl font-bold text-gray-900 uppercase tracking-wide bg-white border-2 border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Untitled Video Snippet"
              disabled={isSavingTitle}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <button
              type="button"
              onClick={handleTitleActivate}
              className="text-3xl font-bold text-gray-900 uppercase tracking-wide hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-none p-0 text-left"
              title="Click to edit title"
            >
              {snippet.title && snippet.title.trim() !== '' ? snippet.title : 'Untitled Video Snippet'}
            </button>
          )}
          <button
            type="button"
            onClick={handleIdClick}
            className="font-mono text-lg text-gray-600 hover:text-blue-600 hover:underline transition-colors cursor-pointer bg-transparent border-none p-0"
            title="Click to zoom and center this snippet"
          >
            #{snippet.id.slice(0, 8)}
          </button>
        </div>

        {/* Reference Images Section */}
        <div className="mb-2">
          <Accordion
            title="Reference Images"
            isOptional={true}
            defaultExpanded={accordionStates.referenceImages}
            onToggle={handleAccordionToggle('referenceImages')}
          >
            <div className="grid grid-cols-3 gap-2 mt-2">
              {imageSlots.map((image, index) => (
                <div
                  key={index}
                  className="aspect-video border-2 border-dashed border-gray-300 rounded-sm flex items-center justify-center bg-gray-50"
                >
                  {image ? (
                    <img
                      src={image.value}
                      alt={`Reference ${index + 1}`}
                      className="w-full h-full object-cover rounded-sm"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-600">
                      <svg
                        className="w-12 h-12 mb-3"
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
                      <span className="text-xl">Image {index + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Accordion>
        </div>

        {/* Core Scene Section - Always expanded, cannot collapse */}
        <div className="mb-4 border border-gray-200 rounded-lg bg-white p-5">
          <div className="text-2xl font-bold text-gray-900 uppercase mb-4">
            Core Scene
          </div>
          <div className="space-y-2">
            <TextareaField
              label="Subject"
              placeholder="e.g., A cute creature with snow leopard-like fur and large expressive eyes."
              value={formData.subject}
              onChange={handleFieldChange('subject')}
              maxLength={280}
            />
            <TextareaField
              label="Action"
              placeholder="e.g., happily prances through a whimsical winter forest."
              value={formData.action}
              onChange={handleFieldChange('action')}
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
                maxLength={140}
                rows={2}
              />
              <TextareaField
                label="Composition"
                placeholder="e.g., Wide shot, close-up"
                value={formData.composition}
                onChange={handleFieldChange('composition')}
                maxLength={140}
                rows={2}
              />
              <TextareaField
                label="Focus & Lens"
                placeholder="e.g., Shallow focus, wide-angle"
                value={formData.focusLens}
                onChange={handleFieldChange('focusLens')}
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
                maxLength={280}
              />
              <TextareaField
                label="Ambiance"
                placeholder="e.g., Warm sunlight filtering through branches, eerie glow of a neon sign."
                value={formData.ambiance}
                onChange={handleFieldChange('ambiance')}
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
                maxLength={280}
              />
              <TextareaField
                label="Sound Effects (SFX)"
                placeholder="e.g., Tires screeching loudly, engine roaring."
                value={formData.soundEffects}
                onChange={handleFieldChange('soundEffects')}
                maxLength={280}
              />
              <TextareaField
                label="Ambient Noise"
                placeholder="e.g., A faint, eerie hum resonates."
                value={formData.ambientNoise}
                onChange={handleFieldChange('ambientNoise')}
                maxLength={280}
              />
            </div>
          </Accordion>
        </div>

        {/* Video Generation Section */}
        <div className="mt-4 pt-4 border-t border-purple-300">
          <div className="text-base font-semibold text-gray-800 mb-3">
            Generate Video
          </div>
          <div className="flex gap-2">
            <select
              value={selectedVideoModel}
              onChange={(e) => {
                e.stopPropagation()
                setSelectedVideoModel(e.target.value)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoadingVideoModels}
              style={POINTER_EVENTS_STYLES.interactive}
            >
              <option value="" disabled>
                {isLoadingVideoModels ? 'Loading video models...' : 'Select video model...'}
              </option>
              {videoModels.map((model) => (
                <option key={model.id} value={model.id} title={model.description ?? undefined}>
                  {model.displayName}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed rounded transition-colors"
              onClick={(event) => {
                event.stopPropagation()
                // Don't open prompt designer if Cmd/Ctrl is held (user is multi-selecting)
                if (event.metaKey || event.ctrlKey) {
                  event.preventDefault()
                  return
                }

                // Build video prompt from all form fields
                const promptParts: string[] = []

                if (formData.subject) promptParts.push(`Subject: ${formData.subject}`)
                if (formData.action) promptParts.push(`Action: ${formData.action}`)
                if (formData.cameraMotion) promptParts.push(`Camera & Motion: ${formData.cameraMotion}`)
                if (formData.composition) promptParts.push(`Composition: ${formData.composition}`)
                if (formData.focusLens) promptParts.push(`Focus & Lens: ${formData.focusLens}`)
                if (formData.style) promptParts.push(`Style: ${formData.style}`)
                if (formData.ambiance) promptParts.push(`Ambiance: ${formData.ambiance}`)
                if (formData.dialogue) promptParts.push(`Dialogue: ${formData.dialogue}`)
                if (formData.soundEffects) promptParts.push(`Sound Effects: ${formData.soundEffects}`)
                if (formData.ambientNoise) promptParts.push(`Ambient Noise: ${formData.ambientNoise}`)

                const combinedPrompt = promptParts.join('\n')

                openPromptDesigner({
                  snippetId: snippet.id,
                  snippetTitle: snippet.title && snippet.title.trim() !== '' ? snippet.title : 'Untitled Video Snippet',
                  mode: 'video',
                  initialPrompt: combinedPrompt,
                  connectedContent,
                  onGenerate: async (finalPrompt) => {
                    await onUpdateContent(snippet.id, { textField1: finalPrompt })
                    const targetModel = selectedVideoModel || videoModels[0]?.id || VIDEO_GENERATION.DEFAULT_MODEL
                    const designerRequest: VideoGenerationInput = {
                      modelId: targetModel,
                      duration: VIDEO_GENERATION.DEFAULT_DURATION,
                      aspectRatio: VIDEO_GENERATION.DEFAULT_ASPECT_RATIO,
                      resolution: VIDEO_GENERATION.DEFAULT_RESOLUTION,
                      style: VIDEO_GENERATION.DEFAULT_STYLE,
                      movementAmplitude: VIDEO_GENERATION.DEFAULT_MOVEMENT_AMPLITUDE
                    }
                    lastRequestRef.current = designerRequest
                    await onGenerateVideo(snippet.id, designerRequest)
                  }
                })
              }}
              disabled={
                isLoadingVideoModels ||
                (!selectedVideoModel && videoModels.length > 0) ||
                hasTooManyReferenceImages ||
                isGeneratingVideo
              }
              style={POINTER_EVENTS_STYLES.interactive}
              aria-label="Generate video content"
              title={
                isGeneratingVideo
                  ? 'Video generation in progress...'
                  : isLoadingVideoModels
                    ? 'Loading models...'
                    : !selectedVideoModel
                      ? 'Please select a video model first'
                      : hasTooManyReferenceImages
                        ? `Too many reference images (${connectedImageReferences.length}/${referenceImageLimit}). Remove connections before generating.`
                        : 'Generate video for this snippet'
              }
            >
              {isGeneratingVideo ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Generate Video
                </>
              )}
            </button>
          </div>

          {hasTooManyReferenceImages && (
            <div className="text-sm text-red-600 mt-2 flex items-start gap-1" style={POINTER_EVENTS_STYLES.interactive}>
              <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>
                Too many reference images ({connectedImageReferences.length}/{referenceImageLimit}). Remove image connections before generating a new video.
              </span>
            </div>
          )}
          {videoStatusMessage && (
            <div
              className={`mt-3 flex flex-col gap-2 rounded border px-3 py-2 text-sm ${isFailedStatus ? 'border-red-200 bg-red-50 text-red-800' : 'border-purple-200 bg-purple-50 text-purple-800'}`}
              style={POINTER_EVENTS_STYLES.interactive}
            >
              <div className="flex items-center gap-2">
                {isPendingStatus ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.001 10h2v5h-2zm0-4h2v2h-2z" />
                    <path fillRule="evenodd" d="M2 12C2 6.477 6.479 2 12 2s10 4.477 10 10-4.479 10-10 10S2 17.523 2 12zm18 0a8 8 0 10-16 0 8 8 0 0016 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span>
                  {videoStatusMessage}
                  {isFailedStatus && snippet.videoGenerationError ? ` ${snippet.videoGenerationError}` : ''}
                </span>
              </div>
              {isFailedStatus && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center rounded border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isGeneratingVideo}
                    onClick={async (event) => {
                      event.stopPropagation()
                      const fallbackModel = selectedVideoModel || videoModels[0]?.id || VIDEO_GENERATION.DEFAULT_MODEL
                      const retryRequest = lastRequestRef.current ?? {
                        modelId: fallbackModel,
                        duration: VIDEO_GENERATION.DEFAULT_DURATION,
                        aspectRatio: VIDEO_GENERATION.DEFAULT_ASPECT_RATIO,
                        resolution: VIDEO_GENERATION.DEFAULT_RESOLUTION,
                        style: VIDEO_GENERATION.DEFAULT_STYLE,
                        movementAmplitude: VIDEO_GENERATION.DEFAULT_MOVEMENT_AMPLITUDE
                      }
                      lastRequestRef.current = retryRequest
                      try {
                        await onGenerateVideo(snippet.id, retryRequest)
                        toast.success('Retry started', 'Video generation retry has been queued.')
                      } catch (retryError) {
                        console.error('Failed to retry video generation:', retryError)
                        toast.error('Retry failed', retryError instanceof Error ? retryError.message : 'Unknown error')
                      }
                    }}
                  >
                    Retry
                  </button>
                  {snippet.videoGenerationTaskId && (
                    <span className="text-xs text-red-500">Task ID: {snippet.videoGenerationTaskId}</span>
                  )}
                </div>
              )}
            </div>
          )}
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
            />
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
    </>
  )
})

VideoSnippetNode.displayName = 'VideoSnippetNode'
