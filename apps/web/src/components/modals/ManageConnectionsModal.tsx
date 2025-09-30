import { useMutation } from '@apollo/client'
import { useCallback, useState } from 'react'
import { CREATE_CONNECTION, DELETE_CONNECTION } from '../../graphql/mutations'
import { GET_PROJECT_WITH_SNIPPETS } from '../../graphql/queries'

interface Connection {
  id: string
  sourceSnippetId: string
  targetSnippetId: string
  label?: string | null
  createdAt?: string
  updatedAt?: string
}

interface ManageConnectionsModalProps {
  isOpen: boolean
  onClose: () => void
  snippet: {
    id: string
    projectId: string
    textField1: string
    connections?: Connection[]
  }
  allSnippets: Array<{
    id: string
    textField1: string
    connections?: Connection[]
  }>
}

export const ManageConnectionsModal = ({ isOpen, onClose, snippet, allSnippets }: ManageConnectionsModalProps) => {
  const [targetSnippetId, setTargetSnippetId] = useState('')
  const [connectionLabel, setConnectionLabel] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [createConnectionMutation] = useMutation(CREATE_CONNECTION, {
    refetchQueries: [
      {
        query: GET_PROJECT_WITH_SNIPPETS,
        variables: { projectId: snippet.projectId }
      }
    ],
    awaitRefetchQueries: true
  })

  const [deleteConnectionMutation] = useMutation(DELETE_CONNECTION, {
    refetchQueries: [
      {
        query: GET_PROJECT_WITH_SNIPPETS,
        variables: { projectId: snippet.projectId }
      }
    ],
    awaitRefetchQueries: true
  })

  // Get all connections where this snippet is the source
  const outgoingConnections = snippet.connections || []

  // Get all connections where this snippet is the target
  const incomingConnections = allSnippets
    .flatMap(s => (s.connections || []).map(conn => ({ ...conn, sourceSnippet: s })))
    .filter(conn => conn.targetSnippetId === snippet.id)

  const handleCreateConnection = useCallback(async () => {
    const trimmedId = targetSnippetId.trim()
    if (!trimmedId) return

    // Check if snippet exists
    const targetExists = allSnippets.some(s => s.id === trimmedId || s.id.startsWith(trimmedId))
    if (!targetExists) {
      alert('Target snippet not found. Please check the snippet ID.')
      return
    }

    // Find the full ID if user entered partial ID
    const fullTargetId = allSnippets.find(s => s.id === trimmedId || s.id.startsWith(trimmedId))?.id

    if (!fullTargetId) return

    // Don't allow self-connections
    if (fullTargetId === snippet.id) {
      alert('Cannot create connection to the same snippet.')
      return
    }

    setIsCreating(true)
    try {
      await createConnectionMutation({
        variables: {
          input: {
            projectId: snippet.projectId,
            sourceSnippetId: snippet.id,
            targetSnippetId: fullTargetId,
            label: connectionLabel.trim() || null
          }
        }
      })
      setTargetSnippetId('')
      setConnectionLabel('')
    } catch (error) {
      console.error('Failed to create connection:', error)
      alert(`Failed to create connection: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreating(false)
    }
  }, [targetSnippetId, connectionLabel, snippet, allSnippets, outgoingConnections, createConnectionMutation])

  const handleDeleteConnection = useCallback(async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return

    try {
      await deleteConnectionMutation({
        variables: {
          id: connectionId
        }
      })
    } catch (error) {
      console.error('Failed to delete connection:', error)
      alert(`Failed to delete connection: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [deleteConnectionMutation])

  const getSnippetPreview = useCallback((snippetId: string) => {
    const foundSnippet = allSnippets.find(s => s.id === snippetId)
    if (!foundSnippet) return `Unknown snippet (${snippetId.slice(0, 8)})`
    const preview = foundSnippet.textField1?.trim() || 'Untitled snippet'
    return preview.length > 40 ? preview.substring(0, 40) + '...' : preview
  }, [allSnippets])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Manage Connections</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Snippet: <span className="font-mono">#{snippet.id.slice(0, 8)}</span> - {snippet.textField1?.substring(0, 40) || 'Untitled'}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Create New Connection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Create New Connection</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="targetSnippetId" className="block text-sm text-gray-700 mb-1">
                  Target Snippet ID
                </label>
                <input
                  id="targetSnippetId"
                  type="text"
                  value={targetSnippetId}
                  onChange={(e) => setTargetSnippetId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter snippet ID (full or first 8 chars)..."
                  disabled={isCreating}
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
                  onChange={(e) => setConnectionLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., depends on, explains, related to..."
                  disabled={isCreating}
                />
              </div>

              <button
                onClick={handleCreateConnection}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center justify-center gap-2"
                disabled={isCreating || !targetSnippetId.trim()}
              >
                {isCreating && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isCreating ? 'Creating...' : 'Create Connection'}
              </button>
            </div>
          </div>

          {/* Outgoing Connections */}
          <div className="mb-6">
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
                          <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                            {connection.label}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteConnection(connection.id)}
                      className="ml-3 text-red-600 hover:text-red-800 p-1"
                      title="Delete connection"
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
                          <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                            {connection.label}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteConnection(connection.id)}
                      className="ml-3 text-red-600 hover:text-red-800 p-1"
                      title="Delete connection"
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
