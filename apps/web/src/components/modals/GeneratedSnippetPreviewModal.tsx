interface GeneratedSnippetPreviewModalProps {
  isOpen: boolean
  content: string
  onCancel: () => void
  onCreate: () => void
  isCreating?: boolean
}

export const GeneratedSnippetPreviewModal = ({
  isOpen,
  content,
  onCancel,
  onCreate,
  isCreating = false
}: GeneratedSnippetPreviewModalProps) => {
  if (!isOpen) {
    return null
  }

  const hasContent = content.trim() !== ''

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Generated Snippet</h2>
          <p className="text-sm text-gray-500 mt-1">
            Review the generated content before creating a new snippet.
          </p>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-800 whitespace-pre-wrap">
            {content}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center gap-2"
            disabled={isCreating || !hasContent}
          >
            {isCreating ? 'Creating...' : 'Create Snippet'}
          </button>
        </div>
      </div>
    </div>
  )
}
