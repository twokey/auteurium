import { useState } from 'react'

interface Project {
  id: string
  name: string
  description?: string
  lastModified: string
}

interface CanvasInfoPanelProps {
  project: Project
  snippetCount: number
  connectionCount: number
}

export const CanvasInfoPanel = ({ project, snippetCount, connectionCount }: CanvasInfoPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="absolute top-4 right-4 z-10" data-testid="info-panel">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header - Always visible */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {project.name}
              </h3>
              <p className="text-xs text-gray-500">
                {snippetCount} snippets • {connectionCount} connections
              </p>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="p-3 space-y-3">
            {/* Project Description */}
            {project.description && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Description</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {project.description}
                </p>
              </div>
            )}

            {/* Project Stats */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Canvas Statistics</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Snippets:</span>
                  <span className="font-medium text-gray-900">{snippetCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Connections:</span>
                  <span className="font-medium text-gray-900">{connectionCount}</span>
                </div>
              </div>
            </div>

            {/* Last Modified */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Last Modified</h4>
              <p className="text-xs text-gray-600">
                {formatDate(project.lastModified)}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-gray-100">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Quick Actions</h4>
              <div className="flex space-x-2">
                <button className="text-xs px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition-colors">
                  Export
                </button>
                <button className="text-xs px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition-colors">
                  Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
