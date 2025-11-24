import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { useOptimisticUpdatesStore } from '../../features/canvas/store/optimisticUpdatesStore'
import { SnippetNodeContent } from '../../features/snippets/components/SnippetNodeContent'
import { COMBINE_SNIPPET_CONNECTIONS, DELETE_SNIPPET, GENERATE_SNIPPET_IMAGE, UPDATE_SNIPPET } from '../../graphql/mutations'
import { useGenAI } from '../../hooks/useGenAI'
import { useGraphQLMutation } from '../../hooks/useGraphQLMutation'
import { useToast } from '../../store/toastStore'
import { type SnippetField } from '../../types/domain'

type EditableField = string

interface EditSnippetModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => Promise<void>
  snippet: {
    id: string
    projectId: string
    title?: string
    content: Record<string, SnippetField>
    tags?: string[]
    imageUrl?: string | null
    videoUrl?: string | null
    imageS3Key?: string | null
    imageMetadata?: {
      width: number
      height: number
      aspectRatio: string
    } | null
  }
}

export const EditSnippetModal = ({ isOpen, onClose, onSave, snippet }: EditSnippetModalProps) => {
  const toast = useToast()
  const normalisedTitle = snippet.title && snippet.title.trim() !== '' ? snippet.title : 'New snippet'
  const [title, setTitle] = useState(normalisedTitle)

  // Initialize draft values from content map
  const [draftValues, setDraftValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {}
    Object.entries(snippet.content).forEach(([key, field]) => {
      values[key] = field.value
    })
    return values
  })

  const [tags, setTags] = useState<string[]>(snippet.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [selectedModelPrimary, setSelectedModelPrimary] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCombining, setIsCombining] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [isGeneratingPrimary, setIsGeneratingPrimary] = useState(false)
  const [activeField, setActiveField] = useState<EditableField | null>(null)
  const [savingField, setSavingField] = useState<EditableField | null>(null)

  const {
    models,
    isLoadingModels,
    modelsError,
    generateStream,
    subscribeToGenerationStream,
    isStreamingSupported,
    streamingFallbackReason
  } = useGenAI({ enabled: isOpen })

  const streamSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)
  const assistantContentRef = useRef<string>('')

  // Store last saved values for comparison
  const lastSavedValuesRef = useRef<Record<string, string>>({})

  // Reset form when snippet changes
  useEffect(() => {
    const nextTitle = snippet.title && snippet.title.trim() !== '' ? snippet.title : 'New snippet'
    setTitle(nextTitle)

    const values: Record<string, string> = {}
    Object.entries(snippet.content).forEach(([key, field]) => {
      values[key] = field.value
    })
    setDraftValues(values)
    lastSavedValuesRef.current = { ...values }

    setTags(snippet.tags ?? [])
    setTagInput('')
    setSelectedModelPrimary('')
    setIsDeleting(false)
    setStreamError(null)
    setIsStreaming(false)
    setIsGeneratingPrimary(false)
    setActiveField(null)
    setSavingField(null)

    if (streamSubscriptionRef.current) {
      streamSubscriptionRef.current.unsubscribe()
      streamSubscriptionRef.current = null
    }
    assistantContentRef.current = values.mainText ?? ''
  }, [snippet])

  useEffect(() => {
    if (!isOpen && streamSubscriptionRef.current) {
      streamSubscriptionRef.current.unsubscribe()
      streamSubscriptionRef.current = null
      setIsStreaming(false)
      setIsGeneratingPrimary(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (!selectedModelPrimary && models.length > 0) {
      setSelectedModelPrimary(models[0].id)
    }
  }, [isOpen, models, selectedModelPrimary])

  useEffect(() => () => {
    if (streamSubscriptionRef.current) {
      streamSubscriptionRef.current.unsubscribe()
      streamSubscriptionRef.current = null
    }
  }, [])



  const { mutate: updateSnippetMutation } = useGraphQLMutation(UPDATE_SNIPPET)

  const { markSnippetDeleting, confirmDeletion, rollbackDeletion } = useOptimisticUpdatesStore()

  const { mutate: deleteSnippetMutation } = useGraphQLMutation(DELETE_SNIPPET, {
    onError: (error: Error) => {
      console.error('Failed to delete snippet:', error)
      toast.error('Failed to delete snippet', error.message)
    }
  })

  const { mutate: combineConnectionsMutation } = useGraphQLMutation(COMBINE_SNIPPET_CONNECTIONS, {
    onError: (error: Error) => {
      console.error('Failed to combine snippets:', error)
      toast.error('Failed to combine', error.message)
    }
  })

  const { mutate: generateImageMutation } = useGraphQLMutation(GENERATE_SNIPPET_IMAGE, {
    onError: (error: Error) => {
      console.error('Failed to generate image:', error)
      toast.error('Failed to generate image', error.message)
    }
  })

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const trimmedTitle = title.trim()

      // Construct content object from draftValues
      const updatedContent: Record<string, SnippetField> = {}
      Object.entries(draftValues).forEach(([key, value]) => {
        if (snippet.content[key]) {
          updatedContent[key] = { ...snippet.content[key], value }
        } else {
          // Should not happen if draftValues are in sync, but handle new fields if any
          updatedContent[key] = { value }
        }
      })

      await updateSnippetMutation({
        variables: {
          projectId: snippet.projectId,
          id: snippet.id,
          input: {
            title: trimmedTitle === '' ? undefined : trimmedTitle,
            content: updatedContent,
            tags
          }
        }
      })

      // Call onSave callback to trigger refetch
      if (onSave) {
        await onSave()
      }

      onClose()
    } catch (error) {
      console.error('Failed to update snippet:', error)
      toast.error('Failed to save snippet', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsSaving(false)
    }
  }, [snippet.id, snippet.projectId, snippet.content, title, draftValues, tags, updateSnippetMutation, onSave, onClose, toast])

  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }, [tagInput, tags])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }, [tags])

  const handleTagKeyPress = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }, [handleAddTag])

  const isPrimaryBusy = isGeneratingPrimary || isStreaming

  const handleGenerate = useCallback(async () => {
    if (!selectedModelPrimary) {
      toast.warning('Please select an LLM model before generating')
      return
    }

    // Use mainText or the first available field
    const sourceText = draftValues.mainText || Object.values(draftValues)[0] || ''

    if (sourceText.trim() === '') {
      toast.warning('Please provide input to send to the model')
      return
    }

    setIsGeneratingPrimary(true)

    if (streamSubscriptionRef.current) {
      streamSubscriptionRef.current.unsubscribe()
      streamSubscriptionRef.current = null
    }

    assistantContentRef.current = ''
    setStreamError(null)

    const shouldAttemptStreaming = isStreamingSupported
    if (shouldAttemptStreaming) {
      setIsStreaming(true)
      try {
        streamSubscriptionRef.current = subscribeToGenerationStream(snippet.id, {
          onNext: (event) => {
            // Skip null events (filtered out by server)
            if (!event) return

            if (event.snippetId !== snippet.id) return

            if (event.content) {
              assistantContentRef.current += event.content
              // Update mainText or the active field
              setDraftValues(prev => ({
                ...prev,
                mainText: assistantContentRef.current
              }))
            }

            if (event.isComplete) {
              setDraftValues(prev => ({
                ...prev,
                mainText: assistantContentRef.current
              }))
              setIsStreaming(false)
              if (streamSubscriptionRef.current) {
                streamSubscriptionRef.current.unsubscribe()
                streamSubscriptionRef.current = null
              }
            }
          },
          onError: (error) => {
            const fallbackMessage = streamingFallbackReason ?? 'Streaming is not available right now. You will see the full response once it is ready.'
            console.warn('Streaming disabled. Falling back to non-streaming generation.', error)
            setStreamError(fallbackMessage)
            setIsStreaming(false)
            if (streamSubscriptionRef.current) {
              streamSubscriptionRef.current.unsubscribe()
              streamSubscriptionRef.current = null
            }
          },
          onComplete: () => {
            setIsStreaming(false)
            streamSubscriptionRef.current = null
          }
        })
      } catch (subscriptionError) {
        console.warn('Failed to subscribe to generation stream. Falling back to non-streaming mode.', subscriptionError)
        setStreamError(streamingFallbackReason ?? 'Streaming is not available right now. You will see the full response once it is ready.')
        setIsStreaming(false)
      }
    } else if (streamingFallbackReason) {
      setStreamError(streamingFallbackReason)
    }

    try {
      const { result: generation, usedStreaming, fallbackReason } = await generateStream(
        snippet.projectId,
        snippet.id,
        selectedModelPrimary,
        sourceText
      )

      if (!generation || generation.content.trim() === '') {
        toast.warning('The selected model did not return any content', 'Please try again or choose another model')
        setIsStreaming(false)
        return
      }

      if (!usedStreaming && fallbackReason) {
        setStreamError(fallbackReason)
      }

      assistantContentRef.current = generation.content
      setDraftValues(prev => ({
        ...prev,
        mainText: generation.content
      }))
    } catch (error) {
      console.error('Failed to generate content:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      setStreamError(message)
      toast.error('Failed to generate content', message)
    } finally {
      if (streamSubscriptionRef.current) {
        streamSubscriptionRef.current.unsubscribe()
        streamSubscriptionRef.current = null
      }
      setIsStreaming(false)
      setIsGeneratingPrimary(false)
    }
  }, [
    generateStream,
    isStreamingSupported,
    selectedModelPrimary,
    snippet.id,
    snippet.projectId,
    streamingFallbackReason,
    subscribeToGenerationStream,
    draftValues,
    toast
  ])

  const handleDelete = useCallback(async () => {
    const shouldDelete = window.confirm('Are you sure you want to delete this snippet? This action cannot be undone.')
    if (!shouldDelete) {
      return
    }

    setIsDeleting(true)

    // Optimistically mark snippet as deleting (hides it immediately)
    markSnippetDeleting(snippet.id)

    // Close modal immediately for better UX
    onClose()

    try {
      const result = await deleteSnippetMutation({
        variables: {
          projectId: snippet.projectId,
          id: snippet.id
        }
      })

      if (result) {
        // Confirm deletion (removes from deleting set)
        confirmDeletion(snippet.id)
        toast.success('Snippet deleted successfully!')
      }
    } catch (error) {
      console.error('Failed to delete snippet:', error)
      // Rollback - show snippet again
      rollbackDeletion(snippet.id)
      toast.error('Failed to delete snippet', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteSnippetMutation, snippet.id, snippet.projectId, markSnippetDeleting, confirmDeletion, rollbackDeletion, onClose, toast])

  const handleCombine = useCallback(async () => {
    setIsCombining(true)
    try {
      const result = await combineConnectionsMutation({
        variables: {
          projectId: snippet.projectId,
          snippetId: snippet.id
        }
      })

      const updatedSnippet = result ? (result as { combineSnippetConnections: typeof snippet }).combineSnippetConnections : null
      if (!updatedSnippet) {
        throw new Error('No data returned from combine operation')
      }

      // Update local state with new content
      const values: Record<string, string> = {}
      Object.entries(updatedSnippet.content).forEach(([key, field]) => {
        values[key] = field.value
      })
      setDraftValues(values)

      toast.success('Successfully combined connected snippets!')
    } catch (error) {
      console.error('Failed to combine snippets:', error)
      toast.error('Failed to combine', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsCombining(false)
    }
  }, [combineConnectionsMutation, snippet.projectId, snippet.id, toast])

  const handleGenerateImage = useCallback(async () => {
    const sourceText = draftValues.mainText || Object.values(draftValues)[0] || ''
    if (!sourceText.trim()) {
      toast.warning('Please provide input for image generation')
      return
    }

    setIsGeneratingImage(true)
    try {
      await generateImageMutation({
        variables: {
          projectId: snippet.projectId,
          snippetId: snippet.id
        }
      })
      toast.success('Image generated successfully!')
    } finally {
      setIsGeneratingImage(false)
    }
  }, [generateImageMutation, snippet.projectId, snippet.id, draftValues, toast])

  const handleFieldActivate = useCallback((field: EditableField) => {
    if (isSaving || isDeleting) {
      return
    }

    if (field === activeField && (isPrimaryBusy || savingField === field)) {
      return
    }

    setActiveField(field)
  }, [isSaving, isDeleting, isPrimaryBusy, savingField, activeField])

  const handleFieldBlur = useCallback(async (field: EditableField) => {
    setActiveField((current) => (current === field ? null : current))

    const currentValue = draftValues[field]
    const lastSavedValue = lastSavedValuesRef.current[field]

    if (currentValue === lastSavedValue) {
      return
    }

    setSavingField(field)

    try {
      // We need to send the full content object or at least the updated field
      // But updateSnippet expects the full content map or partial?
      // The mutation expects `content: Record<string, SnippetField>`
      // So we should construct the updated content map

      const updatedContent: Record<string, SnippetField> = { ...snippet.content }
      if (updatedContent[field]) {
        updatedContent[field] = { ...updatedContent[field], value: currentValue }
      } else {
        // Handle case where field might not exist in original content (e.g. added locally but not saved yet?)
        // But here we are blurring, so it should exist in draftValues
        updatedContent[field] = { value: currentValue }
      }

      await updateSnippetMutation({
        variables: {
          projectId: snippet.projectId,
          id: snippet.id,
          input: {
            content: updatedContent
          }
        }
      })

      lastSavedValuesRef.current = {
        ...lastSavedValuesRef.current,
        [field]: currentValue
      }
    } catch (error) {
      console.error('Failed to save snippet field:', error)
      toast.error('Failed to save changes', 'Please try again')

      const previousValue = lastSavedValuesRef.current[field]
      setDraftValues(prev => ({ ...prev, [field]: previousValue }))
    } finally {
      setSavingField(null)
    }
  }, [snippet.projectId, snippet.id, snippet.content, draftValues, updateSnippetMutation, toast])

  const handleFieldChange = useCallback((field: string, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [field]: value
    }))
  }, [])

  const handleAddField = useCallback((key: string, value: string) => {
    // This needs to update the content map via mutation
    // For now, we can just update draftValues and trigger a save?
    // Or we should trigger a save immediately to add the field structure

    const newField: SnippetField = {
      label: key,
      value,
      isSystem: false
    }

    const updatedContent = { ...snippet.content, [key]: newField }

    // Optimistic update
    setDraftValues(prev => ({ ...prev, [key]: value }))

    void updateSnippetMutation({
      variables: {
        projectId: snippet.projectId,
        id: snippet.id,
        input: {
          content: updatedContent
        }
      }
    })
  }, [snippet.content, snippet.projectId, snippet.id, updateSnippetMutation])

  const handleDeleteField = useCallback((key: string) => {
    const updatedContent = { ...snippet.content }
    delete updatedContent[key]

    // Optimistic update
    setDraftValues(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })

    void updateSnippetMutation({
      variables: {
        projectId: snippet.projectId,
        id: snippet.id,
        input: {
          content: updatedContent
        }
      }
    })
  }, [snippet.content, snippet.projectId, snippet.id, updateSnippetMutation])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Edit Snippet</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSaving || isDeleting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Snippet ID: <span className="font-mono">#{snippet.id.slice(0, 8)}</span>
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title (optional)
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter snippet title..."
                disabled={isSaving || isDeleting}
              />
            </div>

            {/* Content Fields */}
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <SnippetNodeContent
                content={snippet.content}
                activeField={activeField}
                draftValues={draftValues}
                savingField={savingField}
                onFieldChange={handleFieldChange}
                onFieldActivate={handleFieldActivate}
                onFieldBlur={handleFieldBlur}
                onAddField={handleAddField}
                onDeleteField={handleDeleteField}
                isDisabled={isSaving || isDeleting}
              />
            </div>

            {/* LLM Model Selector */}
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="llmModel" className="block text-sm font-medium text-gray-700 mb-1">
                  LLM Model
                </label>
                <select
                  id="llmModel"
                  value={selectedModelPrimary}
                  onChange={(e) => setSelectedModelPrimary(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSaving || isPrimaryBusy || isDeleting || isLoadingModels}
                >
                  <option value="" disabled>
                    {isLoadingModels ? 'Loading models...' : 'Select a model...'}
                  </option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id} title={model.description ?? undefined}>
                      {model.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  void handleGenerate()
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center gap-2"
                disabled={
                  isSaving ||
                  isPrimaryBusy ||
                  isDeleting ||
                  !selectedModelPrimary ||
                  isLoadingModels
                }
              >
                {isPrimaryBusy && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isPrimaryBusy ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={() => {
                  void handleCombine()
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center gap-2"
                disabled={isSaving || isDeleting || isCombining}
              >
                {isCombining && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isCombining ? 'Combining...' : 'Combine'}
              </button>
              <button
                onClick={() => {
                  void handleGenerateImage()
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-400 flex items-center gap-2"
                disabled={isSaving || isDeleting || isGeneratingImage}
              >
                {isGeneratingImage && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isGeneratingImage ? 'Generating...' : 'Image'}
              </button>
            </div>

            {modelsError && (
              <p className="text-sm text-red-600">
                Failed to load models. Please try again later or contact your administrator.
              </p>
            )}
            {!modelsError && !isLoadingModels && models.length === 0 && (
              <p className="text-sm text-gray-500">No models available. Please contact your administrator.</p>
            )}

            {streamError && (
              <p className="text-sm text-red-600 mt-2">{streamError}</p>
            )}

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  id="tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a tag..."
                  disabled={isSaving || isDeleting}
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                  disabled={isSaving || isDeleting || !tagInput.trim()}
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={`tag-${index}`}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                        disabled={isSaving || isDeleting}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Generated Image Display */}
            {snippet.imageUrl && (
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">
                  Generated Image
                </p>
                <div className="relative">
                  <img
                    src={snippet.imageUrl}
                    alt="Generated from snippet text"
                    className="max-w-full h-auto rounded-lg border border-gray-300 shadow-sm"
                  />
                  {snippet.imageMetadata && (
                    <p className="text-xs text-gray-500 mt-1">
                      {snippet.imageMetadata.width}x{snippet.imageMetadata.height} • {snippet.imageMetadata.aspectRatio}
                    </p>
                  )}
                </div>
              </div>
            )}


          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              void handleDelete()
            }}
            className="px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors disabled:bg-red-50 disabled:text-red-300"
            disabled={isSaving || isDeleting || isPrimaryBusy}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
              disabled={isSaving || isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                void handleSave()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center gap-2"
              disabled={isSaving || isDeleting}
            >
              {isSaving && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
