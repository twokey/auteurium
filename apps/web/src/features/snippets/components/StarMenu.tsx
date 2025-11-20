/**
 * StarMenu Component
 * Dropdown menu showing snippets filtered by tag matching the field type
 */

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'

import { GET_PROJECT_WITH_SNIPPETS } from '../../../graphql/queries'
import { useGraphQLQueryWithCache } from '../../../shared/hooks/useGraphQLQueryWithCache'

import type { ProjectWithSnippetsQueryData, Snippet } from '../../../types'

interface StarMenuProps {
  fieldType: string // e.g., "Subject", "Action", "Style"
  onSelect: (content: string) => void
}

/**
 * StarMenu - Dropdown menu for selecting snippets by tag
 * Shows all snippets in the project that have a tag matching the field type
 */
export const StarMenu = ({ fieldType, onSelect }: StarMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { id: projectId } = useParams<{ id: string }>()

  // Query all snippets in the project
  const { data, loading } = useGraphQLQueryWithCache<ProjectWithSnippetsQueryData>(
    GET_PROJECT_WITH_SNIPPETS,
    {
      variables: { projectId: projectId || '' },
      skip: !projectId || !isOpen
    }
  )

  // Filter snippets by tag matching fieldType
  const matchingSnippets: Snippet[] = data?.project?.snippets
    ? data.project.snippets.filter((snippet) =>
        snippet.tags?.includes(fieldType)
      )
    : []

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSnippetSelect = (snippet: Snippet) => {
    const content = snippet.textField1 || ''
    onSelect(content)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="text-gray-400 hover:text-yellow-500 transition-colors p-1"
        title={`Select snippet with tag "${fieldType}"`}
      >
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[250px] max-w-[350px]">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">
              Snippets tagged "{fieldType}"
            </div>

            {loading ? (
              <div className="px-2 py-3 text-sm text-gray-500">Loading...</div>
            ) : matchingSnippets.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-400">
                No snippets found
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                {matchingSnippets.map((snippet) => (
                  <button
                    key={snippet.id}
                    type="button"
                    onClick={() => handleSnippetSelect(snippet)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition-colors text-sm text-gray-700 hover:text-blue-700"
                  >
                    {snippet.title || 'Untitled Snippet'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
