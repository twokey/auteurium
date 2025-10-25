import { memo, useCallback } from 'react'
import { Handle, Position } from 'reactflow'
import { useSnippetNodeEditing, useSnippetNodeActions } from '../hooks'
import {
  SnippetNodeContent,
  SnippetNodeToolbar,
  SnippetNodeImage
} from '.'
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
    textField1: snippet.textField1
  })

  // Extract actions
  const actions = useSnippetNodeActions()

  // Handle field blur with auto-save
  const handleFieldBlur = useCallback(
    async (
      field: EditableField,
      value: string,
      onSave: (field: EditableField, value: string) => Promise<void>
    ) => {
      if (value === snippet[field]) {
        editing.setActiveField(null)
        return
      }

      editing.setSavingField(field)
      try {
        await onSave(field, value)
      } finally {
        editing.setSavingField(null)
        editing.setActiveField(null)
      }
    },
    [snippet, editing]
  )

  // Display title
  const displayTitle = snippet.title || 'Snippet'

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      <div
        className="p-3 min-w-[200px] max-w-[300px] cursor-pointer hover:bg-gray-50 transition-colors"
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
          activeField={editing.activeField}
          draftValues={editing.draftValues}
          savingField={editing.savingField}
          textField1Ref={editing.textField1Ref}
          onFieldChange={(field, value) => editing.setDraftValue(field, value)}
          onFieldActivate={(field) => {
            editing.setActiveField(field)
            editing.focusField()
          }}
          onFieldBlur={handleFieldBlur}
          onFieldSave={(field, value) =>
            actions.handleFieldSave(field, value, (changes) => onUpdateContent(snippet.id, changes))
          }
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
          onCombine={() => actions.handleCombine(() => onCombine(snippet.id))}
          onGenerateImage={() =>
            actions.handleGenerateImage(() => onGenerateImage(snippet.id))
          }
          isGeneratingImage={isGeneratingImage}
          isCombining={actions.isCombining}
        />

        {/* Tags/Categories */}
        {(snippet.tags?.length || 0) > 0 && (
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
