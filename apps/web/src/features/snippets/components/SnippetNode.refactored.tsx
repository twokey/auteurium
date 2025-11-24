import { memo, useCallback } from 'react'
import { Handle, Position } from 'reactflow'

import {
  SnippetNodeContent,
  SnippetNodeToolbar,
  SnippetNodeImage
} from '.'
import { useSnippetNodeEditing, useSnippetNodeActions } from '../hooks'

import type { EditableField, SnippetNodeProps } from '../../../types'

/**
 * SnippetNode - Refactored with extracted hooks and components
 * Reduced from 648 lines to ~130 lines through composition
 *
 * Composes:
 * - useSnippetNodeEditing: Field editing state
 * - useSnippetNodeActions: Action handlers
 * - SnippetNodeContent: Field display and editing
 * - SnippetNodeToolbar: Action buttons
 * - SnippetNodeImage: Image display
 */
export const SnippetNode = memo(({ data }: SnippetNodeProps) => {
  const {
    snippet,
    onEdit,
    onDelete,
    onManageConnections,
    onViewVersions,
    onUpdateContent,
    onCombine,
    onGenerateImage,
    isGeneratingImage
  } = data

  // Extract editing state
  const editing = useSnippetNodeEditing({
    content: snippet.content
  })

  // Extract actions
  const actions = useSnippetNodeActions()

  // Handle field blur with auto-save
  const handleFieldBlur = useCallback(async (field: EditableField) => {
    const newValue = editing.draftValues[field] ?? snippet.content[field]?.value ?? ''
    const existingField = snippet.content[field]

    editing.setSavingField(field)
    try {
      await onUpdateContent(snippet.id, {
        content: {
          ...snippet.content,
          [field]: {
            ...(existingField ?? { label: field, isSystem: false }),
            value: newValue
          }
        }
      })
    } finally {
      editing.setSavingField(null)
      editing.setActiveField(null)
    }
  }, [editing.draftValues, onUpdateContent, snippet.content, snippet.id, editing])

  const handleAddField = useCallback((key: string, value: string) => {
    void onUpdateContent(snippet.id, {
      content: {
        ...snippet.content,
        [key]: {
          label: key,
          value,
          type: 'text',
          isSystem: false,
          order: 999
        }
      }
    })
  }, [onUpdateContent, snippet.content, snippet.id])

  const handleDeleteField = useCallback((key: string) => {
    const updatedContent = { ...snippet.content }
    delete updatedContent[key]
    void onUpdateContent(snippet.id, { content: updatedContent })
  }, [onUpdateContent, snippet.content, snippet.id])

  // Display title
  const displayTitle = snippet.title ?? 'Snippet'

  return (
    <>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div
        className="p-3 min-w-[600px] max-w-[900px] cursor-pointer hover:bg-gray-50 transition-colors"
        onContextMenu={(e) => {
          e.preventDefault()
        }}
        role="button"
        tabIndex={0}
        data-testid="snippet-node"
        data-snippet-id={snippet.id}
      >
        {/* Header */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span className="tracking-wide">{displayTitle}</span>
          <span className="font-mono text-[11px] text-gray-400">#{snippet.id.slice(0, 8)}</span>
        </div>

        {/* Content */}
        <SnippetNodeContent
          content={snippet.content}
          activeField={editing.activeField}
          draftValues={editing.draftValues}
          savingField={editing.savingField}
          onFieldChange={(field, value) => editing.setDraftValue(field, value)}
          onFieldActivate={(field) => {
            editing.setActiveField(field)
            editing.focusField()
          }}
          onFieldBlur={handleFieldBlur}
          onAddField={handleAddField}
          onDeleteField={handleDeleteField}
        />

        {/* Image */}
        <SnippetNodeImage
          imageUrl={snippet.imageUrl}
          imageMetadata={snippet.imageMetadata}
          isLoading={actions.isImageLoading && isGeneratingImage}
        />

        {/* Toolbar */}
        <SnippetNodeToolbar
          connectionCount={snippet.connectionCount}
          onEdit={() => onEdit(snippet.id)}
          onDelete={() => actions.handleDelete(() => onDelete(snippet.id))}
          onManageConnections={() => onManageConnections(snippet.id)}
          onViewVersions={() => onViewVersions(snippet.id)}
          onCombine={() => { void actions.handleCombine(async () => { await onCombine(snippet.id) }) }}
          onGenerateImage={() =>
            actions.handleGenerateImage(() => onGenerateImage(snippet.id))
          }
          isGeneratingImage={isGeneratingImage}
          isCombining={actions.isCombining}
        />

        {/* Tags/Categories */}
        {(snippet.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {snippet.tags?.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-indigo-100 text-indigo-800 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}, (prevProps, nextProps) => {
  // Memoization comparison
  return (
    prevProps.data.snippet === nextProps.data.snippet &&
    prevProps.data.isGeneratingImage === nextProps.data.isGeneratingImage &&
    prevProps.id === nextProps.id
  )
})

SnippetNode.displayName = 'SnippetNode'
