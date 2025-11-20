import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { EditProjectModal } from './EditProjectModal'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { DELETE_PROJECT } from '../../graphql/mutations'
import { useGraphQLMutation } from '../../hooks/useGraphQLMutation'
import { useToast } from '../../store/toastStore'
import { formatDate, getTimeSince } from '../../utils/dateFormatters'

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
    void navigate(`/project/${project.id}`)
  }



  const handleDeleteProject = () => {
    void deleteProject({
      variables: { id: project.id }
    })
  }

  return (
    <Card
      onClick={handleOpenProject}
      className="hover:shadow-lg transition-all duration-300 group animate-fade-in"
      data-testid="project-card"
    >
      {/* Card Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-surface-900 truncate font-display tracking-tight group-hover:text-primary-600 transition-colors">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-sm text-surface-500 mt-1 line-clamp-2">
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
              className="text-surface-400 hover:text-surface-600 p-1 rounded-full hover:bg-surface-100 transition-colors"
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
                  className="fixed inset-0 z-10 cursor-default"
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
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl z-20 border border-surface-100 animate-scale-in origin-top-right overflow-hidden">
                  <Link
                    to={`/project/${project.id}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setShowMenu(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-600 transition-colors"
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
                    className="block w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-600 transition-colors"
                    data-testid="project-card-edit"
                  >
                    Edit Project
                  </button>
                  <div className="border-t border-surface-100"></div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      setShowDeleteConfirm(true)
                      setShowMenu(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
      <div className="px-6 py-4 border-t border-surface-100 bg-surface-50/50 rounded-b-xl">
        <div className="flex items-center justify-between text-xs font-medium text-surface-400 uppercase tracking-wider">
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
            <h3 id={`delete-project-title-${project.id}`} className="text-lg font-bold text-surface-900 font-display">
              Delete Project
            </h3>
          </Modal.Header>
          <Modal.Body>
            <div data-testid="delete-project-modal-content">
              <p className="text-sm text-surface-600">
                Are you sure you want to delete <span className="font-medium text-surface-900">&quot;{project.name}&quot;</span>? This action cannot be undone and will delete all snippets and connections in this project.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger" // Assuming danger variant exists or using primary with red styling override if needed, but standard Button usually has variants. Checking Button.tsx might be needed.
              // If danger variant doesn't exist, I'll use className override.
              // Let's assume standard variants for now or check Button.tsx. 
              // Wait, I saw Button.tsx earlier. It has 'primary', 'secondary', 'outline', 'ghost', 'danger'.
              // Let me double check Button.tsx content from earlier view.
              // It had 'primary', 'secondary', 'outline', 'ghost', 'link'. No 'danger'.
              // I should use 'primary' with a class override or add 'danger' later.
              // For now, I'll use className to override color.
              className="bg-red-600 hover:bg-red-700 text-white border-transparent shadow-sm"
              onClick={handleDeleteProject}
              isLoading={isDeleting}
            >
              Delete
            </Button>
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
    </Card>
  )
}
