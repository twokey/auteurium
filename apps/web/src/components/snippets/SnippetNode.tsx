import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Handle, Position } from 'reactflow'

import { usePromptDesignerStore } from '../../features/canvas/store/promptDesignerStore'
import { useOptimisticUpdatesStore } from '../../features/canvas/store/optimisticUpdatesStore'
import { useGenAI } from '../../hooks/useGenAI'
import { CANVAS_CONSTANTS, VIDEO_GENERATION } from '../../shared/constants'
import { useToast } from '../../shared/store/toastStore'
import { countWords, truncateToWords } from '../../shared/utils/textUtils'
import { VideoSnippetNode } from './VideoSnippetNode'

import type { AvailableModel, ConnectedContentItem, VideoGenerationInput } from '../../types'

interface SnippetNodeProps {
  id: string
  data: {
    snippet: {
      id: string
      title?: string
      textField1: string
      tags?: string[]
      categories?: string[]
      connectionCount: number
      imageUrl?: string | null
      imageS3Key?: string | null
      imageMetadata?: {
        width: number
        height: number
        aspectRatio: string
      } | null
      connectedContent?: ConnectedContentItem[]
      downstreamConnections?: Array<{ id: string; title?: string }>
      snippetType?: 'text' | 'video'
    }
    onEdit: (snippetId: string) => void
    onDelete: (snippetId: string) => void
    onManageConnections: (snippetId: string) => void
    onViewVersions: (snippetId: string) => void
    onUpdateContent: (snippetId: string, changes: Partial<Record<'textField1' | 'title', string>>) => Promise<void>
    onCombine: (snippetId: string) => Promise<void>
    onGenerateImage: (snippetId: string, modelId?: string, promptOverride?: string) => void
    onGenerateText: (snippetId: string, content: string) => Promise<void>
    onGenerateVideo: (snippetId: string, options: VideoGenerationInput) => Promise<void> | void
    onFocusSnippet: (snippetId: string) => void
    onCreateUpstreamSnippet: (snippetId: string) => Promise<void> | void
    isGeneratingImage: boolean
    isGeneratingVideo: boolean
    connectedSnippets?: { id: string; imageS3Key?: string | null }[]
    textModels?: AvailableModel[]
    isLoadingTextModels?: boolean
    imageModels?: AvailableModel[]
    isLoadingImageModels?: boolean
    videoModels?: AvailableModel[]
    isLoadingVideoModels?: boolean
  }
}

type EditableField = 'textField1' | 'title'

// Extract inline styles outside component to prevent object recreation on every render
// This is a critical performance fix for preventing unnecessary React Flow node updates
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

