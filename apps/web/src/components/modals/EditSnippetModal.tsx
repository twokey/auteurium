import { useMutation } from '@apollo/client'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { COMBINE_SNIPPET_CONNECTIONS, DELETE_SNIPPET, GENERATE_SNIPPET_IMAGE, UPDATE_SNIPPET } from '../../graphql/mutations'
import { GET_PROJECT_WITH_SNIPPETS } from '../../graphql/queries'
import { useGenAI } from '../../hooks/useGenAI'

type EditableField = 'textField1' | 'textField2'

interface EditSnippetModalProps {
  isOpen: boolean
  onClose: () => void
  onPreviewGeneratedSnippet: (payload: { sourceSnippetId: string; generatedText: string }) => void
  snippet: {
    id: string
    projectId: string
    title?: string
    textField1: string
    textField2: string
    tags?: string[]
    categories?: string[]
    imageUrl?: string | null
    imageS3Key?: string | null
    imageMetadata?: {
      width: number
      height: number
      aspectRatio: string
    } | null
  }
}

export const EditSnippetModal = ({ isOpen, onClose, onPreviewGeneratedSnippet, snippet }: EditSnippetModalProps) => {
  const normalisedTitle = snippet.title && snippet.title.trim() !== '' ? snippet.title : 'New snippet'
  const [title, setTitle] = useState(normalisedTitle)
  const [textField1, setTextField1] = useState(snippet.textField1 ?? '')
  const [textField2, setTextField2] = useState(snippet.textField2 ?? '')
  const [tags, setTags] = useState<string[]>(snippet.tags ?? [])
  const [categories, setCategories] = useState<string[]>(snippet.categories ?? [])
  const [tagInput, setTagInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [selectedModelPrimary, setSelectedModelPrimary] = useState('')
  const [selectedModelSecondary, setSelectedModelSecondary] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCombining, setIsCombining] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [isGeneratingSecondary, setIsGeneratingSecondary] = useState(false)
  const [secondaryStreamError, setSecondaryStreamError] = useState<string | null>(null)
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
  const textField1Ref = useRef<HTMLTextAreaElement | null>(null)
  const textField2Ref = useRef<HTMLTextAreaElement | null>(null)
  const lastSavedValuesRef = useRef({
    textField1: snippet.textField1 ?? '',
    textField2: snippet.textField2 ?? ''
  })

  // Reset form when snippet changes
  useEffect(() => {
    const nextTitle = snippet.title && snippet.title.trim() !== '' ? snippet.title : 'New snippet'
    setTitle(nextTitle)
    setTextField1(snippet.textField1 ?? '')
    setTextField2(snippet.textField2 ?? '')
    setTags(snippet.tags ?? [])
    setCategories(snippet.categories ?? [])
    setTagInput('')
    setCategoryInput('')
    setSelectedModelPrimary('')
    setSelectedModelSecondary('')
    setIsDeleting(false)
    setStreamError(null)
    setIsStreaming(false)
    setIsGeneratingSecondary(false)
    setSecondaryStreamError(null)
    setIsGeneratingPrimary(false)
    setActiveField(null)
    setSavingField(null)
    lastSavedValuesRef.current = {
      textField1: snippet.textField1 ?? '',
      textField2: snippet.textField2 ?? ''
    }

    if (streamSubscriptionRef.current) {
      streamSubscriptionRef.current.unsubscribe()
      streamSubscriptionRef.current = null
    }
    assistantContentRef.current = snippet.textField2 ?? ''
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
    if (!selectedModelSecondary && models.length > 0) {
      setSelectedModelSecondary(models[0].id)
    }
  }, [isOpen, models, selectedModelPrimary, selectedModelSecondary])

  useEffect(() => () => {
    if (streamSubscriptionRef.current) {
      streamSubscriptionRef.current.unsubscribe()
      streamSubscriptionRef.current = null
    }
  }, [])

  useEffect(() => {
    if (activeField === 'textField1') {
      const target = textField1Ref.current
      if (target) {
        const length = target.value.length
        target.focus()
        target.setSelectionRange(length, length)
      }
    } else if (activeField === 'textField2') {
      const target = textField2Ref.current
      if (target) {
        const length = target.value.length
        target.focus()
        target.setSelectionRange(length, length)
      }
    }
  }, [activeField])

  const [updateSnippetMutation] = useMutation(UPDATE_SNIPPET, {
    refetchQueries: [
      {
        query: GET_PROJECT_WITH_SNIPPETS,
        variables: { projectId: snippet.projectId }
      }
    ],
    awaitRefetchQueries: true
  })

  const [deleteSnippetMutation] = useMutation(DELETE_SNIPPET, {
    refetchQueries: [
      {
        query: GET_PROJECT_WITH_SNIPPETS,
        variables: { projectId: snippet.projectId }
      }
    ],
    awaitRefetchQueries: true
  })

  const [combineConnectionsMutation] = useMutation(COMBINE_SNIPPET_CONNECTIONS, {
    refetchQueries: [
      {
        query: GET_PROJECT_WITH_SNIPPETS,
        variables: { projectId: snippet.projectId }
      }
    ],
    awaitRefetchQueries: true
  })

  const [generateImageMutation] = useMutation(GENERATE_SNIPPET_IMAGE, {
    refetchQueries: [
      {
        query: GET_PROJECT_WITH_SNIPPETS,
        variables: { projectId: snippet.projectId }
      }
    ],
    awaitRefetchQueries: true
  })

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const trimmedTitle = title.trim()

      await updateSnippetMutation({
        variables: {
          projectId: snippet.projectId,
          id: snippet.id,
          input: {
            title: trimmedTitle === '' ? undefined : trimmedTitle,
            textField1,
            textField2,
            tags,
            categories
          }
        }
      })
      onClose()
    } catch (error) {
      console.error('Failed to update snippet:', error)
      alert(`Failed to save snippet: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }, [snippet.id, snippet.projectId, title, textField1, textField2, tags, categories, updateSnippetMutation, onClose])

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

  const handleAddCategory = useCallback(() => {
    const trimmedCategory = categoryInput.trim()
    if (trimmedCategory && !categories.includes(trimmedCategory)) {
      setCategories([...categories, trimmedCategory])
      setCategoryInput('')
    }
  }, [categoryInput, categories])

  const handleRemoveCategory = useCallback((categoryToRemove: string) => {
    setCategories(categories.filter(cat => cat !== categoryToRemove))
  }, [categories])

  const handleTagKeyPress = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }, [handleAddTag])

  const handleCategoryKeyPress = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCategory()
    }
  }, [handleAddCategory])

  const isPrimaryBusy = isGeneratingPrimary || isStreaming

  const handleGenerate = useCallback(async () => {
    if (!selectedModelPrimary) {
      alert('Please select an LLM model before generating.')
      return
    }

    if (textField1.trim() === '') {
      alert('Please provide input in Text Field 1 to send to the model.')
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
              setTextField2(assistantContentRef.current)
            }

            if (event.isComplete) {
              setTextField2(assistantContentRef.current)
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
        textField1
      )

      if (!generation || generation.content.trim() === '') {
        alert('The selected model did not return any content. Please try again or choose another model.')
        setIsStreaming(false)
        return
      }

      if (!usedStreaming && fallbackReason) {
        setStreamError(fallbackReason)
      }

      assistantContentRef.current = generation.content
      setTextField2(generation.content)
    } catch (error) {
      console.error('Failed to generate content:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      setStreamError(message)
      alert(`Failed to generate content: ${message}`)
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
    textField1
  ])

  const handleGenerateSnippetFromField2 = useCallback(async () => {
    if (!selectedModelSecondary) {
      alert('Please select an LLM model before generating.')
      return
    }

    const trimmedPrompt = textField2.trim()
    if (trimmedPrompt === '') {
      alert('Please provide input in Text Field 2 to send to the model.')
      return
    }

    setIsGeneratingSecondary(true)
    setSecondaryStreamError(null)

    try {
      const { result, fallbackReason } = await generateStream(
        snippet.projectId,
        snippet.id,
        selectedModelSecondary,
        textField2
      )

      if (!result || result.content.trim() === '') {
        alert('The selected model did not return any content. Please try again or choose another model.')
        return
      }

      setSecondaryStreamError(fallbackReason ?? null)

      onPreviewGeneratedSnippet({
        sourceSnippetId: snippet.id,
        generatedText: result.content
      })
    } catch (error) {
      console.error('Failed to generate snippet from Text Field 2:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      setSecondaryStreamError(message)
      alert(`Failed to generate snippet: ${message}`)
    } finally {
      setIsGeneratingSecondary(false)
    }
  }, [
    generateStream,
    onPreviewGeneratedSnippet,
    selectedModelSecondary,
    snippet.id,
    snippet.projectId,
    textField2
  ])

  const handleDelete = useCallback(async () => {
    const shouldDelete = window.confirm('Are you sure you want to delete this snippet? This action cannot be undone.')
    if (!shouldDelete) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteSnippetMutation({
        variables: {
          projectId: snippet.projectId,
          id: snippet.id
        }
      })
      onClose()
    } catch (error) {
      console.error('Failed to delete snippet:', error)
      alert(`Failed to delete snippet: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
    }
  }, [deleteSnippetMutation, onClose, snippet.id, snippet.projectId])

  const handleCombine = useCallback(async () => {
    setIsCombining(true)
    try {
      const result = await combineConnectionsMutation({
        variables: {
          projectId: snippet.projectId,
          snippetId: snippet.id
        }
      })

      const updatedSnippet = result.data?.combineSnippetConnections
      if (!updatedSnippet) {
        throw new Error('No data returned from combine operation')
      }

      // Update local state with new textField2
      setTextField2(updatedSnippet.textField2)

      alert('Successfully combined connected snippets!')
    } catch (error) {
      console.error('Failed to combine snippets:', error)
      alert(`Failed to combine: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCombining(false)
    }
  }, [combineConnectionsMutation, snippet.projectId, snippet.id])

  const handleGenerateImage = useCallback(async () => {
    if (!textField1.trim()) {
      alert('Please provide input in Text Field 1 for image generation.')
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
      alert('Image generated successfully!')
    } catch (error) {
      console.error('Failed to generate image:', error)
      alert(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingImage(false)
    }
  }, [generateImageMutation, snippet.projectId, snippet.id, textField1])

  const handleFieldActivate = useCallback((field: EditableField) => {
    if (isSaving || isDeleting) {
      return
    }

    if (field === 'textField1' && (isPrimaryBusy || savingField === 'textField1')) {
      return
    }

    if (field === 'textField2' && (savingField === 'textField2' || isPrimaryBusy || isGeneratingSecondary)) {
      return
    }

    setActiveField(field)
  }, [isSaving, isDeleting, isPrimaryBusy, isGeneratingSecondary, savingField])

  const handleFieldBlur = useCallback(async (field: EditableField) => {
    setActiveField((current) => (current === field ? null : current))

    const currentValue = field === 'textField1' ? textField1 : textField2
    const lastSavedValue = lastSavedValuesRef.current[field]

    if (currentValue === lastSavedValue) {
      return
    }

    setSavingField(field)

    try {
      await updateSnippetMutation({
        variables: {
          projectId: snippet.projectId,
          id: snippet.id,
          input: {
            [field]: currentValue
          }
        }
      })

      lastSavedValuesRef.current = {
        ...lastSavedValuesRef.current,
        [field]: currentValue
      }
    } catch (error) {
      console.error('Failed to save snippet field:', error)
      alert('Failed to save changes. Please try again.')

      const previousValue = lastSavedValuesRef.current[field]
      if (field === 'textField1') {
        setTextField1(previousValue)
      } else {
        setTextField2(previousValue)
      }
    } finally {
      setSavingField(null)
    }
  }, [snippet.projectId, snippet.id, textField1, textField2, updateSnippetMutation])

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

            {/* Text Field 1 */}
            <div>
              <label htmlFor="textField1" className="block text-sm font-medium text-gray-700 mb-1">
                Text Field 1
              </label>
              <textarea
                id="textField1"
                ref={textField1Ref}
                value={textField1}
                onChange={(e) => setTextField1(e.target.value)}
                onClick={() => {
                  handleFieldActivate('textField1')
                }}
                onFocus={() => {
                  handleFieldActivate('textField1')
                }}
                onBlur={() => {
                  void handleFieldBlur('textField1')
                }}
                readOnly={activeField !== 'textField1'}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y overflow-auto ${
                  activeField === 'textField1' ? '' : 'cursor-text'
                }`}
                rows={6}
                placeholder="Enter text for field 1..."
              />
              {savingField === 'textField1' && (
                <p className="text-xs text-gray-500 mt-1">Saving changes…</p>
              )}
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
                  textField1.trim() === '' ||
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
                disabled={isSaving || isDeleting || isGeneratingImage || !textField1.trim()}
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

            {/* Text Field 2 */}
            <div>
              <label htmlFor="textField2" className="block text-sm font-medium text-gray-700 mb-1">
                Text Field 2
              </label>
              <textarea
                id="textField2"
                ref={textField2Ref}
                value={textField2}
                onChange={(e) => setTextField2(e.target.value)}
                onClick={() => {
                  handleFieldActivate('textField2')
                }}
                onFocus={() => {
                  handleFieldActivate('textField2')
                }}
                onBlur={() => {
                  void handleFieldBlur('textField2')
                }}
                readOnly={activeField !== 'textField2'}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y overflow-auto ${
                  activeField === 'textField2' ? '' : 'cursor-text'
                }`}
                rows={6}
                placeholder="Enter text for field 2... or use Generate to get AI-generated content"
              />
              {savingField === 'textField2' && (
                <p className="text-xs text-gray-500 mt-1">Saving changes…</p>
              )}
              {streamError && (
                <p className="text-sm text-red-600 mt-2">{streamError}</p>
              )}
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="llmModelSecondary" className="block text-sm font-medium text-gray-700 mb-1">
                  LLM Model 2
                </label>
                <select
                  id="llmModelSecondary"
                  value={selectedModelSecondary}
                  onChange={(e) => setSelectedModelSecondary(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSaving || isDeleting || isGeneratingSecondary || isLoadingModels}
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
                  void handleGenerateSnippetFromField2()
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center gap-2"
                disabled={
                  isSaving ||
                  isDeleting ||
                  isGeneratingSecondary ||
                  !selectedModelSecondary ||
                  textField2.trim() === '' ||
                  isLoadingModels
                }
              >
                {isGeneratingSecondary && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isGeneratingSecondary ? 'Generating...' : 'Generate Snippet'}
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
                disabled={isSaving || isDeleting || isGeneratingImage || !textField1.trim()}
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
            {secondaryStreamError && (
              <p className="text-sm text-red-600 mt-2">
                {secondaryStreamError}
              </p>
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

            {/* Categories */}
            <div>
              <label htmlFor="categories" className="block text-sm font-medium text-gray-700 mb-1">
                Categories
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  id="categories"
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyPress={handleCategoryKeyPress}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a category..."
                  disabled={isSaving || isDeleting}
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-400"
                  disabled={isSaving || isDeleting || !categoryInput.trim()}
                >
                  Add
                </button>
              </div>
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {categories.map((category, index) => (
                    <span
                      key={`category-${index}`}
                      className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded flex items-center gap-1"
                    >
                      {category}
                      <button
                        onClick={() => handleRemoveCategory(category)}
                        className="text-purple-600 hover:text-purple-800"
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
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              void handleDelete()
            }}
            className="px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors disabled:bg-red-50 disabled:text-red-300"
            disabled={isSaving || isDeleting || isPrimaryBusy || isGeneratingSecondary}
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
