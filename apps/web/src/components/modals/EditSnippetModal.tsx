import { useMutation } from '@apollo/client'
import { useCallback, useEffect, useState } from 'react'

import { DELETE_SNIPPET, UPDATE_SNIPPET } from '../../graphql/mutations'
import { GET_PROJECT_WITH_SNIPPETS } from '../../graphql/queries'
import { useGenAI } from '../../hooks/useGenAI'

interface EditSnippetModalProps {
  isOpen: boolean
  onClose: () => void
  snippet: {
    id: string
    projectId: string
    title?: string
    textField1: string
    textField2: string
    tags?: string[]
    categories?: string[]
  }
}

export const EditSnippetModal = ({ isOpen, onClose, snippet }: EditSnippetModalProps) => {
  const normalisedTitle = snippet.title && snippet.title.trim() !== '' ? snippet.title : 'New snippet'
  const [title, setTitle] = useState(normalisedTitle)
  const [textField1, setTextField1] = useState(snippet.textField1 ?? '')
  const [textField2, setTextField2] = useState(snippet.textField2 ?? '')
  const [tags, setTags] = useState<string[]>(snippet.tags ?? [])
  const [categories, setCategories] = useState<string[]>(snippet.categories ?? [])
  const [tagInput, setTagInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    models,
    isLoadingModels,
    modelsError,
    generate,
    isGenerating
  } = useGenAI({ enabled: isOpen })

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
    setSelectedModel('')
    setIsDeleting(false)
  }, [snippet])

  useEffect(() => {
    if (!isOpen) return
    if (!selectedModel && models.length > 0) {
      setSelectedModel(models[0].id)
    }
  }, [isOpen, models, selectedModel])

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

  const handleTagKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }, [handleAddTag])

  const handleCategoryKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCategory()
    }
  }, [handleAddCategory])

  const handleGenerate = useCallback(async () => {
    if (!selectedModel) {
      alert('Please select an LLM model before generating.')
      return
    }

    try {
      const generation = await generate(snippet.projectId, snippet.id, selectedModel, textField1)

      if (!generation || generation.content.trim() === '') {
        alert('The selected model did not return any content. Please try again or choose another model.')
        return
      }

      setTextField2(generation.content)
    } catch (error) {
      console.error('Failed to generate content:', error)
      alert(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      // no-op: loading state managed by Apollo mutation
    }
  }, [generate, selectedModel, snippet.projectId, snippet.id, textField1])

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
                value={textField1}
                onChange={(e) => setTextField1(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={6}
                placeholder="Enter text for field 1..."
                disabled={isSaving || isDeleting}
              />
            </div>

            {/* LLM Model Selector */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="llmModel" className="block text-sm font-medium text-gray-700 mb-1">
                  LLM Model
                </label>
                <select
                  id="llmModel"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSaving || isGenerating || isDeleting || isLoadingModels}
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
                  isGenerating ||
                  isDeleting ||
                  !selectedModel ||
                  textField1.trim() === '' ||
                  isLoadingModels
                }
              >
                {isGenerating && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isGenerating ? 'Generating...' : 'Generate'}
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
                value={textField2}
                onChange={(e) => setTextField2(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={6}
                placeholder="Enter text for field 2..."
                disabled={isSaving || isDeleting}
              />
            </div>

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
            disabled={isSaving || isDeleting || isGenerating}
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
