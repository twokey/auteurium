import { memo, useCallback, useState } from 'react'
import { Handle, Position } from 'reactflow'

interface SnippetNodeProps {
  id: string
  data: {
    snippet: {
      id: string
      textField1: string
      textField2: string
      tags?: string[]
      categories?: string[]
    }
    onEdit: (snippetId: string) => void
    onDelete: (snippetId: string) => void
    onManageConnections: (snippetId: string) => void
    onViewVersions: (snippetId: string) => void
  }
}

const WORD_LIMIT = 100

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

const truncateToWords = (text: string, wordLimit: number): string => {
  const words = text.trim().split(/\s+/)
  if (words.length <= wordLimit) return text
  return words.slice(0, wordLimit).join(' ') + '...'
}

export const SnippetNode = memo(({ data }: SnippetNodeProps) => {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })

  const { snippet, onEdit, onDelete, onManageConnections, onViewVersions } = data

  const combinedText = `${snippet.textField1} ${snippet.textField2}`.trim()
  const wordCount = countWords(combinedText)
  const isLarge = wordCount > WORD_LIMIT

  const displayText1 = isLarge
    ? truncateToWords(snippet.textField1, Math.floor(WORD_LIMIT * 0.6))
    : snippet.textField1

  const displayText2 = isLarge
    ? truncateToWords(snippet.textField2, Math.floor(WORD_LIMIT * 0.4))
    : snippet.textField2

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setShowContextMenu(false)
  }, [])

  const handleEdit = useCallback(() => {
    setShowContextMenu(false)
    onEdit(snippet.id)
  }, [snippet.id, onEdit])

  const handleDelete = useCallback(() => {
    setShowContextMenu(false)
    onDelete(snippet.id)
  }, [snippet.id, onDelete])

  const handleManageConnections = useCallback(() => {
    setShowContextMenu(false)
    onManageConnections(snippet.id)
  }, [snippet.id, onManageConnections])

  const handleViewVersions = useCallback(() => {
    setShowContextMenu(false)
    onViewVersions(snippet.id)
  }, [snippet.id, onViewVersions])

  const handleExpandToggle = useCallback(() => {
    if (isLarge) {
      onEdit(snippet.id)
    }
  }, [isLarge, snippet.id, onEdit])

  return (
    <>
      {/* React Flow handles for connections */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      <div
        className="p-3 min-w-[200px] max-w-[300px]"
        onContextMenu={handleContextMenu}
        onClick={handleCloseContextMenu}
        data-testid="snippet-node"
        data-snippet-id={snippet.id}
      >
        {/* Header with snippet type label and ID */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span className="uppercase tracking-wide">Snippet</span>
          <span className="font-mono text-[11px] text-gray-400">#{snippet.id.slice(0, 8)}</span>
        </div>

        {/* Title / Text Field 1 */}
        <div className="font-medium text-sm mb-1 text-gray-900 break-words">
          {displayText1 || 'Empty field 1'}
        </div>

        {/* Text Field 2 */}
        {snippet.textField2 && (
          <div className="text-xs text-gray-600 break-words">
            {displayText2}
          </div>
        )}

        {/* Large snippet indicator and expand button */}
        {isLarge && (
          <button
            onClick={handleExpandToggle}
            className="mt-2 w-full text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1 py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            View Full ({wordCount} words)
          </button>
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

      {/* Context Menu */}
      {showContextMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={handleCloseContextMenu}
          />

          {/* Context Menu */}
          <div
            className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
            style={{
              left: `${contextMenuPosition.x}px`,
              top: `${contextMenuPosition.y}px`
            }}
          >
            <button
              onClick={handleEdit}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>

            <button
              onClick={handleManageConnections}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Manage Connections
            </button>

            <button
              onClick={handleViewVersions}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Version History
            </button>

            <div className="border-t border-gray-200 my-1" />

            <button
              onClick={handleDelete}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </>
      )}
    </>
  )
})

SnippetNode.displayName = 'SnippetNode'
