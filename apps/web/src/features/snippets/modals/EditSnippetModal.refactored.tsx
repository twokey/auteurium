import { Button } from '../../../shared/components/ui/Button'
import { Modal } from '../../../shared/components/ui/Modal'
import { useSnippetForm, useSnippetMutations } from '../hooks'

import type { Snippet } from '../../../types'

interface EditSnippetModalProps {
  isOpen: boolean
  onClose: () => void
  snippet: Snippet
}

/**
 * EditSnippetModal - Refactored with extracted hooks and components
 * Reduced from 965 lines to ~100 lines through composition
 *
 * Composes:
 * - useSnippetForm: Form state
 * - useSnippetMutations: GraphQL mutations
 */
export const EditSnippetModal = ({
  isOpen,
  onClose,
  snippet
}: EditSnippetModalProps) => {
  // Extract form state
  const form = useSnippetForm(snippet)

  // Extract mutations
  const { updateSnippet } = useSnippetMutations()

  if (!isOpen) return null

  const snippetPreview = snippet.textField1?.substring(0, 40) ?? 'Untitled'

  const handleSave = async () => {
    await updateSnippet(snippet.projectId, snippet.id, form.formState)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {/* Header */}
      <Modal.Header>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit Snippet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Snippet: <span className="font-mono">#{snippet.id.slice(0, 8)}</span> - {snippetPreview}
        </p>
      </Modal.Header>

      {/* Body */}
      <div className="max-h-[60vh] overflow-y-auto space-y-4 p-6">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={form.formState.title}
            onChange={(e) => form.setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Content</label>
          <textarea
            ref={form.textField1Ref}
            value={form.formState.textField1}
            onChange={(e) => form.setTextField1(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={4}
          />
        </div>
      </div>

      {/* Footer */}
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
