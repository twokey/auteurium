import { KeyboardEventHandler } from 'react'

interface SnippetTagsSectionProps {
  tags: string[]
  categories: string[]
  tagInput: string
  categoryInput: string
  onTagInputChange: (value: string) => void
  onCategoryInputChange: (value: string) => void
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  onAddCategory: () => void
  onRemoveCategory: (category: string) => void
  onTagKeyPress: KeyboardEventHandler<HTMLInputElement>
  onCategoryKeyPress: KeyboardEventHandler<HTMLInputElement>
  isDisabled?: boolean
}

/**
 * SnippetTagsSection - Manage snippet tags and categories
 * Provides tag/category input and display
 */
export const SnippetTagsSection = ({
  tags,
  categories,
  tagInput,
  categoryInput,
  onTagInputChange,
  onCategoryInputChange,
  onAddTag,
  onRemoveTag,
  onAddCategory,
  onRemoveCategory,
  onTagKeyPress,
  onCategoryKeyPress,
  isDisabled = false
}: SnippetTagsSectionProps) => {
  return (
    <div className="space-y-6">
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
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyPress={onTagKeyPress}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add a tag..."
            disabled={isDisabled}
          />
          <button
            onClick={onAddTag}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            disabled={isDisabled || !tagInput.trim()}
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
                  onClick={() => onRemoveTag(tag)}
                  className="text-blue-600 hover:text-blue-800"
                  disabled={isDisabled}
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
            onChange={(e) => onCategoryInputChange(e.target.value)}
            onKeyPress={onCategoryKeyPress}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add a category..."
            disabled={isDisabled}
          />
          <button
            onClick={onAddCategory}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-400"
            disabled={isDisabled || !categoryInput.trim()}
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
                  onClick={() => onRemoveCategory(category)}
                  className="text-purple-600 hover:text-purple-800"
                  disabled={isDisabled}
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
  )
}


