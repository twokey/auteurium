import type { Connection } from '../../../types'

interface ConnectionsListProps {
  outgoingConnections: Connection[]
  incomingConnections: (Connection & { sourceSnippet?: any })[]
  onDeleteConnection: (connectionId: string) => Promise<void>
  getSnippetPreview: (snippetId: string) => string
  isDeleting?: boolean
}

/**
 * ConnectionsList - Display outgoing and incoming connections
 * Shows connection details with delete buttons
 */
export const ConnectionsList = ({
  outgoingConnections,
  incomingConnections,
  onDeleteConnection,
  getSnippetPreview,
  isDeleting = false
}: ConnectionsListProps) => {
  return (
    <div className="space-y-6">
      {/* Outgoing Connections */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Outgoing Connections ({outgoingConnections.length})
        </h3>
        {outgoingConnections.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No outgoing connections</p>
        ) : (
          <div className="space-y-2">
            {outgoingConnections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
              >
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    → {getSnippetPreview(connection.targetSnippetId)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ID: <span className="font-mono">#{connection.targetSnippetId.slice(0, 8)}</span>
                    {connection.label && (
                      <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs">
                        {connection.label}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    void onDeleteConnection(connection.id)
                  }}
                  className="ml-3 text-red-600 hover:text-red-800 p-1"
                  title="Delete connection"
                  disabled={isDeleting}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming Connections */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Incoming Connections ({incomingConnections.length})
        </h3>
        {incomingConnections.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No incoming connections</p>
        ) : (
          <div className="space-y-2">
            {incomingConnections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-200"
              >
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    ← {getSnippetPreview(connection.sourceSnippetId)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ID: <span className="font-mono">#{connection.sourceSnippetId.slice(0, 8)}</span>
                    {connection.label && (
                      <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs">
                        {connection.label}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    void onDeleteConnection(connection.id)
                  }}
                  className="ml-3 text-red-600 hover:text-red-800 p-1"
                  title="Delete connection"
                  disabled={isDeleting}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
