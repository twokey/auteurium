/**
 * Canvas Modals Component
 * Centralizes all modal rendering for the canvas
 */

import { DeleteSnippetConfirmation } from '../../../components/modals/DeleteSnippetConfirmation'
import { EditSnippetModal } from '../../../components/modals/EditSnippetModal'
import { GeneratedSnippetPreviewModal } from '../../../components/modals/GeneratedSnippetPreviewModal'
import { ManageConnectionsModal } from '../../../components/modals/ManageConnectionsModal'
import { VersionHistoryModal } from '../../../components/modals/VersionHistoryModal'
import { useModalStore } from '../../../shared/store/modalStore'

import type { Snippet } from '../../../types'

interface CanvasModalsProps {
  snippets: Snippet[]
  onCreateGeneratedSnippet: () => Promise<void>
  refetch: () => Promise<void>
}

export const CanvasModals = ({
  snippets,
  onCreateGeneratedSnippet,
  refetch
}: CanvasModalsProps) => {
  const {
    editSnippet,
    closeEditSnippet,
    deleteSnippet,
    closeDeleteSnippet,
    manageConnections,
    closeManageConnections,
    versionHistory,
    closeVersionHistory,
    generatedSnippetPreview,
    closeGeneratedSnippetPreview
  } = useModalStore()

  // Find the current snippet from the snippets array to ensure we have the latest data
  const currentEditSnippet = editSnippet.isOpen && editSnippet.snippet
    ? snippets.find(s => s.id === editSnippet.snippet?.id) ?? editSnippet.snippet
    : null

  const currentDeleteSnippet = deleteSnippet.isOpen && deleteSnippet.snippet
    ? snippets.find(s => s.id === deleteSnippet.snippet?.id) ?? deleteSnippet.snippet
    : null

  const currentManageConnectionsSnippet = manageConnections.isOpen && manageConnections.snippet
    ? snippets.find(s => s.id === manageConnections.snippet?.id) ?? manageConnections.snippet
    : null

  const currentVersionHistorySnippet = versionHistory.isOpen && versionHistory.snippet
    ? snippets.find(s => s.id === versionHistory.snippet?.id) ?? versionHistory.snippet
    : null

  return (
    <>
      {/* Edit Snippet Modal */}
      {editSnippet.isOpen && currentEditSnippet && (
        <EditSnippetModal
          isOpen={true}
          onClose={() => {
            closeEditSnippet()
          }}
          onSave={refetch}
          snippet={currentEditSnippet}
        />
      )}

      {/* Delete Snippet Confirmation */}
      {deleteSnippet.isOpen && currentDeleteSnippet && (
        <DeleteSnippetConfirmation
          isOpen={true}
          onClose={closeDeleteSnippet}
          snippet={currentDeleteSnippet}
          onDeleted={refetch}
        />
      )}

      {/* Manage Connections Modal */}
      {manageConnections.isOpen && currentManageConnectionsSnippet && (
        <ManageConnectionsModal
          isOpen={true}
          onClose={closeManageConnections}
          onConnectionChange={refetch}
          snippet={currentManageConnectionsSnippet}
          allSnippets={snippets}
        />
      )}

      {/* Version History Modal */}
      {versionHistory.isOpen && currentVersionHistorySnippet && (
        <VersionHistoryModal
          isOpen={true}
          onClose={closeVersionHistory}
          snippet={currentVersionHistorySnippet}
        />
      )}

      {/* Generated Snippet Preview Modal */}
      <GeneratedSnippetPreviewModal
        isOpen={generatedSnippetPreview.isOpen}
        content={generatedSnippetPreview.content}
        onCancel={closeGeneratedSnippetPreview}
        onCreate={() => { void onCreateGeneratedSnippet() }}
        isCreating={generatedSnippetPreview.isCreating}
      />
    </>
  )
}
