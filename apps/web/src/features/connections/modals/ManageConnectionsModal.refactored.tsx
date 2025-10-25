import { useState } from 'react'
import { Modal } from '../../../shared/components/ui/Modal'
import { Button } from '../../../shared/components/ui/Button'
import { useConnectionManagement, useConnectionListing } from '../hooks'
import { ConnectionForm, ConnectionsList } from '../components'
import type { Snippet } from '../../../types'

interface ManageConnectionsModalProps {
  isOpen: boolean
  onClose: () => void
  snippet: Snippet
  allSnippets: Snippet[]
}

/**
 * ManageConnectionsModal - Refactored with extracted hooks and components
 * Reduced from 308 lines to ~120 lines through composition
 * 
 * Composes:
 * - useConnectionManagement: CRUD operations
 * - useConnectionListing: Connection organization
 * - ConnectionForm: Create form
 * - ConnectionsList: Display and delete
 */
export const ManageConnectionsModal = ({
  isOpen,
  onClose,
  snippet,
  allSnippets
}: ManageConnectionsModalProps) => {
  // Form state
  const [targetSnippetId, setTargetSnippetId] = useState('')
  const [connectionLabel, setConnectionLabel] = useState('')

  // Extract management operations
  const { createConnection, deleteConnection, isCreating, isDeleting } = useConnectionManagement()

  // Extract connection listing
  const { outgoingConnections, incomingConnections, getSnippetPreview } = useConnectionListing(
    snippet,
    allSnippets
  )

  // Handle create connection
  const handleCreate = async () => {
    const result = await createConnection({
      projectId: snippet.projectId,
      sourceSnippetId: snippet.id,
      targetSnippetId,
      label: connectionLabel
    })

    if (result) {
      setTargetSnippetId('')
      setConnectionLabel('')
    }
  }

  // Handle delete connection
  const handleDelete = async (connectionId: string) => {
    await deleteConnection(snippet.projectId, connectionId)
  }

  if (!isOpen) return null

  const snippetPreview = snippet.textField1?.substring(0, 40) ?? 'Untitled'

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      {/* Header */}
      <Modal.Header>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage Connections</h2>
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
      <div className="max-h-[60vh] overflow-y-auto space-y-6 p-6">
        {/* Create Connection Section */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Create New Connection</h3>
          <ConnectionForm
            targetSnippetId={targetSnippetId}
            connectionLabel={connectionLabel}
            onTargetChange={setTargetSnippetId}
            onLabelChange={setConnectionLabel}
            isDisabled={isCreating}
          />
          <Button
            onClick={handleCreate}
            variant="primary"
            isLoading={isCreating}
            disabled={isCreating || !targetSnippetId.trim()}
            fullWidth
            className="mt-3"
          >
            Create Connection
          </Button>
        </div>

        {/* Connections Lists */}
        <ConnectionsList
          outgoingConnections={outgoingConnections}
          incomingConnections={incomingConnections}
          onDeleteConnection={handleDelete}
          getSnippetPreview={(id) => getSnippetPreview(id, allSnippets)}
          isDeleting={isDeleting}
        />
      </div>

      {/* Footer */}
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
