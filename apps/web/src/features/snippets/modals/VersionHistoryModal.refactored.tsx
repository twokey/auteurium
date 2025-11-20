import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { VersionTimeline } from '../components'
import { useSnippetVersions } from '../hooks'

import type { Snippet } from '../../../types'

interface VersionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  snippet: Snippet
}

/**
 * VersionHistoryModal - Refactored with extracted hooks and components
 * Reduced from 254 lines to ~100 lines through composition
 * 
 * Composes:
 * - useSnippetVersions: Version management and revert logic
 * - VersionTimeline: Version display with timeline UI
 */
export const VersionHistoryModal = ({
  isOpen,
  onClose,
  snippet
}: VersionHistoryModalProps) => {
  // Extract version management
  const { versions, isLoading, error, revertVersion, isReverting } =
    useSnippetVersions(snippet.id)

  // Handle revert
  const handleRevert = async (version: number) => {
    const success = await revertVersion(snippet.projectId, snippet.id, version)
    if (success) {
      // Versions will be refetched automatically by the hook
    }
  }

  if (!isOpen) return null

  const snippetPreview = snippet.textField1?.substring(0, 40) ?? 'Untitled'
  const currentVersion = snippet.version ?? 1

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {/* Header */}
      <Modal.Header>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Version History</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Snippet: <span className="font-mono">#{snippet.id.slice(0, 8)}</span> -{' '}
          {snippetPreview}
        </p>
      </Modal.Header>

      {/* Body */}
      <div className="max-h-[70vh] overflow-y-auto p-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
            <p className="text-sm text-red-800">Failed to load version history</p>
          </div>
        )}

        <VersionTimeline
          versions={versions}
          currentVersion={currentVersion}
          onRevert={handleRevert}
          isReverting={isReverting}
          isLoading={isLoading}
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
