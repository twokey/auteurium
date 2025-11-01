import { useState, type KeyboardEventHandler } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { EditProjectModal } from './EditProjectModal'
import { DELETE_PROJECT } from '../../graphql/mutations'
import { useGraphQLMutation } from '../../hooks/useGraphQLMutation'
import { useToast } from '../../shared/store/toastStore'
import { formatDate, getTimeSince } from '../../shared/utils/dateFormatters'
import { Modal } from '../../shared/components/ui/Modal'

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
  const toast = useToast()
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const navigate = useNavigate()

  const { mutate: deleteProject, loading: isDeleting } = useGraphQLMutation(DELETE_PROJECT, {
    onCompleted: () => {
      toast.success('Project deleted successfully!')
      onDeleted()
      setShowDeleteConfirm(false)
    },
    onError: (error: Error) => {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project', 'Please try again')
    }
  })

  const handleOpenProject = () => {
    navigate(`/project/${project.id}`)
  }

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpenProject()
    }
  }

  const handleDeleteProject = () => {
    void deleteProject({
      variables: { id: project.id }
    })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpenProject}
      onKeyDown={handleKeyDown}
      className="relative bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
      data-testid="project-card"
    >
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
              onClick={(event) => {
                event.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
              data-testid="project-card-menu-button"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            
            {showMenu && (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Close project card actions"
                  className="fixed inset-0 z-10"
                  onClick={(event) => {
                    if (event.target === event.currentTarget) {
                      setShowMenu(false)
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setShowMenu(false)
                    }
                  }}
                ></div>
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                  <Link
                    to={`/project/${project.id}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setShowMenu(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    data-testid="project-card-open"
                  >
                    Open Canvas
                  </Link>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      setShowEditModal(true)
                      setShowMenu(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    data-testid="project-card-edit"
                  >
                    Edit Project
                  </button>
                  <div className="border-t border-gray-200"></div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      setShowDeleteConfirm(true)
                      setShowMenu(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    data-testid="project-card-delete"
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

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="sm"
      >
        <div data-testid="delete-project-modal">
          <Modal.Header>
            <h3 id={`delete-project-title-${project.id}`} className="text-lg font-medium text-gray-900">
              Delete Project
            </h3>
          </Modal.Header>
          <Modal.Body>
            <div data-testid="delete-project-modal-content">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone and will delete all snippets and connections in this project.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </Modal.Footer>
        </div>
      </Modal>

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
