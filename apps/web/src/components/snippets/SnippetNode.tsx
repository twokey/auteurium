import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Handle, Position } from 'reactflow'

import { VideoSnippetNode } from './VideoSnippetNode'
import { ImageSnippetNode } from './ImageSnippetNode'
import { SnippetNodeContent } from '../../features/snippets/components/SnippetNodeContent'
import { CANVAS_CONSTANTS, VIDEO_GENERATION } from '../../constants'
import { useOptimisticUpdatesStore } from '../../features/canvas/store/optimisticUpdatesStore'
import { usePromptDesignerStore, type PromptDesignerGeneratePayload } from '../../features/canvas/store/promptDesignerStore'
import { useVideoPromptStore } from '../../features/snippets/store/videoPromptStore'
import { useGenAI } from '../../hooks/useGenAI'
import { useToast } from '../../store/toastStore'
import { countWords, truncateToWords } from '../../utils/textUtils'
import { VIDU_Q2_MODEL_CONFIG } from './videoPromptUtils'

import type { AvailableModel, ConnectedContentItem, GeneratedVideoSnippetData, VideoGenerationInput } from '../../types'

type SnippetGenerationMeta = {
  prompt?: string
  generationId?: string | null
  generationCreatedAt?: string | null
}

interface SnippetNodeProps {
  id: string
  data: {
    snippet: {
      id: string
      title: string
      content: Record<string, {
        label?: string
        value: string
        type?: string
        isSystem?: boolean
        order?: number
      }>
      tags?: string[]
      connectionCount: number
      imageUrl?: string | null
      imageS3Key?: string | null
      imageMetadata?: {
        width: number
        height: number
        aspectRatio: string
      } | null
      videoS3Key?: string | null
      videoUrl?: string | null
      videoMetadata?: {
        duration: number
        resolution: string
        aspectRatio: string
        style?: string
        seed?: number
        format?: string
        fileSize?: number
        movementAmplitude?: string
      } | null
      connectedContent?: ConnectedContentItem[]
      downstreamConnections?: { id: string; title?: string }[]
      snippetType?: 'text' | 'image' | 'video' | 'audio' | 'generic'
    }
    onEdit: (snippetId: string) => void
    onDelete: (snippetId: string) => void
    onManageConnections: (snippetId: string) => void
    onViewVersions: (snippetId: string) => void
    onUpdateContent: (snippetId: string, changes: Partial<{ title: string; content: Record<string, any> }>) => Promise<void>
    onCombine: (snippetId: string) => Promise<void>
    onGenerateImage: (snippetId: string, modelId?: string, promptOverride?: string, meta?: SnippetGenerationMeta) => void
    onGenerateText: (snippetId: string, content: string, meta?: SnippetGenerationMeta) => Promise<void>
    onGenerateVideo: (snippetId: string, options: VideoGenerationInput) => Promise<void> | void
    onGenerateVideoSnippetFromJson: (snippetId: string, data: GeneratedVideoSnippetData, meta?: SnippetGenerationMeta) => Promise<void>
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
  selected?: boolean
  isConnectable?: boolean
}

type EditableField = string

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

const stripMarkdownFence = (content: string): string => {
  const trimmed = content.trim()
  if (!trimmed.startsWith('```')) {
    return trimmed
  }

  const lines = trimmed.split('\n')
  lines.shift()
  if (lines.length > 0 && lines[lines.length - 1].trim().startsWith('```')) {
    lines.pop()
  }

  return lines.join('\n').trim()
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const safeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const safeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  const cleaned = value
    .map((entry) => safeString(entry))
    .filter((entry): entry is string => Boolean(entry))

  return cleaned.length > 0 ? cleaned : undefined
}

const parseJsonWithRecovery = (rawContent: string): unknown => {
  const cleaned = stripMarkdownFence(rawContent)

  try {
    return JSON.parse(cleaned)
  } catch (error) {
    const lastBrace = cleaned.lastIndexOf('}')
    const lastBracket = cleaned.lastIndexOf(']')
    const cutPos = Math.max(lastBrace, lastBracket)

    if (cutPos === -1) {
      throw error
    }

    const truncated = cleaned.slice(0, cutPos + 1)
    return JSON.parse(truncated)
  }
}

const normalizeVideoSnippetPayload = (parsed: unknown): Record<string, unknown> => {
  if (Array.isArray(parsed)) {
    const firstRecord = parsed.find(isRecord)
    if (firstRecord) {
      return firstRecord as Record<string, unknown>
    }
  }

  if (isRecord(parsed)) {
    const candidateSources: unknown[] = [
      parsed.videoSnippet,
      parsed.video_snippet,
      parsed.snippet,
      parsed.video,
      parsed.videoSnippets,
      parsed.video_snippets,
      parsed.snippets
    ]

    for (const candidate of candidateSources) {
      if (isRecord(candidate)) {
        return candidate as Record<string, unknown>
      }
      if (Array.isArray(candidate)) {
        const nestedRecord = candidate.find(isRecord)
        if (nestedRecord) {
          return nestedRecord as Record<string, unknown>
        }
      }
    }

    return parsed as Record<string, unknown>
  }

  throw new Error('Model response did not include a video snippet payload')
}

const parseLabeledValue = (source: string, labels: string[]): string | undefined => {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*:\\s*([^\\n]+)`, 'i')
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

const parseVideoSnippetContent = (content: string): GeneratedVideoSnippetData => {
  let parsed: unknown

  try {
    parsed = parseJsonWithRecovery(content)
  } catch (error) {
    const parseError = new Error('Model response was not valid JSON for a video snippet')
    Object.assign(parseError, { cause: error })
    throw parseError
  }

  const payload = normalizeVideoSnippetPayload(parsed)

  const directSubject = safeString(payload.subject)
  const directAction = safeString(payload.action)
  const directStyle = safeString(payload.style)
  const directCameraMotion = safeString(payload.cameraMotion ?? payload.camera_positioning_and_motion)
  const directComposition = safeString(payload.composition)
  const directFocusLens = safeString(payload.focusLens ?? payload.focus_and_lens_effects)
  const directAmbiance = safeString(payload.ambiance ?? payload.ambience)
  const directDialogue = safeString(payload.dialogue)
  const directSfx = safeString(payload.soundEffects ?? payload.sound_effects)
  const directAmbientNoise = safeString(payload.ambientNoise ?? payload.ambient_noise)

  let sceneTitle: string | undefined
  let sceneContent: string | undefined
  if (Array.isArray(payload.scenes) && payload.scenes.length > 0) {
    const firstScene = payload.scenes.find(isRecord) as Record<string, unknown> | undefined
    if (firstScene) {
      sceneTitle = safeString(firstScene.title)
      sceneContent = safeString(firstScene.content)
    }
  }

  const combinedContent = safeString(payload.content) ?? sceneContent ?? safeString(payload.prompt ?? payload.description)

  const parsedSubject = parseLabeledValue(combinedContent ?? '', ['Subject'])
  const parsedAction = parseLabeledValue(combinedContent ?? '', ['Action'])
  const parsedStyle = parseLabeledValue(combinedContent ?? '', ['Style'])
  const parsedCameraMotion = parseLabeledValue(combinedContent ?? '', ['Camera positioning and motion', 'Camera & Motion'])
  const parsedComposition = parseLabeledValue(combinedContent ?? '', ['Composition'])
  const parsedFocusLens = parseLabeledValue(combinedContent ?? '', ['Focus and lens effects', 'Focus & Lens'])
  const parsedAmbiance = parseLabeledValue(combinedContent ?? '', ['Ambiance', 'Ambience'])
  const parsedDialogue = parseLabeledValue(combinedContent ?? '', ['Dialogue'])
  const parsedSfx = parseLabeledValue(combinedContent ?? '', ['Sound Effects', 'Sound Effects (SFX)', 'Sound'])
  const parsedAmbientNoise = parseLabeledValue(combinedContent ?? '', ['Ambient Noise'])

  const title = safeString(payload.title ?? payload.name ?? sceneTitle)
  const mainText = combinedContent
  const tags = safeStringArray(payload.tags)

  return {
    ...(title ? { title } : {}),
    ...(mainText ? { mainText } : {}),
    ...(tags ? { tags } : {}),
    subject: directSubject ?? parsedSubject ?? undefined,
    action: directAction ?? parsedAction ?? undefined,
    style: directStyle ?? parsedStyle ?? undefined,
    cameraMotion: directCameraMotion ?? parsedCameraMotion ?? undefined,
    composition: directComposition ?? parsedComposition ?? undefined,
    focusLens: directFocusLens ?? parsedFocusLens ?? undefined,
    ambiance: directAmbiance ?? parsedAmbiance ?? undefined,
    dialogue: directDialogue ?? parsedDialogue ?? undefined,
    soundEffects: directSfx ?? parsedSfx ?? undefined,
    ambientNoise: directAmbientNoise ?? parsedAmbientNoise ?? undefined
  }
}

const buildVideoSnippetText = (data: GeneratedVideoSnippetData): string => {
  const parts: string[] = []
  const push = (label: string, value?: string) => {
    if (value && value.trim() !== '') {
      parts.push(`${label}: ${value.trim()}`)
    }
  }
  push('Subject', data.subject)
  push('Action', data.action)
  push('Camera & Motion', data.cameraMotion)
  push('Composition', data.composition)
  push('Focus & Lens', data.focusLens)
  push('Style', data.style)
  push('Ambiance', data.ambiance)
  push('Dialogue', data.dialogue)
  push('Sound Effects', data.soundEffects)
  push('Ambient Noise', data.ambientNoise)
  if (parts.length === 0 && data.mainText) {
    return data.mainText
  }
  if (data.mainText && parts.length > 0) {
    parts.push(`Notes: ${data.mainText}`)
  }
  return parts.join('\n')
}

export const SnippetNode = memo(({ data, id, selected, isConnectable }: SnippetNodeProps) => {
  // Call all hooks before any conditional returns (Rules of Hooks)
  const toast = useToast()
  const { id: projectId } = useParams<{ id: string }>()
  const { generate, createScenes } = useGenAI({ enabled: true })
  const openPromptDesigner = usePromptDesignerStore((state) => state.open)
  const promptDesignerSnippetId = usePromptDesignerStore((state) => state.snippetId)
  const { markSnippetDirty, clearSnippetDirty, markSnippetSaving, clearSnippetSaving } = useOptimisticUpdatesStore()

  const {
    snippet,
    onEdit,
    onUpdateContent,
    onGenerateImage,
    onGenerateText,
    onGenerateVideo,
    onGenerateVideoSnippetFromJson,
    onFocusSnippet,
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
  const mainText = snippet.content?.mainText?.value ?? Object.values(snippet.content ?? {})[0]?.value ?? ''
  const isContentEmpty = mainText.trim() === ''
  const hideTextFieldDueToConnections = hasIncomingConnections && isContentEmpty
  const isTextFieldReadOnlyDueToConnections = hasIncomingConnections && !isContentEmpty
  const isTextFieldEditable = !isTextFieldLocked && !isTextFieldReadOnlyDueToConnections

  const [activeField, setActiveField] = useState<EditableField | null>(null)

  // Initialize draft values from content map + title
  const [draftValues, setDraftValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {
      title: snippet.title ?? ''
    }
    Object.entries(snippet.content ?? {}).forEach(([key, field]) => {
      values[key] = field?.value ?? ''
    })
    return values
  })

  const [savingField, setSavingField] = useState<EditableField | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [selectedTextModel, setSelectedTextModel] = useState<string>('')
  const [selectedImageModel, setSelectedImageModel] = useState<string>('')
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('')
  const [selectedSceneModel, setSelectedSceneModel] = useState<string>('')
  const [selectedVideoSnippetModel, setSelectedVideoSnippetModel] = useState<string>('')
  const [isGeneratingText, setIsGeneratingText] = useState(false)
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false)
  const [isGeneratingVideoSnippet, setIsGeneratingVideoSnippet] = useState(false)
  const [isGenerateExpanded, setIsGenerateExpanded] = useState(false)
  const wasSelectedRef = useRef(false)

  const connectedImageReferences = connectedContent.filter((item) => item.type === 'image')
  const videoReferenceLimit = getVideoReferenceLimit(selectedVideoModel || videoModels[0]?.id || '')
  const hasTooManyVideoReferences = connectedImageReferences.length > videoReferenceLimit

  // Sync draft values when snippet updates
  useEffect(() => {
    setDraftValues(prev => {
      const next = { ...prev }

      // Update title if not editing it
      if (activeField !== 'title' && snippet.title !== prev.title) {
        next.title = snippet.title ?? ''
      }

      // Update content fields if not editing them
      Object.entries(snippet.content).forEach(([key, field]) => {
        if (activeField !== key && field.value !== prev[key]) {
          next[key] = field.value
        }
      })

      return next
    })
  }, [snippet.title, snippet.content, activeField])

  // Auto-select first text model when models load
  useEffect(() => {
    if (textModels.length > 0 && selectedTextModel === '') {
      setSelectedTextModel(textModels[0].id)
    }
  }, [textModels, selectedTextModel])

  useEffect(() => {
    if (textModels.length > 0 && selectedVideoSnippetModel === '') {
      setSelectedVideoSnippetModel(textModels[0].id)
    }
  }, [textModels, selectedVideoSnippetModel])

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
    if (activeField === 'title') {
      const target = titleRef.current
      target?.focus()
      target?.select()
    }
  }, [activeField])

  useEffect(() => {
    // If we were editing a field that no longer exists in content (and isn't title), clear active field
    if (activeField && activeField !== 'title' && !snippet.content[activeField]) {
      setActiveField(null)
    }
  }, [snippet.content, activeField])

  const commitField = useCallback(async (field: EditableField) => {
    const newValue = draftValues[field]

    if (field === 'title') {
      const currentValue = snippet.title ?? ''
      if (newValue === currentValue) {
        clearSnippetDirty(snippet.id)
        setActiveField(null)
        return
      }

      setSavingField('title')
      markSnippetSaving(snippet.id)

      try {
        await onUpdateContent(snippet.id, { title: newValue })
        clearSnippetDirty(snippet.id)
        setActiveField(null)
      } catch (error) {
        console.error('Failed to update snippet title:', error)
        toast.error('Failed to save title changes', 'Please try again')
        setDraftValues((prev) => ({ ...prev, title: currentValue }))
        setActiveField(null)
      } finally {
        setSavingField(null)
        clearSnippetSaving(snippet.id)
      }
    } else {
      // Content field
      const currentField = snippet.content[field]
      if (!currentField) return // Field might have been deleted

      if (newValue === currentField.value) {
        clearSnippetDirty(snippet.id)
        setActiveField(null)
        return
      }

      setSavingField(field)
      markSnippetSaving(snippet.id)

      try {
        const updatedContent = {
          ...snippet.content,
          [field]: { ...currentField, value: newValue }
        }
        await onUpdateContent(snippet.id, { content: updatedContent })
        clearSnippetDirty(snippet.id)
        setActiveField(null)
      } catch (error) {
        console.error('Failed to update snippet content:', error)
        toast.error('Failed to save snippet changes', 'Please try again')
        setDraftValues((prev) => ({ ...prev, [field]: currentField.value }))
        setActiveField(null)
      } finally {
        setSavingField(null)
        clearSnippetSaving(snippet.id)
      }
    }
  }, [draftValues, onUpdateContent, snippet.id, snippet.content, snippet.title, toast, markSnippetSaving, clearSnippetSaving, clearSnippetDirty])

  const handleFieldActivate = useCallback((field: EditableField, event?: React.MouseEvent) => {
    if (event && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      return
    }

    if (field !== 'title' && !isTextFieldEditable) {
      return
    }

    if (activeField && activeField !== field) {
      void commitField(activeField)
    }

    setActiveField(field)
    markSnippetDirty(snippet.id)

    // Reset draft value to current value when activating
    if (field === 'title') {
      setDraftValues(prev => ({ ...prev, title: snippet.title ?? '' }))
    } else {
      const contentField = snippet.content[field]
      if (contentField) {
        setDraftValues(prev => ({ ...prev, [field]: contentField.value }))
      }
    }
  }, [activeField, commitField, isTextFieldEditable, markSnippetDirty, snippet.content, snippet.id, snippet.title])

  const handleDraftChange = useCallback(
    (field: EditableField, value: string) => {
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

  const handleAddField = useCallback(async (key: string, value: string) => {
    try {
      const updatedContent = {
        ...snippet.content,
        [key]: {
          label: key,
          value,
          type: 'text',
          isSystem: false,
          order: 999
        }
      }
      await onUpdateContent(snippet.id, { content: updatedContent })
    } catch (error) {
      console.error('Failed to add field:', error)
      toast.error('Failed to add field')
    }
  }, [snippet.content, snippet.id, onUpdateContent, toast])

  const handleDeleteField = useCallback(async (key: string) => {
    try {
      const updatedContent = { ...snippet.content }
      delete updatedContent[key]
      await onUpdateContent(snippet.id, { content: updatedContent })
    } catch (error) {
      console.error('Failed to delete field:', error)
      toast.error('Failed to delete field')
    }
  }, [snippet.content, snippet.id, onUpdateContent, toast])

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

  const wordCount = Object.values(snippet.content ?? {}).reduce((acc, field) => acc + countWords(field?.value), 0)
  const isLarge = !isTextFieldLocked && wordCount > CANVAS_CONSTANTS.WORD_LIMIT


  const displayText1 = isLarge
    ? truncateToWords(mainText, CANVAS_CONSTANTS.WORD_LIMIT)
    : mainText

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

  const runTextGeneration = useCallback(async (payload: PromptDesignerGeneratePayload) => {
    const trimmedPrompt = payload.fullPrompt.trim()
    const userPrompt = (payload.userPrompt ?? '').trim()
    const designerModelId = payload.settings?.type === 'text'
      ? payload.settings.settings.model
      : undefined
    const targetModel = designerModelId || selectedTextModel

    if (trimmedPrompt === '') {
      toast.warning('Please provide prompt content before generating')
      const handledError = new Error('Missing prompt content')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    if (!targetModel || targetModel === '') {
      toast.warning('Please select a text-capable model')
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
      if (designerModelId && designerModelId !== selectedTextModel) {
        setSelectedTextModel(designerModelId)
      }

      // Call generation API
      const result = await generate(
        projectId,
        snippet.id,
        targetModel,
        trimmedPrompt,
        payload.systemPrompt ? { systemPrompt: payload.systemPrompt } : undefined
      )

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
      await onGenerateText(snippet.id, result.content, {
        prompt: userPrompt || trimmedPrompt,
        generationId: result.generationId ?? undefined,
        generationCreatedAt: result.generationCreatedAt ?? undefined
      })
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
  }, [selectedTextModel, projectId, generate, snippet.id, onGenerateText, toast])

  // Auto-open prompt designer when a text snippet is selected (parity with image/video snippets)
  useEffect(() => {
    const wasSelected = wasSelectedRef.current
    wasSelectedRef.current = Boolean(selected)

    if (!selected) {
      return
    }

    if (wasSelected) {
      return
    }

    if (promptDesignerSnippetId === snippet.id) {
      return
    }

    openPromptDesigner({
      snippetId: snippet.id,
      snippetTitle: displayTitle,
      mode: 'text',
      initialPrompt: mainText,
      connectedContent,
      generationSettings: {
        type: 'text',
        settings: {
          model: selectedTextModel || textModels[0]?.id || ''
        }
      },
      onGenerate: (payload) => runTextGeneration(payload)
    })
  }, [
    selected,
    promptDesignerSnippetId,
    snippet.id,
    displayTitle,
    mainText,
    connectedContent,
    openPromptDesigner,
    selectedTextModel,
    textModels,
    runTextGeneration
  ])

  const runSceneGeneration = useCallback(async (payload: PromptDesignerGeneratePayload) => {
    const trimmedPrompt = (payload.userPrompt || payload.fullPrompt).trim()

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
      // Call scene generation API (creates scenes in backend)
      const result = await createScenes(
        projectId,
        snippet.id,
        selectedSceneModel,
        trimmedPrompt
      )

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

  const runVideoSnippetJsonGeneration = useCallback(async (designerPayload: PromptDesignerGeneratePayload) => {
    const trimmedPrompt = designerPayload.fullPrompt.trim()
    const userPrompt = (designerPayload.userPrompt ?? '').trim()

    if (trimmedPrompt === '') {
      toast.warning('Please provide prompt content before generating a video snippet')
      const handledError = new Error('Missing prompt content')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    if (!selectedVideoSnippetModel || selectedVideoSnippetModel === '') {
      toast.warning('Please select a model')
      const handledError = new Error('Missing model selection')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    if (!projectId) {
      toast.error('Cannot generate video snippet: missing project ID')
      const handledError = new Error('Missing project identifier')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    setIsGeneratingVideoSnippet(true)

    try {
      const result = await generate(
        projectId,
        snippet.id,
        selectedVideoSnippetModel,
        trimmedPrompt,
        designerPayload.systemPrompt ? { systemPrompt: designerPayload.systemPrompt } : undefined
      )

      if (!result?.content || result.content.trim() === '') {
        toast.warning(
          'The selected model did not return any content',
          'Please try again or choose another model'
        )
        const handledError = new Error('Empty generation result')
        Object.assign(handledError, { handled: true })
        throw handledError
      }

      const debugPayload = {
        snippetId: snippet.id,
        modelId: selectedVideoSnippetModel,
        contentPreview: result.content.slice(0, 1000),
        contentLength: result.content.length
      }

      console.info('[VideoSnippetGeneration] Raw model response', debugPayload)
      if (typeof window !== 'undefined') {
        // Helpful for inspection if console output is filtered/minified
        ; (window as unknown as { __AUTEURIUM_LAST_VIDEO_SNIPPET_RESPONSE?: unknown }).__AUTEURIUM_LAST_VIDEO_SNIPPET_RESPONSE = {
          ...debugPayload,
          fullContent: result.content
        }
      }

      const parsedData = parseVideoSnippetContent(result.content)
      const generatedPayload: GeneratedVideoSnippetData = {
        ...parsedData
      }

      const composedText = buildVideoSnippetText({
        ...parsedData,
        mainText: parsedData.mainText ?? trimmedPrompt
      })
      generatedPayload.mainText = composedText

      await onGenerateVideoSnippetFromJson(snippet.id, generatedPayload, {
        prompt: userPrompt || trimmedPrompt,
        generationId: result.generationId ?? undefined,
        generationCreatedAt: result.generationCreatedAt ?? undefined
      })
    } catch (error) {
      console.error('=== Video Snippet Generation Error ===')
      console.error('Error:', error)
      if (!(error instanceof Error && 'handled' in error && (error as { handled?: boolean }).handled)) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        toast.error('Failed to generate video snippet', message)
        if (error instanceof Error) {
          Object.assign(error, { handled: true })
        }
      }
      throw error
    } finally {
      setIsGeneratingVideoSnippet(false)
    }
  }, [selectedVideoSnippetModel, projectId, generate, snippet.id, onGenerateVideoSnippetFromJson, toast])

  // Route to VideoSnippetNode if this is a video snippet
  if (snippet.snippetType === 'video') {
    return (
      <VideoSnippetNode
        id={id}
        data={data}
        // @ts-ignore - VideoSnippetNode props might need update but passing for now if it accepts them
        selected={selected}
        // @ts-ignore
        isConnectable={isConnectable}
        onGenerateVideo={onGenerateVideo}
        isGeneratingVideo={isGeneratingVideo}
        videoGenerationProgress={0} // Placeholder as it's not available in data
        onGenerateVideoSnippetFromJson={onGenerateVideoSnippetFromJson}
      />
    )
  }

  if (snippet.snippetType === 'image') {
    return (
      <ImageSnippetNode
        id={id}
        data={data}
        // @ts-ignore
        selected={selected}
        // @ts-ignore
        isConnectable={isConnectable}
        imageModels={imageModels}
        isLoadingImageModels={isLoadingImageModels}
        onGenerateImage={onGenerateImage}
        isGeneratingImage={isGeneratingImage}
      />
    )
  }

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
              onChange={(e) => handleDraftChange('title', e.target.value)}
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
              onClick={(event) => handleFieldActivate('title', event)}
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

        {/* Content Fields */}
        {!isTextFieldLocked && !hideTextFieldDueToConnections && (
          <div className="mb-2">
            {isTextFieldReadOnlyDueToConnections ? (
              <div
                className="w-full text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-sm p-2 whitespace-pre-wrap break-words"
              >
                {displayText1}
              </div>
            ) : (
              <SnippetNodeContent
                content={snippet.content}
                activeField={activeField}
                draftValues={draftValues}
                savingField={savingField}
                onFieldChange={handleDraftChange}
                onFieldActivate={(field) => handleFieldActivate(field)}
                onFieldBlur={(field) => handleBlur(field as EditableField)()}
                onAddField={handleAddField}
                onDeleteField={handleDeleteField}
                isDisabled={false}
              />
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
            onKeyDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            role="presentation"
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
                    ) : item.type === 'image' ? (
                      <img
                        src={item.value}
                        alt={`Connected from snippet ${item.snippetId}`}
                        className="block w-full h-auto max-h-48 object-cover"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    ) : (
                      <video
                        src={item.value}
                        controls
                        playsInline
                        muted
                        className="block w-full h-auto max-h-48 bg-black"
                        aria-hidden="true"
                        tabIndex={-1}
                      >
                        <track kind="captions" />
                      </video>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

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

        {/* Video Preview */}
        {snippet.videoUrl || snippet.videoS3Key ? (
          <div className="mt-2">
            <div className="text-xs font-semibold text-gray-600 mb-1">
              Video Preview
            </div>
            {snippet.videoUrl ? (
              <video
                key={snippet.videoUrl}
                className="w-full rounded-md border border-gray-200"
                src={snippet.videoUrl}
                controls
                playsInline
                muted
              >
                <track kind="captions" />
              </video>
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                Video available but preview URL is not ready.
              </p>
            )}
            {snippet.videoMetadata && (
              <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600">
                <div>
                  <dt className="font-semibold text-gray-800">Duration</dt>
                  <dd>{snippet.videoMetadata.duration}s</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-800">Resolution</dt>
                  <dd>{snippet.videoMetadata.resolution}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-800">Aspect</dt>
                  <dd>{snippet.videoMetadata.aspectRatio}</dd>
                </div>
                {snippet.videoMetadata.fileSize && (
                  <div>
                    <dt className="font-semibold text-gray-800">Size</dt>
                    <dd>{(snippet.videoMetadata.fileSize / (1024 * 1024)).toFixed(2)} MB</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        ) : null}

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
                        initialPrompt: mainText,
                        connectedContent: connectedContent,
                        generationSettings: {
                          type: 'text',
                          settings: {
                            model: selectedTextModel || textModels[0]?.id || ''
                          }
                        },
                        onGenerate: (payload) => runTextGeneration(payload)
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
                        initialPrompt: mainText,
                        connectedContent: connectedContent,
                        onGenerate: (payload) => runSceneGeneration(payload)
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
                        initialPrompt: mainText,
                        connectedContent: connectedContent,
                        onGenerate: (payload) => {
                          const trimmedPrompt = payload.fullPrompt.trim()
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

                          onGenerateImage(snippet.id, selectedImageModel, trimmedPrompt, {
                            prompt: payload.userPrompt?.trim() || trimmedPrompt
                          })
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
                        initialPrompt: mainText,
                        connectedContent: connectedContent,
                        onGenerate: async (payload) => {
                          const finalPrompt = payload.fullPrompt
                          const storeSettings = useVideoPromptStore.getState().modelSettings
                          const latestSettings = payload.settings?.type === 'video'
                            ? payload.settings.settings
                            : storeSettings

                          if (payload.settings?.type === 'video') {
                            useVideoPromptStore.getState().updateModelSettings(payload.settings.settings)
                          }

                          const baseMainTextField = snippet.content?.mainText ?? {
                            label: 'mainText',
                            value: '',
                            type: 'longText',
                            isSystem: true,
                            order: 1
                          }

                          await onUpdateContent(snippet.id, {
                            content: {
                              ...snippet.content,
                              mainText: {
                                ...baseMainTextField,
                                value: finalPrompt,
                                label: baseMainTextField.label ?? 'mainText' // Ensure label exists
                              }
                            }
                          })
                          const designerModel = latestSettings.model && VIDU_Q2_MODEL_CONFIG[latestSettings.model]
                            ? latestSettings.model
                            : undefined
                          const resolvedModel = designerModel || targetModel

                          await onGenerateVideo(snippet.id, {
                            modelId: resolvedModel,
                            duration: latestSettings.duration ?? VIDEO_GENERATION.DEFAULT_DURATION,
                            aspectRatio: VIDEO_GENERATION.DEFAULT_ASPECT_RATIO,
                            resolution: latestSettings.resolution ?? VIDEO_GENERATION.DEFAULT_RESOLUTION,
                            style: VIDEO_GENERATION.DEFAULT_STYLE,
                            seed: latestSettings.seed,
                            movementAmplitude: latestSettings.movementAmplitude ?? VIDEO_GENERATION.DEFAULT_MOVEMENT_AMPLITUDE
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

                {/* Video Snippet Generation Row */}
                <div className="flex gap-2">
                  <select
                    value={selectedVideoSnippetModel}
                    onChange={(e) => {
                      e.stopPropagation()
                      setSelectedVideoSnippetModel(e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                    disabled={savingField !== null}
                    style={POINTER_EVENTS_STYLES.interactive}
                  >
                    <option value="" disabled>
                      {isLoadingTextModels ? 'Loading models...' : 'Select model...'}
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
                      if (event.metaKey || event.ctrlKey) {
                        event.preventDefault()
                        return
                      }

                      openPromptDesigner({
                        snippetId: snippet.id,
                        snippetTitle: displayTitle,
                        mode: 'video',
                        initialPrompt: mainText,
                        connectedContent,
                        onGenerate: async (finalPrompt) => {
                          await runVideoSnippetJsonGeneration(finalPrompt)
                        }
                      })
                    }}
                    disabled={
                      isGeneratingVideoSnippet ||
                      isLoadingTextModels ||
                      (!selectedVideoSnippetModel && textModels.length > 0) ||
                      savingField !== null
                    }
                    style={POINTER_EVENTS_STYLES.interactive}
                    aria-label="Generate video snippet from model"
                    title={
                      isGeneratingVideoSnippet
                        ? 'Video snippet generation in progress...'
                        : isLoadingTextModels
                          ? 'Loading models...'
                          : !selectedVideoSnippetModel
                            ? 'Please select a model first'
                            : 'Generate a new video snippet from model JSON'
                    }
                  >
                    {isGeneratingVideoSnippet ? (
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
      </div>
    </>
  )
})

SnippetNode.displayName = 'SnippetNode'
