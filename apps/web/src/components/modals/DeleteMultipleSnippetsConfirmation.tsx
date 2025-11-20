import { useCallback, useState } from 'react'

import { useOptimisticUpdatesStore } from '../../features/canvas/store/optimisticUpdatesStore'
import { DELETE_SNIPPET } from '../../graphql/mutations'
import { useGraphQLMutation } from '../../hooks/useGraphQLMutation'
import { useToast } from '../../store/toastStore'

interface DeleteMultipleSnippetsConfirmationProps {
  isOpen: boolean
  onClose: () => void
  snippets: {
    id: string
    projectId: string
    title?: string
    textField1?: string
  }[]
  projectId: string
  onDeleted?: () => void
}

export const DeleteMultipleSnippetsConfirmation = ({
  isOpen,
  onClose,
  snippets,
  projectId,
  onDeleted
}: DeleteMultipleSnippetsConfirmationProps) => {
  const toast = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const { markSnippetDeleting, confirmDeletion, rollbackDeletion } = useOptimisticUpdatesStore()

  const { mutate: deleteSnippet } = useGraphQLMutation<
    { deleteSnippet: boolean },
    { projectId: string; id: string }
  >(DELETE_SNIPPET)

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)

    // Optimistically mark all snippets as deleting (hides them immediately)
    snippets.forEach(snippet => {
      markSnippetDeleting(snippet.id)
    })

    // Close modal immediately for better UX
    onClose()

    const deletedIds: string[] = []
    const failedIds: string[] = []

    // Delete snippets sequentially (will be optimized with batch mutation later)
    for (const snippet of snippets) {
      try {
        const result = await deleteSnippet({
          variables: {
            projectId,
            id: snippet.id
          }
        })

        if (result) {
          confirmDeletion(snippet.id)
          deletedIds.push(snippet.id)
        }
      } catch (error) {
        console.error(`Failed to delete snippet ${snippet.id}:`, error)
        failedIds.push(snippet.id)
        // Rollback - show snippet again
        rollbackDeletion(snippet.id)
      }
    }

    // Show appropriate toast message
    if (failedIds.length === 0) {
      toast.success(`Successfully deleted ${deletedIds.length} snippet${deletedIds.length !== 1 ? 's' : ''}`)
    } else if (deletedIds.length === 0) {
      toast.error(`Failed to delete ${failedIds.length} snippet${failedIds.length !== 1 ? 's' : ''}`)
    } else {
      toast.warning(
        `Deleted ${deletedIds.length} snippet${deletedIds.length !== 1 ? 's' : ''}, but ${failedIds.length} failed`
      )
    }

    if (onDeleted && deletedIds.length > 0) {
      onDeleted()
    }

    setIsDeleting(false)
  }, [deleteSnippet, onClose, onDeleted, snippets, projectId, toast, markSnippetDeleting, confirmDeletion, rollbackDeletion])

  if (!isOpen) return null

  const snippetCount = snippets.length
  const maxDisplay = 10
  const hasMore = snippetCount > maxDisplay
  const displayedSnippets = snippets.slice(0, maxDisplay)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                Delete {snippetCount} Snippet{snippetCount !== 1 ? 's' : ''}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <p className="text-sm text-gray-700 mb-3">
            Are you sure you want to delete these snippets? All connections to these snippets will also be removed.
          </p>

          <div className="space-y-2">
            {displayedSnippets.map((snippet) => {
              const snippetPreviewSource = snippet.textField1?.trim() ?? snippet.title?.trim()
              const snippetPreview = snippetPreviewSource && snippetPreviewSource !== ''
                ? snippetPreviewSource
                : 'Untitled snippet'
              const displayPreview = snippetPreview.length > 40
                ? snippetPreview.substring(0, 40) + '...'
                : snippetPreview

              return (
                <div key={snippet.id} className="bg-gray-50 rounded-md p-2 border border-gray-200">
                  <p className="text-xs text-gray-500">
                    ID: <span className="font-mono">#{snippet.id.slice(0, 8)}</span>
                  </p>
                  <p className="text-sm text-gray-900 font-medium mt-0.5">{displayPreview}</p>
                </div>
              )
            })}
            {hasMore && (
              <div className="bg-gray-50 rounded-md p-2 border border-gray-200 text-center">
                <p className="text-sm text-gray-600 font-medium">
                  ...and {snippetCount - maxDisplay} more
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              void handleDelete()
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-red-400 flex items-center gap-2"
            disabled={isDeleting}
          >
            {isDeleting && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isDeleting ? 'Deleting...' : `Delete ${snippetCount} Snippet${snippetCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
