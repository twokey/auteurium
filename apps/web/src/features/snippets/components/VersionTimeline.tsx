import { formatDistanceToNow } from 'date-fns'

import type { SnippetVersion } from '../../../types'
import { getPrimaryTextValue } from '../../../utils/snippetContent'

interface VersionTimelineProps {
  versions: SnippetVersion[]
  currentVersion: number
  onRevert: (version: number) => Promise<void>
  isReverting?: boolean
  isLoading?: boolean
}

/**
 * VersionTimeline - Display version history timeline
 * Shows versions with timestamps and diff indicators
 */
export const VersionTimeline = ({
  versions,
  currentVersion,
  onRevert,
  isReverting = false,
  isLoading = false
}: VersionTimelineProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">No version history available</p>
      </div>
    )
  }

  // Sort versions in descending order (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version)

  return (
    <div className="space-y-3">
      {sortedVersions.map((version, index) => {
        const isCurrent = version.version === currentVersion
        const nextVersion = index < sortedVersions.length - 1 ? sortedVersions[index + 1] : null
        const primaryText = getPrimaryTextValue({ content: version.content }).trim()
        const nextPrimaryText = nextVersion ? getPrimaryTextValue({ content: nextVersion.content }).trim() : null

        return (
          <div key={version.id} className="relative">
            {/* Timeline connector */}
            {index < sortedVersions.length - 1 && (
              <div className="absolute left-4 top-12 w-0.5 h-8 bg-gray-200"></div>
            )}

            {/* Version card */}
            <div
              className={`pl-14 py-3 px-3 rounded-md border transition-colors ${
                isCurrent
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Timeline dot */}
              <div
                className={`absolute left-1.5 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isCurrent ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
                }`}
              >
                {isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
              </div>

              {/* Version info */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      Version {version.version}
                    </p>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        Current
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-2">
                    {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </p>

                  {/* Content preview */}
                  <div className="mt-2 space-y-1">
                    {primaryText && (
                      <div className="text-xs bg-gray-100 p-2 rounded text-gray-700 max-h-20 overflow-hidden">
                        <p className="font-mono line-clamp-3">
                          {primaryText.substring(0, 100)}
                          {primaryText.length > 100 ? '...' : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Diff indicator */}
                  {nextVersion && (
                    <div className="mt-2 text-xs text-amber-600">
                      {primaryText !== nextPrimaryText && (
                        <span className="inline-block px-1.5 py-0.5 bg-amber-50 rounded">
                          Content changed
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Revert button */}
                {!isCurrent && (
                  <button
                    onClick={() => {
                      void onRevert(version.version)
                    }}
                    disabled={isReverting}
                    className="ml-3 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  >
                    {isReverting ? 'Reverting...' : 'Revert'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
