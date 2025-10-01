import { useMutation } from '@apollo/client'
import { useCallback, useState } from 'react'

import { DELETE_SNIPPET } from '../../graphql/mutations'
import { GET_PROJECT_WITH_SNIPPETS } from '../../graphql/queries'

interface DeleteSnippetConfirmationProps {
  isOpen: boolean
  onClose: () => void
  snippet: {
    id: string
    projectId: string
    textField1: string
  }
}

export const DeleteSnippetConfirmation = ({ isOpen, onClose, snippet }: DeleteSnippetConfirmationProps) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const [deleteSnippetMutation] = useMutation(DELETE_SNIPPET, {
    refetchQueries: [
      {
        query: GET_PROJECT_WITH_SNIPPETS,
        variables: { projectId: snippet.projectId }
      }
    ],
    awaitRefetchQueries: true
  })

  const handleDelete = useCallback(async () => {
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

  const snippetPreviewSource = snippet.textField1?.trim()
  const snippetPreview = snippetPreviewSource && snippetPreviewSource !== ''
    ? snippetPreviewSource
    : 'Untitled snippet'
  const displayPreview = snippetPreview.length > 50
    ? snippetPreview.substring(0, 50) + '...'
    : snippetPreview

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Delete Snippet</h2>
              <p className="text-sm text-gray-500 mt-1">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-700 mb-3">
            Are you sure you want to delete this snippet? All connections to this snippet will also be removed.
          </p>
          <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">
              Snippet ID: <span className="font-mono">#{snippet.id.slice(0, 8)}</span>
            </p>
            <p className="text-sm text-gray-900 font-medium">{displayPreview}</p>
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
            {isDeleting ? 'Deleting...' : 'Delete Snippet'}
          </button>
        </div>
      </div>
    </div>
  )
}
