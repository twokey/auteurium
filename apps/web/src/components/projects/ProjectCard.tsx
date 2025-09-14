import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { DELETE_PROJECT } from '../../graphql/mutations'
import { EditProjectModal } from './EditProjectModal'

interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  lastModified: string
}

interface ProjectCardProps {
  project: Project
  onDeleted: () => void
  onUpdated: () => void
}

export const ProjectCard = ({ project, onDeleted, onUpdated }: ProjectCardProps) => {
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const navigate = useNavigate()

  const [deleteProject, { loading: isDeleting }] = useMutation(DELETE_PROJECT, {
    onCompleted: () => {
      onDeleted()
      setShowDeleteConfirm(false)
    },
    onError: (error) => {
      console.error('Error deleting project:', error)
      alert('Failed to delete project. Please try again.')
    }
  })

  const handleDeleteProject = () => {
    deleteProject({
      variables: { id: project.id }
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(dateString)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          
          {/* Menu Button */}
          <div className="relative ml-4">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                ></div>
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                  <button
                    onClick={() => {
                      navigate(`/project/${project.id}`)
                      setShowMenu(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Open Canvas
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(true)
                      setShowMenu(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Edit Project
                  </button>
                  <div className="border-t border-gray-200"></div>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true)
                      setShowMenu(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete Project
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Created {formatDate(project.createdAt)}</span>
          <span>Modified {getTimeSince(project.lastModified)}</span>
        </div>
      </div>

      {/* Click to open */}
      <button
        onClick={() => navigate(`/project/${project.id}`)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label={`Open ${project.name} project`}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Delete Project
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete "{project.name}"? This action cannot be undone and will delete all snippets and connections in this project.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={showEditModal}
        project={project}
        onClose={() => setShowEditModal(false)}
        onUpdated={() => {
          onUpdated()
          setShowEditModal(false)
        }}
      />
    </div>
  )
}