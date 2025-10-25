interface SnippetNodeToolbarProps {
  connectionCount: number
  onEdit: () => void
  onDelete: () => void
  onManageConnections: () => void
  onViewVersions: () => void
  onCombine: () => void
  onGenerateImage: () => void
  isGeneratingImage?: boolean
  isCombining?: boolean
  isDisabled?: boolean
}

/**
 * SnippetNodeToolbar - Action buttons for snippet operations
 * Renders: Edit, Delete, Connections, Versions, Combine, Generate Image buttons
 */
export const SnippetNodeToolbar = ({
  connectionCount,
  onEdit,
  onDelete,
  onManageConnections,
  onViewVersions,
  onCombine,
  onGenerateImage,
  isGeneratingImage = false,
  isCombining = false,
  isDisabled = false
}: SnippetNodeToolbarProps) => {
  const buttonClass = `p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`
  const iconClass = `w-4 h-4`

  return (
    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200 flex-wrap">
      {/* Edit */}
      <button
        onClick={onEdit}
        className={buttonClass}
        title="Edit snippet"
        disabled={isDisabled}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className={`${buttonClass} hover:bg-red-100`}
        title="Delete snippet"
        disabled={isDisabled}
      >
        <svg className={`${iconClass} text-red-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Connections */}
      <button
        onClick={onManageConnections}
        className={buttonClass}
        title={`View connections (${connectionCount})`}
        disabled={isDisabled}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        {connectionCount > 0 && (
          <span className="text-[10px] ml-0.5 font-semibold text-blue-600">{connectionCount}</span>
        )}
      </button>

      {/* Versions */}
      <button
        onClick={onViewVersions}
        className={buttonClass}
        title="View version history"
        disabled={isDisabled}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Combine */}
      <button
        onClick={onCombine}
        className={buttonClass}
        title="Combine fields"
        disabled={isDisabled || isCombining}
      >
        {isCombining ? (
          <svg className={`${iconClass} animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
          </svg>
        )}
      </button>

      {/* Generate Image */}
      <button
        onClick={onGenerateImage}
        className={buttonClass}
        title="Generate image"
        disabled={isDisabled || isGeneratingImage}
      >
        {isGeneratingImage ? (
          <svg className={`${iconClass} animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        ) : (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  )
}


