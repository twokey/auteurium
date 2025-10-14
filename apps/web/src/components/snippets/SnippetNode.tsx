import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Handle, Position } from 'reactflow'

interface SnippetNodeProps {
  id: string
  data: {
    snippet: {
      id: string
      title?: string
      textField1: string
      textField2: string
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
    }
    onEdit: (snippetId: string) => void
    onDelete: (snippetId: string) => void
    onManageConnections: (snippetId: string) => void
    onViewVersions: (snippetId: string) => void
    onUpdateContent: (snippetId: string, changes: Partial<Record<'textField1' | 'textField2', string>>) => Promise<void>
    onCombine: (snippetId: string) => Promise<void>
    onGenerateImage: (snippetId: string) => void
  }
}

const WORD_LIMIT = 100
type EditableField = 'textField1' | 'textField2'

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

const truncateToWords = (text: string, wordLimit: number): string => {
  const words = text.trim().split(/\s+/)
  if (words.length <= wordLimit) return text
  return words.slice(0, wordLimit).join(' ') + '...'
}

export const SnippetNode = memo(({ data }: SnippetNodeProps) => {
  const {
    snippet,
    onEdit,
    onDelete,
    onManageConnections,
    onViewVersions,
    onUpdateContent,
    onCombine,
    onGenerateImage
  } = data

  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [activeField, setActiveField] = useState<EditableField | null>(null)
  const [draftValues, setDraftValues] = useState({
    textField1: snippet.textField1,
    textField2: snippet.textField2
  })
  const [savingField, setSavingField] = useState<EditableField | null>(null)
  const textField1Ref = useRef<HTMLTextAreaElement | null>(null)
  const textField2Ref = useRef<HTMLTextAreaElement | null>(null)
  const [isCombining, setIsCombining] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(true)

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
    if (activeField === 'textField2') return

    setDraftValues((prev) => {
      if (prev.textField2 === snippet.textField2) {
        return prev
      }

      return {
        ...prev,
        textField2: snippet.textField2
      }
    })
  }, [snippet.textField2, activeField])

  useEffect(() => {
    if (activeField === 'textField1') {
      const target = textField1Ref.current
      target?.focus()
      const length = target?.value.length ?? 0
      target?.setSelectionRange(length, length)
    } else if (activeField === 'textField2') {
      const target = textField2Ref.current
      target?.focus()
      const length = target?.value.length ?? 0
      target?.setSelectionRange(length, length)
    }
  }, [activeField])

  const commitField = useCallback(async (field: EditableField) => {
    const newValue = draftValues[field]
    const currentValue = field === 'textField1' ? snippet.textField1 : snippet.textField2

    setActiveField(null)

    if (newValue === currentValue) {
      return
    }

    setSavingField(field)

    try {
      await onUpdateContent(snippet.id, { [field]: newValue })
    } catch (error) {
      console.error('Failed to update snippet content:', error)
      alert('Failed to save snippet changes. Please try again.')
      setDraftValues((prev) => ({
        ...prev,
        [field]: currentValue
      }))
    } finally {
      setSavingField(null)
    }
  }, [draftValues, onUpdateContent, snippet.id, snippet.textField1, snippet.textField2])

  const handleFieldActivate = useCallback(
    (field: EditableField) =>
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()

        if (isCombining) {
          return
        }

        if (activeField && activeField !== field) {
          void commitField(activeField)
        }

        setActiveField(field)
        setDraftValues((prev) => ({
          ...prev,
          [field]: field === 'textField1' ? snippet.textField1 : snippet.textField2
        }))
      },
    [activeField, commitField, snippet.textField1, snippet.textField2, isCombining]
  )

  const handleDraftChange = useCallback(
    (field: EditableField) =>
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
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
            [field]: field === 'textField1' ? snippet.textField1 : snippet.textField2
          }))
          setActiveField(null)
          return
        }

        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          void commitField(field)
        }
      },
    [commitField, snippet.textField1, snippet.textField2]
  )

  const handleSnippetClick = useCallback((e: React.MouseEvent) => {
    // Only trigger edit on direct click, not on context menu or expand button
    if (activeField !== null || savingField !== null || isCombining) {
      return
    }

    if (e.button === 0 && !showContextMenu) {
      onEdit(snippet.id)
    }
  }, [activeField, isCombining, savingField, snippet.id, onEdit, showContextMenu])

  const handleSnippetKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (activeField !== null || savingField !== null || isCombining) {
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onEdit(snippet.id)
      }
    },
    [activeField, isCombining, savingField, onEdit, snippet.id]
  )

  const handleCombine = useCallback(async () => {
    if (isCombining || savingField !== null || snippet.connectionCount === 0) {
      return
    }

    if (activeField) {
      await commitField(activeField)
    }

    setIsCombining(true)
    try {
      await onCombine(snippet.id)
      alert('Successfully combined connected snippets!')
    } catch (error) {
      console.error('Failed to combine snippets from canvas:', error)
      alert('Failed to combine connected snippets. Please try again.')
    } finally {
      setIsCombining(false)
    }
  }, [activeField, commitField, isCombining, onCombine, savingField, snippet.connectionCount, snippet.id])

  const hasConnections = snippet.connectionCount > 0

  const combinedText = `${snippet.textField1} ${snippet.textField2}`.trim()
  const wordCount = countWords(combinedText)
  const isLarge = wordCount > WORD_LIMIT

  const displayText1 = isLarge
    ? truncateToWords(snippet.textField1, Math.floor(WORD_LIMIT * 0.6))
    : snippet.textField1

  const displayText2 = isLarge
    ? truncateToWords(snippet.textField2, Math.floor(WORD_LIMIT * 0.4))
    : snippet.textField2

  const displayTitle = snippet.title && snippet.title.trim() !== ''
    ? snippet.title
    : 'New snippet'

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

  const handleExpandToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the snippet click handler
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
        className="p-3 min-w-[200px] max-w-[300px] cursor-pointer hover:bg-gray-50 transition-colors"
        onContextMenu={handleContextMenu}
        onClick={handleSnippetClick}
        onKeyDown={handleSnippetKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Edit snippet ${displayTitle}`}
        data-testid="snippet-node"
        data-snippet-id={snippet.id}
      >
        {/* Header with title or snippet label and ID */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span className="tracking-wide">{displayTitle}</span>
          <span className="font-mono text-[11px] text-gray-400">#{snippet.id.slice(0, 8)}</span>
        </div>

        {/* Title / Text Field 1 */}
        <div className="mb-2">
          {activeField === 'textField1' ? (
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
            />
          ) : (
            <button
              type="button"
              className="w-full text-left font-medium text-sm text-gray-900 break-words cursor-text bg-transparent border-none p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1 focus-visible:ring-offset-white rounded-sm"
              onClick={handleFieldActivate('textField1')}
            >
              {(displayText1 && displayText1.trim() !== '') ? displayText1 : 'Input...'}
            </button>
          )}
        </div>

        {/* Text Field 2 - Always visible */}
        <div className="min-h-[16px]">
          {activeField === 'textField2' ? (
            <textarea
              ref={textField2Ref}
              className="w-full text-xs text-gray-600 bg-white border border-blue-200 rounded-sm p-1 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              value={draftValues.textField2}
              onChange={handleDraftChange('textField2')}
              onBlur={handleBlur('textField2')}
              onKeyDown={handleTextareaKeyDown('textField2')}
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              rows={Math.min(6, Math.max(2, draftValues.textField2.split('\n').length))}
              placeholder="Output..."
            />
          ) : (
            <button
              type="button"
              className="w-full text-left text-xs text-gray-600 break-words cursor-text bg-transparent border-none p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1 focus-visible:ring-offset-white rounded-sm min-h-[16px]"
              onClick={handleFieldActivate('textField2')}
            >
                {(displayText2 && displayText2.trim() !== '') ? displayText2 : 'Output...'}
            </button>
          )}
        </div>

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

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed rounded transition-colors"
            onClick={(event) => {
              event.stopPropagation()
              void handleCombine()
            }}
            disabled={!hasConnections || isCombining || savingField !== null}
          >
            {isCombining && (
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isCombining ? 'Combining...' : 'Combine'}
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded transition-colors"
            onClick={(event) => {
              event.stopPropagation()
              onGenerateImage(snippet.id)
            }}
            title="Generate image for this snippet"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Generate
          </button>

          {!hasConnections && (
            <span className="text-[11px] text-gray-400">
              Connect snippets to enable combine
            </span>
          )}
        </div>

        {(savingField !== null || isCombining) && (
          <div className="text-[11px] text-gray-400 mt-1">
            {savingField ? 'Saving...' : 'Combining...'}
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

        {/* Image Preview */}
        {snippet.imageUrl && (
          <div className="mt-3">
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
              style={{ display: isImageLoading ? 'none' : 'block' }}
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
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          {/* Backdrop to close menu */}
          <button
            type="button"
            className="fixed inset-0 z-[9998]"
            onClick={handleCloseContextMenu}
            onKeyDown={(event) => {
              if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleCloseContextMenu()
              }
            }}
            aria-label="Close snippet context menu"
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
