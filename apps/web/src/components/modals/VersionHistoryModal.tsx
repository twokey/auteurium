import { useCallback, useMemo, useState } from 'react'

import { REVERT_SNIPPET } from '../../graphql/mutations'
import { GET_SNIPPET_VERSIONS } from '../../graphql/queries'
import { useGraphQLMutation } from '../../hooks/useGraphQLMutation'
import { useGraphQLQuery } from '../../hooks/useGraphQLQuery'
import { useToast } from '../../shared/store/toastStore'
import { formatDetailedDateTime } from '../../shared/utils/dateFormatters'

interface SnippetVersion {
  id: string
  version: number
  textField1: string
  textField2: string
  createdAt: string
}

interface SnippetVersionsQueryData {
  snippetVersions: SnippetVersion[]
}

interface VersionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  snippet: {
    id: string
    projectId: string
    textField1: string
    textField2: string
    version: number
  }
}

export const VersionHistoryModal = ({ isOpen, onClose, snippet }: VersionHistoryModalProps) => {
  const toast = useToast()
  const [selectedVersion, setSelectedVersion] = useState<SnippetVersion | null>(null)
  const [isReverting, setIsReverting] = useState(false)

  const queryVariables = useMemo(
    () => ({ snippetId: snippet.id }),
    [snippet.id]
  )

  const { data, loading, error } = useGraphQLQuery<SnippetVersionsQueryData, { snippetId: string }>(GET_SNIPPET_VERSIONS, {
    variables: queryVariables,
    skip: !isOpen
  })

  const { mutate: revertSnippetMutation } = useGraphQLMutation(REVERT_SNIPPET, {
    onCompleted: () => {
      // Refetch will be handled by parent component
      toast.success('Snippet reverted successfully!')
      onClose()
    },
    onError: (error: Error) => {
      console.error('Failed to revert snippet:', error)
      toast.error('Failed to revert snippet', error.message)
    }
  })

  const versions = data?.snippetVersions ?? []

  const handleRevert = useCallback(async () => {
    if (!selectedVersion) return

    if (!confirm(`Are you sure you want to revert to version ${selectedVersion.version}? This will create a new version.`)) {
      return
    }

    setIsReverting(true)
    try {
      await revertSnippetMutation({
        variables: {
          projectId: snippet.projectId,
          id: snippet.id,
          version: selectedVersion.version
        }
      })
    } catch (error) {
      console.error('Failed to revert snippet:', error)
      toast.error('Failed to revert snippet', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsReverting(false)
    }
  }, [selectedVersion, snippet.id, snippet.projectId, revertSnippetMutation, toast])

  const getVersionLabel = (version: SnippetVersion, index: number) => {
    if (version.version === snippet.version) return 'Current'
    if (index === 1) return 'Previous'
    return `Version -${index}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isReverting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Snippet ID: <span className="font-mono">#{snippet.id.slice(0, 8)}</span>
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Version List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="p-4 text-center text-red-600">
                Failed to load versions
              </div>
            )}

            {!loading && !error && versions.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No version history available
              </div>
            )}

            {!loading && !error && versions.length > 0 && (
              <div className="divide-y divide-gray-200">
                {versions.map((version, index) => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selectedVersion?.id === version.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {getVersionLabel(version, index)}
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        v{version.version}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDetailedDateTime(version.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Version Preview */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedVersion ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a version to preview
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Version {selectedVersion.version}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatDetailedDateTime(selectedVersion.createdAt)}
                    </p>
                  </div>
                  {selectedVersion.version !== snippet.version && (
                    <button
                      onClick={() => {
                        void handleRevert()
                      }}
                      disabled={isReverting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center gap-2 text-sm"
                    >
                      {isReverting && (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      {isReverting ? 'Reverting...' : 'Revert to This'}
                    </button>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Text Field 1
                    </p>
                    <div className="bg-gray-50 rounded-md p-3 border border-gray-200 whitespace-pre-wrap break-words">
                      {selectedVersion.textField1 !== ''
                        ? selectedVersion.textField1
                        : <span className="text-gray-400 italic">Empty</span>}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Text Field 2
                    </p>
                    <div className="bg-gray-50 rounded-md p-3 border border-gray-200 whitespace-pre-wrap break-words">
                      {selectedVersion.textField2 !== ''
                        ? selectedVersion.textField2
                        : <span className="text-gray-400 italic">Empty</span>}
                    </div>
                  </div>
                </div>

                {selectedVersion.version === snippet.version && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      This is the current version
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            disabled={isReverting}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
