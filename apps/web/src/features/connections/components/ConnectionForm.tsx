interface ConnectionFormProps {
  targetSnippetId: string
  connectionLabel: string
  onTargetChange: (value: string) => void
  onLabelChange: (value: string) => void
  isDisabled?: boolean
}

/**
 * ConnectionForm - Input fields for creating connections
 * Renders target snippet ID and optional label inputs
 */
export const ConnectionForm = ({
  targetSnippetId,
  connectionLabel,
  onTargetChange,
  onLabelChange,
  isDisabled = false
}: ConnectionFormProps) => {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="targetSnippetId" className="block text-sm text-gray-700 mb-1">
          Target Snippet ID
        </label>
        <input
          id="targetSnippetId"
          type="text"
          value={targetSnippetId}
          onChange={(e) => onTargetChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter snippet ID (full or first 8 chars)..."
          disabled={isDisabled}
        />
        <p className="text-xs text-gray-500 mt-1">
          Tip: You can see snippet IDs on the canvas nodes
        </p>
      </div>

      <div>
        <label htmlFor="connectionLabel" className="block text-sm text-gray-700 mb-1">
          Connection Label (optional)
        </label>
        <input
          id="connectionLabel"
          type="text"
          value={connectionLabel}
          onChange={(e) => onLabelChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., depends on, explains, related to..."
          disabled={isDisabled}
        />
      </div>
    </div>
  )
}