export const SnippetNode = memo(({ data, id }: SnippetNodeProps) => {
  // Route to VideoSnippetNode if this is a video snippet
  if (data.snippet.snippetType === 'video') {
    return <VideoSnippetNode id={id} data={data} />
  }

  // Otherwise, render regular snippet UI
  const toast = useToast()
  const { id: projectId } = useParams<{ id: string }>()
  const { generateStream, createScenes } = useGenAI({ enabled: true })
  const openPromptDesigner = usePromptDesignerStore((state) => state.open)
  const { markSnippetDirty, clearSnippetDirty, markSnippetSaving, clearSnippetSaving } = useOptimisticUpdatesStore()

  const {
    snippet,
    onEdit,
    onUpdateContent,
    onGenerateImage,
    onGenerateText,
    onGenerateVideo,
    onFocusSnippet,
    onCreateUpstreamSnippet,
    isGeneratingImage,
    isGeneratingVideo = false,
    connectedSnippets = [],
    textModels = [],
    isLoadingTextModels = false,
    imageModels = [],
    isLoadingImageModels = false,
    videoModels = [],
    isLoadingVideoModels = false
  } = data
  const connectedContent: ConnectedContentItem[] = snippet.connectedContent ?? []
  const hasImageAsset = Boolean(snippet.imageUrl ?? snippet.imageS3Key)
  const isTextFieldLocked = hasImageAsset
  const hasIncomingConnections = connectedSnippets.length > 0
  const trimmedTextField1 = snippet.textField1.trim()
  const isTextFieldEmpty = trimmedTextField1 === ''
  const hideTextFieldDueToConnections = hasIncomingConnections && isTextFieldEmpty
  const isTextFieldReadOnlyDueToConnections = hasIncomingConnections && !isTextFieldEmpty
  const isTextFieldEditable = !isTextFieldLocked && !isTextFieldReadOnlyDueToConnections

  const [activeField, setActiveField] = useState<EditableField | null>(null)
  const [draftValues, setDraftValues] = useState({
    textField1: snippet.textField1,
    title: snippet.title ?? ''
  })
  const [savingField, setSavingField] = useState<EditableField | null>(null)
  const textField1Ref = useRef<HTMLTextAreaElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [selectedTextModel, setSelectedTextModel] = useState<string>('')
  const [selectedImageModel, setSelectedImageModel] = useState<string>('')
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('')
  const [selectedSceneModel, setSelectedSceneModel] = useState<string>('')
  const [isGeneratingText, setIsGeneratingText] = useState(false)
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false)
  const [isGenerateExpanded, setIsGenerateExpanded] = useState(false)

  const connectedImageReferences = connectedContent.filter((item) => item.type === 'image')
  const videoReferenceLimit = getVideoReferenceLimit(selectedVideoModel || videoModels[0]?.id || '')
  const hasTooManyVideoReferences = connectedImageReferences.length > videoReferenceLimit

  useEffect(() => {
    if (activeField === 'textField1') return

    setDraftValues((prev) => {
      if (prev.textField1 === snippet.textField1) {
        return prev
      }

      return {
        ...prev,
        textField1: snippet.textField1
      }
    })
  }, [snippet.textField1, activeField])

  useEffect(() => {
    if (activeField === 'title') return

    setDraftValues((prev) => {
      if (prev.title === (snippet.title ?? '')) {
        return prev
      }

      return {
        ...prev,
        title: snippet.title ?? ''
      }
    })
  }, [snippet.title, activeField])

  // Auto-select first text model when models load
  useEffect(() => {
    if (textModels.length > 0 && selectedTextModel === '') {
      setSelectedTextModel(textModels[0].id)
    }
  }, [textModels, selectedTextModel])

  // Auto-select first image model when models load
  useEffect(() => {
    if (imageModels.length > 0 && selectedImageModel === '') {
      setSelectedImageModel(imageModels[0].id)
    }
  }, [imageModels, selectedImageModel])

  // Auto-select first video model when models load
  useEffect(() => {
    if (videoModels.length > 0 && selectedVideoModel === '') {
      setSelectedVideoModel(videoModels[0].id)
    }
  }, [videoModels, selectedVideoModel])

  useEffect(() => {
    if (activeField === 'textField1') {
      const target = textField1Ref.current
      target?.focus()
      const length = target?.value.length ?? 0
      target?.setSelectionRange(length, length)
    } else if (activeField === 'title') {
      const target = titleRef.current
      target?.focus()
      target?.select()
    }
  }, [activeField])

  useEffect(() => {
    if (!isTextFieldEditable && activeField === 'textField1') {
      setActiveField(null)
    }
  }, [isTextFieldEditable, activeField])

  const commitField = useCallback(async (field: EditableField) => {
    if (field === 'textField1') {
      const newValue = draftValues.textField1
      const currentValue = snippet.textField1

      console.log('[SnippetNode] commitField called:', {
        field,
        snippetId: snippet.id,
        newValue,
        currentValue,
        areEqual: newValue === currentValue
      })

      if (newValue === currentValue) {
        console.log('[SnippetNode] No change detected, skipping update')
        clearSnippetDirty(snippet.id)
        setActiveField(null)
        return
      }

      setSavingField('textField1')
      markSnippetSaving(snippet.id)

      try {
        console.log('[SnippetNode] Calling onUpdateContent with:', { snippetId: snippet.id, textField1: newValue })
        await onUpdateContent(snippet.id, { textField1: newValue })
        console.log('[SnippetNode] onUpdateContent completed successfully')
        clearSnippetDirty(snippet.id)
        setActiveField(null)
      } catch (error) {
        console.error('Failed to update snippet content:', error)
        toast.error('Failed to save snippet changes', 'Please try again')
        setDraftValues((prev) => ({
          ...prev,
          textField1: currentValue
        }))
        setActiveField(null)
      } finally {
        setSavingField(null)
        clearSnippetSaving(snippet.id)
      }
    } else if (field === 'title') {
      const newValue = draftValues.title
      const currentValue = snippet.title ?? ''

      console.log('[SnippetNode] commitField called:', {
        field,
        snippetId: snippet.id,
        newValue,
        currentValue,
        areEqual: newValue === currentValue
      })

      if (newValue === currentValue) {
        console.log('[SnippetNode] No change detected, skipping update')
        clearSnippetDirty(snippet.id)
        setActiveField(null)
        return
      }

      setSavingField('title')
      markSnippetSaving(snippet.id)

      try {
        console.log('[SnippetNode] Calling onUpdateContent with:', { snippetId: snippet.id, title: newValue })
        await onUpdateContent(snippet.id, { title: newValue })
        console.log('[SnippetNode] onUpdateContent completed successfully')
        clearSnippetDirty(snippet.id)
        setActiveField(null)
      } catch (error) {
        console.error('Failed to update snippet title:', error)
        toast.error('Failed to save title changes', 'Please try again')
        setDraftValues((prev) => ({
          ...prev,
          title: currentValue
        }))
        setActiveField(null)
      } finally {
        setSavingField(null)
        clearSnippetSaving(snippet.id)
      }
    }
  }, [draftValues, onUpdateContent, snippet.id, snippet.textField1, snippet.title, toast, markSnippetSaving, clearSnippetSaving, clearSnippetDirty])

  const handleFieldActivate = useCallback(
    (field: EditableField) =>
      (event?: React.MouseEvent) => {
        // Don't activate fields if Cmd/Ctrl is held (user is multi-selecting)
        if (event && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          return
        }

        // Don't stop propagation - allow selection to work
        // The field will still activate, but the snippet will also be selected

        if (field === 'textField1' && !isTextFieldEditable) {
          return
        }

        if (activeField && activeField !== field) {
          void commitField(activeField)
        }

        setActiveField(field)
        markSnippetDirty(snippet.id)
        if (field === 'textField1') {
          setDraftValues((prev) => ({
            ...prev,
            textField1: snippet.textField1
          }))
        } else if (field === 'title') {
          setDraftValues((prev) => ({
            ...prev,
            title: snippet.title ?? ''
          }))
        }
      },
    [activeField, commitField, snippet.id, snippet.textField1, snippet.title, isTextFieldEditable, markSnippetDirty]
  )

  const handleDraftChange = useCallback(
    (field: EditableField) =>
      (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const { value } = event.target
        setDraftValues((prev) => ({
          ...prev,
          [field]: value
        }))
      },
    []
  )

  const handleBlur = useCallback(
    (field: EditableField) => () => {
      void commitField(field)
    },
    [commitField]
  )

  const handleTextareaKeyDown = useCallback(
    (field: EditableField) =>
      (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          setDraftValues((prev) => ({
            ...prev,
            textField1: snippet.textField1
          }))
          setActiveField(null)
          return
        }

        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          void commitField(field)
        }
      },
    [commitField, snippet.textField1]
  )

  const handleInputKeyDown = useCallback(
    (field: EditableField) =>
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          setDraftValues((prev) => ({
            ...prev,
            title: snippet.title ?? ''
          }))
          setActiveField(null)
          return
        }

        if (event.key === 'Enter') {
          event.preventDefault()
          void commitField(field)
        }
      },
    [commitField, snippet.title]
  )

  // Count connected snippets with images
  const connectedImagesCount = connectedSnippets.filter(s => s.imageS3Key).length
  const hasMultimodalSupport = selectedImageModel === 'gemini-2.5-flash-image'
  const tooManyImages = hasMultimodalSupport && connectedImagesCount > 3

  const wordCount = countWords(snippet.textField1)
  const isLarge = !isTextFieldLocked && wordCount > CANVAS_CONSTANTS.WORD_LIMIT

  const displayText1 = isLarge
    ? truncateToWords(snippet.textField1, CANVAS_CONSTANTS.WORD_LIMIT)
    : snippet.textField1

  const displayTitle = snippet.title && snippet.title.trim() !== ''
    ? snippet.title
    : 'New snippet'


  const handleExpandToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the snippet click handler
    // Don't expand if Cmd/Ctrl is held (user is multi-selecting)
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      return
    }
    if (isLarge) {
      onEdit(snippet.id)
    }
  }, [isLarge, snippet.id, onEdit])

  const handleIdClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Don't trigger focus if Cmd/Ctrl is held (user is multi-selecting)
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      return
    }
    onFocusSnippet(snippet.id)
  }, [onFocusSnippet, snippet.id])

  const handleConnectedSnippetClick = useCallback(
    (connectedSnippetId: string) => (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation()
      // Don't navigate if Cmd/Ctrl is held (user is multi-selecting)
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault()
        return
      }
      onFocusSnippet(connectedSnippetId)
    },
    [onFocusSnippet]
  )

  const handleConnectedSnippetKeyDown = useCallback(
    (connectedSnippetId: string) => (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        if (event.metaKey || event.ctrlKey) {
          return
        }
        onFocusSnippet(connectedSnippetId)
      }
    },
    [onFocusSnippet]
  )

  const handleCreateUpstreamSnippetClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      // Don't create snippet if Cmd/Ctrl is held (user is multi-selecting)
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault()
        return
      }
      if (!onCreateUpstreamSnippet) {
        return
      }

      void onCreateUpstreamSnippet(snippet.id)
    },
    [onCreateUpstreamSnippet, snippet.id]
  )

  const runTextGeneration = useCallback(async (rawPrompt: string) => {
    const trimmedPrompt = rawPrompt.trim()

    if (trimmedPrompt === '') {
      toast.warning('Please provide prompt content before generating')
      const handledError = new Error('Missing prompt content')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    if (!selectedTextModel || selectedTextModel === '') {
      toast.warning('Please select a text model')
      const handledError = new Error('Missing text model selection')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    if (!projectId) {
      toast.error('Cannot generate: missing project ID')
      const handledError = new Error('Missing project identifier')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    setIsGeneratingText(true)

    try {
      // Log the generation call
      // eslint-disable-next-line no-console
      console.log('=== Text Generation Request ===')
      // eslint-disable-next-line no-console
      console.log('Model ID:', selectedTextModel)
      // eslint-disable-next-line no-console
      console.log('Prompt:', trimmedPrompt)
      // eslint-disable-next-line no-console
      console.log('Snippet ID:', snippet.id)
      // eslint-disable-next-line no-console
      console.log('Project ID:', projectId)

      // Call generation API
      const { result, fallbackReason } = await generateStream(
        projectId,
        snippet.id,
        selectedTextModel,
        trimmedPrompt
      )

      // Log the result
      // eslint-disable-next-line no-console
      console.log('=== Text Generation Response ===')
      // eslint-disable-next-line no-console
      console.log('Result:', result)
      // eslint-disable-next-line no-console
      console.log('Fallback Reason:', fallbackReason)

      if (!result?.content || result.content.trim() === '') {
        toast.warning(
          'The selected model did not return any content',
          'Please try again or choose another model'
        )
        const handledError = new Error('Empty generation result')
        Object.assign(handledError, { handled: true })
        throw handledError
      }

      // Create new snippet with generated content
      await onGenerateText(snippet.id, result.content)

      if (fallbackReason) {
        toast.info('Generation completed with fallback', fallbackReason)
      }
    } catch (error) {
      console.error('=== Text Generation Error ===')
      console.error('Error:', error)
      if (!(error instanceof Error && 'handled' in error && (error as { handled?: boolean }).handled)) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        toast.error('Failed to generate text', message)
        if (error instanceof Error) {
          Object.assign(error, { handled: true })
        }
      }
      throw error
    } finally {
      setIsGeneratingText(false)
    }
  }, [selectedTextModel, projectId, generateStream, snippet.id, onGenerateText, toast])

  const runSceneGeneration = useCallback(async (prompt: string) => {
    const trimmedPrompt = prompt.trim()

    if (trimmedPrompt === '') {
      toast.warning('Please provide prompt content before generating scenes')
      const handledError = new Error('Missing prompt content')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    if (!selectedSceneModel || selectedSceneModel === '') {
      toast.warning('Please select a scene model')
      const handledError = new Error('Missing scene model selection')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    if (!projectId) {
      toast.error('Cannot generate scenes: missing project ID')
      const handledError = new Error('Missing project identifier')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    setIsGeneratingScenes(true)

    try {
      // Log the generation call
      // eslint-disable-next-line no-console
      console.log('=== Scene Generation Request ===')
      // eslint-disable-next-line no-console
      console.log('Model ID:', selectedSceneModel)
      // eslint-disable-next-line no-console
      console.log('Prompt:', trimmedPrompt)
      // eslint-disable-next-line no-console
      console.log('Snippet ID:', snippet.id)
      // eslint-disable-next-line no-console
      console.log('Project ID:', projectId)

      // Call scene generation API (creates scenes in backend)
      const result = await createScenes(
        projectId,
        snippet.id,
        selectedSceneModel,
        trimmedPrompt
      )

      // Log the result
      // eslint-disable-next-line no-console
      console.log('=== Scene Generation Response ===')
      // eslint-disable-next-line no-console
      console.log('Scenes created:', result?.scenes?.length ?? 0)

      if (!result?.scenes || result.scenes.length === 0) {
        toast.warning(
          'No scenes were generated',
          'Please try again with different content or model'
        )
        const handledError = new Error('Empty scenes result')
        Object.assign(handledError, { handled: true })
        throw handledError
      }

      // Show success message
      toast.success(`Created ${result.scenes.length} scenes from story!`)
    } catch (error) {
      console.error('=== Scene Generation Error ===')
      console.error('Error:', error)
      if (!(error instanceof Error && 'handled' in error && (error as { handled?: boolean }).handled)) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        toast.error('Failed to generate scenes', message)
        if (error instanceof Error) {
          Object.assign(error, { handled: true })
        }
      }
      throw error
    } finally {
      setIsGeneratingScenes(false)
    }
  }, [selectedSceneModel, projectId, createScenes, snippet.id, toast])

  return (
    <>
      {/* React Flow handles for connections */}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div
        className="p-3 w-[900px]"
        data-testid="snippet-node"
        data-snippet-id={snippet.id}
      >
        {/* Header with title or snippet label and ID */}
        <div className="flex items-center justify-between text-sm font-bold text-gray-900 uppercase mb-1">
          {activeField === 'title' ? (
            <input
              ref={titleRef}
              type="text"
              className="flex-1 text-sm font-bold tracking-wide text-gray-900 uppercase bg-white border border-blue-200 rounded-sm px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300 mr-2"
              value={draftValues.title}
              onChange={handleDraftChange('title')}
              onBlur={handleBlur('title')}
              onKeyDown={handleInputKeyDown('title')}
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              placeholder="Title..."
              style={POINTER_EVENTS_STYLES.interactive}
            />
          ) : (
            <button
              type="button"
              className="tracking-wide text-left cursor-text bg-transparent border-none p-0 focus-visible:outline-none hover:text-gray-800 transition-colors uppercase"
              onClick={handleFieldActivate('title')}
              style={POINTER_EVENTS_STYLES.interactive}
            >
              {displayTitle}
            </button>
          )}
          <button
            type="button"
            onClick={handleIdClick}
            className="font-mono text-[11px] text-gray-400 hover:text-blue-600 hover:underline transition-colors cursor-pointer bg-transparent border-none p-0"
            style={POINTER_EVENTS_STYLES.interactive}
            title="Click to zoom and center this snippet"
          >
            #{snippet.id.slice(0, 8)}
          </button>
        </div>

        {/* Text Field 1 */}
        {!isTextFieldLocked && !hideTextFieldDueToConnections && (
          <div className="mb-2">
            {isTextFieldReadOnlyDueToConnections ? (
              <div
                className="w-full text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-sm p-2 whitespace-pre-wrap break-words"
              >
                {displayText1}
              </div>
            ) : activeField === 'textField1' ? (
              <textarea
                ref={textField1Ref}
                className="w-full text-sm font-medium text-gray-900 bg-white border border-blue-200 rounded-sm p-1 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                value={draftValues.textField1}
                onChange={handleDraftChange('textField1')}
                onBlur={handleBlur('textField1')}
                onKeyDown={handleTextareaKeyDown('textField1')}
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                rows={Math.min(6, Math.max(2, draftValues.textField1.split('\n').length))}
                placeholder="Input..."
                style={POINTER_EVENTS_STYLES.interactive}
              />
            ) : (
              <button
                type="button"
                className="w-full text-left font-medium text-sm text-gray-900 break-words cursor-text bg-transparent border-none p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1 focus-visible:ring-offset-white rounded-sm"
                onClick={handleFieldActivate('textField1')}
                style={POINTER_EVENTS_STYLES.interactive}
              >
                {(displayText1 && displayText1.trim() !== '') ? displayText1 : 'Input...'}
              </button>
            )}

            {/* Large snippet indicator and expand button */}
            {isLarge && (
              <button
                onClick={handleExpandToggle}
                className="mt-2 w-full text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1 py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                style={POINTER_EVENTS_STYLES.interactive}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                View Full ({wordCount} words)
              </button>
            )}
          </div>
        )}

        {/* Connected content aggregate */}
        {connectedContent.length > 0 && (
          <div
            className="mb-2"
            style={POINTER_EVENTS_STYLES.interactive}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="space-y-2">
              {connectedContent.map((item, index) => {
                const truncatedId = item.snippetId.slice(0, 8)
                const connectedDisplayTitle =
                  item.snippetTitle && item.snippetTitle.trim() !== ''
                    ? item.snippetTitle.trim()
                    : 'Snippet'
                return (
                  <div
                    key={`${snippet.id}-connected-${item.snippetId}-${index}-${item.type}`}
                    role="button"
                    tabIndex={0}
                    onClick={handleConnectedSnippetClick(item.snippetId)}
                    onKeyDown={handleConnectedSnippetKeyDown(item.snippetId)}
                    onMouseDown={(event) => event.stopPropagation()}
                    className="group overflow-hidden rounded border border-gray-200 bg-gray-50 transition-colors hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                    style={POINTER_EVENTS_STYLES.interactive}
                    title={`Focus snippet ${item.snippetId}`}
                  >
                    <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
                      <p className="text-[10px] text-gray-500 font-medium transition-colors group-hover:text-blue-600 group-hover:underline">
                        {connectedDisplayTitle}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">#{truncatedId}</p>
                    </div>
                    {item.type === 'text' ? (
                      <p className="px-2 pb-1.5 text-sm font-medium text-gray-900 whitespace-pre-wrap">
                        {item.value}
                      </p>
                    ) : (
                      <img
                        src={item.value}
                        alt={`Connected from snippet ${item.snippetId}`}
                        className="block w-full h-auto max-h-48 object-cover"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-2">
          <button
            type="button"
            onClick={handleCreateUpstreamSnippetClick}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full text-xs font-semibold text-blue-600 border border-blue-200 rounded-md py-1 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            style={POINTER_EVENTS_STYLES.interactive}
          >
            + snippet
          </button>
        </div>

        {/* Image Preview */}
        {snippet.imageUrl && (
          <div className="mt-2">
            {isImageLoading && (
              <div className="w-full h-48 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse rounded-md" />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(snippet.id)
              }}
              className="w-full rounded-md border border-gray-200 hover:border-blue-400 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Click to view full image and edit snippet"
              style={{ display: isImageLoading ? 'none' : 'block', pointerEvents: 'auto' }}
            >
              <img
                src={snippet.imageUrl}
                alt={snippet.title ?? 'Snippet generated image'}
                className="w-full h-auto rounded-md"
                onLoad={() => setIsImageLoading(false)}
                onError={(e) => {
                  setIsImageLoading(false)
                  e.currentTarget.parentElement!.style.display = 'none'
                }}
              />
            </button>
          </div>
        )}

        {/* Downstream connections section */}
        {snippet.downstreamConnections && snippet.downstreamConnections.length > 0 && (
          <div className="mt-2 flex items-start justify-between">
            <span className="text-xs text-gray-500 tracking-wide">Connected:</span>
            <div className="flex flex-col items-end gap-0.5">
              {snippet.downstreamConnections.map((connection, index) => (
                <button
                  key={`${snippet.id}-downstream-${connection.id}-${index}`}
                  type="button"
                  onClick={handleConnectedSnippetClick(connection.id)}
                  onMouseDown={(event) => event.stopPropagation()}
                  className="text-[11px] text-gray-400 hover:text-blue-600 hover:underline transition-colors cursor-pointer bg-transparent border-none p-0"
                  style={POINTER_EVENTS_STYLES.interactive}
                  title={`Focus snippet ${connection.id}`}
                >
                  {connection.title && connection.title.trim() !== ''
                    ? connection.title.trim()
                    : 'Snippet'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Generation Section */}
        {connectedContent.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              // Don't toggle if Cmd/Ctrl is held (user is multi-selecting)
              if (e.metaKey || e.ctrlKey) {
                e.preventDefault()
                return
              }
              setIsGenerateExpanded(!isGenerateExpanded)
            }}
            className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 transition-colors py-1"
            style={POINTER_EVENTS_STYLES.interactive}
          >
            <span>Generate</span>
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${isGenerateExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {isGenerateExpanded && (
            <div className="mt-2 space-y-1.5">
              {/* Text Generation Row */}
              <div className="flex gap-2">
                <select
                  value={selectedTextModel}
                  onChange={(e) => {
                    e.stopPropagation()
                    setSelectedTextModel(e.target.value)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  disabled={savingField !== null}
                  style={POINTER_EVENTS_STYLES.interactive}
                >
                  <option value="" disabled>
                    {isLoadingTextModels ? 'Loading text models...' : 'Select text model...'}
                  </option>
                  {textModels.map((model) => (
                    <option key={model.id} value={model.id} title={model.description ?? undefined}>
                      {model.displayName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed rounded transition-colors"
                  onClick={(event) => {
                    event.stopPropagation()
                    // Don't open prompt designer if Cmd/Ctrl is held (user is multi-selecting)
                    if (event.metaKey || event.ctrlKey) {
                      event.preventDefault()
                      return
                    }
                    openPromptDesigner({
                      snippetId: snippet.id,
                      snippetTitle: displayTitle,
                      mode: 'text',
                      initialPrompt: snippet.textField1,
                      connectedContent: connectedContent,
                      onGenerate: (nextPrompt) => runTextGeneration(nextPrompt)
                    })
                  }}
                  disabled={isGeneratingText || isLoadingTextModels || (!selectedTextModel && textModels.length > 0) || savingField !== null}
                  style={POINTER_EVENTS_STYLES.interactive}
                  aria-label="Generate text content"
                  title={
                    isLoadingTextModels
                      ? 'Loading models...'
                      : !selectedTextModel
                        ? 'Please select a text model first'
                        : 'Generate text content for this snippet'
                  }
                >
                  {isGeneratingText ? (
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Scene Generation Row */}
              <div className="flex gap-2">
                <select
                  value={selectedSceneModel}
                  onChange={(e) => {
                    e.stopPropagation()
                    setSelectedSceneModel(e.target.value)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={savingField !== null}
                  style={POINTER_EVENTS_STYLES.interactive}
                >
                  <option value="" disabled>
                    {isLoadingTextModels ? 'Loading scene models...' : 'Select scene model...'}
                  </option>
                  {textModels.map((model) => (
                    <option key={model.id} value={model.id} title={model.description ?? undefined}>
                      {model.displayName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed rounded transition-colors"
                  onClick={(event) => {
                    event.stopPropagation()
                    // Don't open prompt designer if Cmd/Ctrl is held (user is multi-selecting)
                    if (event.metaKey || event.ctrlKey) {
                      event.preventDefault()
                      return
                    }
                    openPromptDesigner({
                      snippetId: snippet.id,
                      snippetTitle: displayTitle,
                      mode: 'scenes',
                      initialPrompt: snippet.textField1,
                      connectedContent: connectedContent,
                      onGenerate: (nextPrompt) => runSceneGeneration(nextPrompt)
                    })
                  }}
                  disabled={isGeneratingScenes || isLoadingTextModels || (!selectedSceneModel && textModels.length > 0) || savingField !== null}
                  style={POINTER_EVENTS_STYLES.interactive}
                  aria-label="Generate scenes from story"
                  title={
                    isLoadingTextModels
                      ? 'Loading models...'
                      : !selectedSceneModel
                        ? 'Please select a scene model first'
                        : 'Generate scenes from story'
                  }
                >
                  {isGeneratingScenes ? (
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    'S'
                  )}
                </button>
              </div>

              {/* Image Generation Row */}
              <div className="flex gap-2">
                <select
                  value={selectedImageModel}
                  onChange={(e) => {
                    e.stopPropagation()
                    setSelectedImageModel(e.target.value)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  disabled={isGeneratingImage || savingField !== null}
                  style={POINTER_EVENTS_STYLES.interactive}
                >
                  <option value="" disabled>
                    {isLoadingImageModels ? 'Loading image models...' : 'Select image model...'}
                  </option>
                  {imageModels.map((model) => (
                    <option key={model.id} value={model.id} title={model.description ?? undefined}>
                      {model.displayName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed rounded transition-colors"
                  onClick={(event) => {
                    event.stopPropagation()
                    // Don't open prompt designer if Cmd/Ctrl is held (user is multi-selecting)
                    if (event.metaKey || event.ctrlKey) {
                      event.preventDefault()
                      return
                    }
                    openPromptDesigner({
                      snippetId: snippet.id,
                      snippetTitle: displayTitle,
                      mode: 'image',
                      initialPrompt: snippet.textField1,
                      connectedContent: connectedContent,
                      onGenerate: async (nextPrompt) => {
                        const trimmedPrompt = nextPrompt.trim()
                        if (trimmedPrompt === '') {
                          toast.warning('Please provide prompt content for image generation')
                          const handledError = new Error('Missing prompt content for image generation')
                          Object.assign(handledError, { handled: true })
                          throw handledError
                        }

                        if (!selectedImageModel || selectedImageModel === '') {
                          toast.warning('Please select an image model')
                          const handledError = new Error('Missing image model selection')
                          Object.assign(handledError, { handled: true })
                          throw handledError
                        }

                        onGenerateImage(snippet.id, selectedImageModel, trimmedPrompt)
                      }
                    })
                  }}
                  disabled={isGeneratingImage || isLoadingImageModels || (!selectedImageModel && imageModels.length > 0) || tooManyImages || savingField !== null}
                  style={POINTER_EVENTS_STYLES.interactive}
                  aria-label="Generate image content"
                  title={
                    isLoadingImageModels
                      ? 'Loading models...'
                      : !selectedImageModel
                        ? 'Please select an image model first'
                        : tooManyImages
                          ? `Too many connected images (${connectedImagesCount}). Remove connections to use ≤3.`
                          : 'Generate image for this snippet'
                  }
                >
                  {isGeneratingImage ? (
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Video Generation Row */}
              <div className="flex gap-2">
                <select
                  value={selectedVideoModel}
                  onChange={(e) => {
                    e.stopPropagation()
                    setSelectedVideoModel(e.target.value)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  disabled={savingField !== null || isLoadingVideoModels}
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
                  className="inline-flex items-center justify-center p-2 text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed rounded transition-colors"
                  onClick={(event) => {
                    event.stopPropagation()
                    // Don't open prompt designer if Cmd/Ctrl is held (user is multi-selecting)
                    if (event.metaKey || event.ctrlKey) {
                      event.preventDefault()
                      return
                    }
                    const targetModel = selectedVideoModel || videoModels[0]?.id || VIDEO_GENERATION.DEFAULT_MODEL

                    openPromptDesigner({
                      snippetId: snippet.id,
                      snippetTitle: displayTitle,
                      mode: 'video',
                      initialPrompt: snippet.textField1,
                      connectedContent: connectedContent,
                      onGenerate: async (finalPrompt) => {
                        await onUpdateContent(snippet.id, { textField1: finalPrompt })
                        await onGenerateVideo(snippet.id, {
                          modelId: targetModel,
                          duration: VIDEO_GENERATION.DEFAULT_DURATION,
                          aspectRatio: VIDEO_GENERATION.DEFAULT_ASPECT_RATIO,
                          resolution: VIDEO_GENERATION.DEFAULT_RESOLUTION,
                          style: VIDEO_GENERATION.DEFAULT_STYLE,
                          movementAmplitude: VIDEO_GENERATION.DEFAULT_MOVEMENT_AMPLITUDE
                        })
                      }
                    })
                  }}
                  disabled={
                    isGeneratingVideo ||
                    isLoadingVideoModels ||
                    (!selectedVideoModel && videoModels.length > 0) ||
                    hasTooManyVideoReferences
                  }
                  style={POINTER_EVENTS_STYLES.interactive}
                  aria-label="Generate video content"
                  title={
                    isGeneratingVideo
                      ? 'Video generation in progress...'
                      : isLoadingVideoModels
                        ? 'Loading video models...'
                        : !selectedVideoModel
                          ? 'Please select a video model first'
                          : hasTooManyVideoReferences
                            ? `Too many reference images (${connectedImageReferences.length}/${videoReferenceLimit}). Remove connections before generating.`
                            : 'Generate video content for this snippet'
                  }
                >
                  {isGeneratingVideo ? (
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Warning for too many images */}
              {tooManyImages && (
                <div className="text-[10px] text-red-600 flex items-start gap-1" style={POINTER_EVENTS_STYLES.interactive}>
                  <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Too many images ({connectedImagesCount}). Remove connections to use ≤3.</span>
                </div>
              )}

              {hasTooManyVideoReferences && (
                <div className="text-[10px] text-red-600 flex items-start gap-1" style={POINTER_EVENTS_STYLES.interactive}>
                  <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>
                    Too many reference images for this model ({connectedImageReferences.length}/{videoReferenceLimit}). Remove connections before generating.
                  </span>
                </div>
              )}

              {/* Info about multimodal support */}
              {hasMultimodalSupport && connectedImagesCount > 0 && !tooManyImages && (
                <div className="text-[10px] text-gray-500 flex items-start gap-1" style={POINTER_EVENTS_STYLES.interactive}>
                  <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Using {connectedImagesCount} connected image{connectedImagesCount > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {savingField !== null && (
          <div className="text-[11px] text-gray-400 mt-1">
            Saving...
          </div>
        )}

        {/* Tags */}
        {snippet.tags && snippet.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {snippet.tags.slice(0, 3).map((tag, index) => (
              <span
                key={`${snippet.id}-tag-${index}`}
                className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
              >
                {tag}
              </span>
            ))}
            {snippet.tags.length > 3 && (
              <span className="text-xs text-gray-500 px-1.5 py-0.5">
                +{snippet.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Categories */}
        {snippet.categories && snippet.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {snippet.categories.slice(0, 2).map((category, index) => (
              <span
                key={`${snippet.id}-cat-${index}`}
                className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded"
              >
                {category}
              </span>
            ))}
            {snippet.categories.length > 2 && (
              <span className="text-xs text-gray-500 px-1.5 py-0.5">
                +{snippet.categories.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  )
})

SnippetNode.displayName = 'SnippetNode'
