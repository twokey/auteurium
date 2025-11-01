/**
 * Context menu for snippet operations on the canvas
 * Positioned using viewport-aware calculations from React Flow
 */

import { useCallback, useEffect } from 'react'

import { useContextMenuStore } from '../store/contextMenuStore'

interface ContextMenuProps {
  onEdit: (snippetId: string) => void
  onDelete: (snippetId: string) => void
  onManageConnections: (snippetId: string) => void
  onViewVersions: (snippetId: string) => void
}

export const ContextMenu = ({
  onEdit,
  onDelete,
  onManageConnections,
  onViewVersions,
}: ContextMenuProps) => {
  const { isOpen, snippetId, position, closeContextMenu } = useContextMenuStore()

  // Close context menu on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeContextMenu])

  const handleEdit = useCallback(() => {
    if (!snippetId) return
    closeContextMenu()
    onEdit(snippetId)
  }, [snippetId, onEdit, closeContextMenu])

  const handleDelete = useCallback(() => {
    if (!snippetId) return
    closeContextMenu()
    onDelete(snippetId)
  }, [snippetId, onDelete, closeContextMenu])

  const handleManageConnections = useCallback(() => {
    if (!snippetId) return
    closeContextMenu()
    onManageConnections(snippetId)
  }, [snippetId, onManageConnections, closeContextMenu])

  const handleViewVersions = useCallback(() => {
    if (!snippetId) return
    closeContextMenu()
    onViewVersions(snippetId)
  }, [snippetId, onViewVersions, closeContextMenu])

  if (!isOpen || !snippetId) {
    return null
  }

  return (
    <>
      {/* Backdrop to close menu */}
      <button
        type="button"
        className="fixed inset-0 z-[9998]"
        onClick={closeContextMenu}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            closeContextMenu()
          }
        }}
        aria-label="Close snippet context menu"
      />

      {/* Context Menu */}
      <div
        className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
        style={{
          ...(position.top !== undefined && { top: `${position.top}px` }),
          ...(position.left !== undefined && { left: `${position.left}px` }),
          ...(position.right !== undefined && { right: `${position.right}px` }),
          ...(position.bottom !== undefined && { bottom: `${position.bottom}px` }),
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
  )
}
