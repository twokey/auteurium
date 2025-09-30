import { useMutation } from '@apollo/client'
import { useCallback, useEffect, useState } from 'react'
import { UPDATE_SNIPPET } from '../../graphql/mutations'
import { GET_PROJECT_WITH_SNIPPETS } from '../../graphql/queries'

interface EditSnippetModalProps {
  isOpen: boolean
  onClose: () => void
  snippet: {
    id: string
    projectId: string
    textField1: string
    textField2: string
    tags?: string[]
    categories?: string[]
  }
}

export const EditSnippetModal = ({ isOpen, onClose, snippet }: EditSnippetModalProps) => {
  const [textField1, setTextField1] = useState(snippet.textField1 || '')
  const [textField2, setTextField2] = useState(snippet.textField2 || '')
  const [tags, setTags] = useState<string[]>(snippet.tags || [])
  const [categories, setCategories] = useState<string[]>(snippet.categories || [])
  const [tagInput, setTagInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when snippet changes
  useEffect(() => {
    setTextField1(snippet.textField1 || '')
    setTextField2(snippet.textField2 || '')
    setTags(snippet.tags || [])
    setCategories(snippet.categories || [])
    setTagInput('')
    setCategoryInput('')
  }, [snippet])

  const [updateSnippetMutation] = useMutation(UPDATE_SNIPPET, {
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
      await updateSnippetMutation({
        variables: {
          projectId: snippet.projectId,
          id: snippet.id,
          input: {
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
  }, [snippet.id, textField1, textField2, tags, categories, updateSnippetMutation, onClose])

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
              disabled={isSaving}
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
                disabled={isSaving}
              />
            </div>

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
                disabled={isSaving}
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
                  disabled={isSaving}
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                  disabled={isSaving || !tagInput.trim()}
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
                        disabled={isSaving}
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
                  disabled={isSaving}
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-400"
                  disabled={isSaving || !categoryInput.trim()}
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
                        disabled={isSaving}
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
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center gap-2"
            disabled={isSaving}
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
  )
}
