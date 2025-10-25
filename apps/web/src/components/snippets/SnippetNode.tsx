import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Handle, Position } from 'reactflow'

import { CANVAS_CONSTANTS } from '../../shared/constants'
import { useToast } from '../../shared/store/toastStore'
import { countWords, truncateToWords } from '../../shared/utils/textUtils'

interface AvailableModel {
  id: string
  displayName: string
  description?: string | null
}

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
    }
    onEdit: (snippetId: string) => void
    onDelete: (snippetId: string) => void
    onManageConnections: (snippetId: string) => void
    onViewVersions: (snippetId: string) => void
    onUpdateContent: (snippetId: string, changes: Partial<Record<'textField1', string>>) => Promise<void>
    onCombine: (snippetId: string) => Promise<void>
    onGenerateImage: (snippetId: string, modelId?: string) => void
    isGeneratingImage: boolean
    connectedSnippets?: { id: string; imageS3Key?: string | null }[]
    textModels?: AvailableModel[]
    isLoadingTextModels?: boolean
  }
}

type EditableField = 'textField1'

// Extract inline styles outside component to prevent object recreation on every render
// This is a critical performance fix for preventing unnecessary React Flow node updates
const POINTER_EVENTS_STYLES = {
  interactive: { pointerEvents: 'auto' as const }
} as const

export const SnippetNode = memo(({ data }: SnippetNodeProps) => {
  const toast = useToast()
  const {
    snippet,
    onEdit,
    onDelete,
    onManageConnections,
    onViewVersions,
    onUpdateContent,
    onGenerateImage,
    isGeneratingImage,
    connectedSnippets = [],
    textModels = [],
    isLoadingTextModels = false
  } = data

  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [activeField, setActiveField] = useState<EditableField | null>(null)
  const [draftValues, setDraftValues] = useState({
    textField1: snippet.textField1
  })
  const [savingField, setSavingField] = useState<EditableField | null>(null)
  const textField1Ref = useRef<HTMLTextAreaElement | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [selectedTextModel, setSelectedTextModel] = useState<string>('')
  const [selectedImageModel, setSelectedImageModel] = useState<string>('imagen-4.0-fast-generate-001')
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('')

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

  // Auto-select first text model when models load
  useEffect(() => {
    if (textModels.length > 0 && selectedTextModel === '') {
      setSelectedTextModel(textModels[0].id)
    }
  }, [textModels, selectedTextModel])

  useEffect(() => {
    if (activeField === 'textField1') {
      const target = textField1Ref.current
      target?.focus()
      const length = target?.value.length ?? 0
      target?.setSelectionRange(length, length)
    }
  }, [activeField])

  const commitField = useCallback(async (_field: EditableField) => {
    const newValue = draftValues.textField1
    const currentValue = snippet.textField1

    setActiveField(null)

    if (newValue === currentValue) {
      return
    }

    setSavingField('textField1')

    try {
      await onUpdateContent(snippet.id, { textField1: newValue })
    } catch (error) {
      console.error('Failed to update snippet content:', error)
      toast.error('Failed to save snippet changes', 'Please try again')
      setDraftValues((prev) => ({
        ...prev,
        textField1: currentValue
      }))
    } finally {
      setSavingField(null)
    }
  }, [draftValues, onUpdateContent, snippet.id, snippet.textField1, toast])

  const handleFieldActivate = useCallback(
    (field: EditableField) =>
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()

        if (activeField && activeField !== field) {
          void commitField(activeField)
        }

        setActiveField(field)
        setDraftValues((prev) => ({
          ...prev,
          textField1: snippet.textField1
        }))
      },
    [activeField, commitField, snippet.textField1]
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

  const handleSnippetClick = useCallback((e: React.MouseEvent) => {
    // Only trigger edit on direct click, not on context menu or expand button
    if (activeField !== null || savingField !== null) {
      return
    }

    if (e.button === 0 && !showContextMenu) {
      onEdit(snippet.id)
    }
  }, [activeField, savingField, snippet.id, onEdit, showContextMenu])

  const handleSnippetKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (activeField !== null || savingField !== null) {
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onEdit(snippet.id)
      }
    },
    [activeField, savingField, onEdit, snippet.id]
  )

  // Count connected snippets with images
  const connectedImagesCount = connectedSnippets.filter(s => s.imageS3Key).length
  const hasMultimodalSupport = selectedImageModel === 'gemini-2.5-flash-image'
  const tooManyImages = hasMultimodalSupport && connectedImagesCount > 3

  const wordCount = countWords(snippet.textField1)
  const isLarge = wordCount > CANVAS_CONSTANTS.WORD_LIMIT

  const displayText1 = isLarge
    ? truncateToWords(snippet.textField1, CANVAS_CONSTANTS.WORD_LIMIT)
    : snippet.textField1

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
        </div>

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

        <div className="mt-2 space-y-2">
          {/* Generation Section */}
          <div className="space-y-1.5">
            {/* Text Generation Model Selector */}
            <select
              value={selectedTextModel}
              onChange={(e) => {
                e.stopPropagation()
                setSelectedTextModel(e.target.value)
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
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

            {/* Image Generation Model Selector */}
            <select
              value={selectedImageModel}
              onChange={(e) => {
                e.stopPropagation()
                setSelectedImageModel(e.target.value)
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
              disabled={isGeneratingImage || savingField !== null}
              style={POINTER_EVENTS_STYLES.interactive}
            >
              <option value="imagen-4.0-fast-generate-001">Imagen 4 Fast</option>
              <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
            </select>

            {/* Video Generation Model Selector */}
            <select
              value={selectedVideoModel}
              onChange={(e) => {
                e.stopPropagation()
                setSelectedVideoModel(e.target.value)
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
              disabled={savingField !== null}
              style={POINTER_EVENTS_STYLES.interactive}
            >
              <option value="" disabled>
                Select video model...
              </option>
              {/* Video models will be added later */}
            </select>

            {/* Generation Buttons: Text, Image, Video */}
            <div className="flex gap-2">
              {/* Text Generation Button */}
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed rounded transition-colors"
                onClick={(event) => {
                  event.stopPropagation()
                  toast.info('Text generation coming soon!')
                }}
                disabled={false}
                style={POINTER_EVENTS_STYLES.interactive}
                title="Generate text content for this snippet"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Text
              </button>

              {/* Image Generation Button */}
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed rounded transition-colors"
                onClick={(event) => {
                  event.stopPropagation()
                  onGenerateImage(snippet.id, selectedImageModel)
                }}
                title={tooManyImages ? `Too many connected images (${connectedImagesCount}). Remove connections to use ≤3.` : 'Generate image for this snippet'}
                disabled={isGeneratingImage || tooManyImages}
                style={POINTER_EVENTS_STYLES.interactive}
              >
                {isGeneratingImage ? (
                  <>
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Gen...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Image
                  </>
                )}
              </button>

              {/* Video Generation Button */}
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed rounded transition-colors"
                onClick={(event) => {
                  event.stopPropagation()
                  toast.info('Video generation coming soon!')
                }}
                disabled={false}
                style={POINTER_EVENTS_STYLES.interactive}
                title="Generate video content for this snippet"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Video
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
        </div>

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
