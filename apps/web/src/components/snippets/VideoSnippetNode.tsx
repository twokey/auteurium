import { memo, useState, useRef, useCallback, useEffect } from 'react'
import { Handle, Position } from 'reactflow'
import { Accordion } from '../../shared/components/ui/Accordion'
import { useOptimisticUpdatesStore } from '../../features/canvas/store/optimisticUpdatesStore'
import { useToast } from '../../shared/store/toastStore'
import { usePromptDesignerStore } from '../../features/canvas/store/promptDesignerStore'

import type { AvailableModel, ConnectedContentItem } from '../../types'

interface VideoSnippetNodeProps {
  id: string
  data: {
    snippet: {
      id: string
      title?: string
      textField1?: string
      connectedContent?: ConnectedContentItem[]
    }
    onFocusSnippet: (snippetId: string) => void
    onUpdateContent: (snippetId: string, changes: Partial<Record<'textField1' | 'title', string>>) => Promise<void>
    videoModels?: AvailableModel[]
    isLoadingVideoModels?: boolean
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

export const VideoSnippetNode = memo(({ data }: VideoSnippetNodeProps) => {
  const { snippet, onFocusSnippet, onUpdateContent, videoModels = [], isLoadingVideoModels = false } = data
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

  // Video generation state
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('')

  // Auto-select first video model when models load
  useEffect(() => {
    if (videoModels.length > 0 && selectedVideoModel === '') {
      setSelectedVideoModel(videoModels[0].id)
    }
  }, [videoModels, selectedVideoModel])

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

  // Get connected images (up to 3)
  const connectedImages = (snippet.connectedContent ?? [])
    .filter((item) => item.type === 'image')
    .slice(0, 3)

  // Create placeholder slots if fewer than 3 images
  const imageSlots = [0, 1, 2].map((index) => connectedImages[index] || null)

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
                  connectedContent: snippet.connectedContent ?? [],
                  onGenerate: () => {
                    toast.info('Video generation coming soon!')
                  }
                })
              }}
              disabled={isLoadingVideoModels || (!selectedVideoModel && videoModels.length > 0)}
              style={POINTER_EVENTS_STYLES.interactive}
              aria-label="Generate video content"
              title={
                isLoadingVideoModels
                  ? 'Loading models...'
                  : !selectedVideoModel
                    ? 'Please select a video model first'
                    : 'Generate video for this snippet'
              }
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Generate Video
            </button>
          </div>
        </div>
      </div>
    </>
  )
})

VideoSnippetNode.displayName = 'VideoSnippetNode'
