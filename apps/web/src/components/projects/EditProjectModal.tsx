import { useEffect, useState } from 'react'

import { UPDATE_PROJECT } from '../../graphql/mutations'
import { useGraphQLMutation } from '../../hooks/useGraphQLMutation'
import { Modal } from '../../components/ui/Modal'

interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  lastModified: string
}

interface EditProjectModalProps {
  isOpen: boolean
  project: Project | null
  onClose: () => void
  onUpdated: () => void
}

export const EditProjectModal = ({ isOpen, project, onClose, onUpdated }: EditProjectModalProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const { mutate: updateProject, loading } = useGraphQLMutation(UPDATE_PROJECT, {
    onCompleted: () => {
      onUpdated()
      setError('')
    },
    onError: (error: Error) => {
      console.error('Error updating project:', error)
      setError(error.message || 'Failed to update project')
    }
  })

  useEffect(() => {
    if (isOpen && project) {
      setName(project.name)
      setDescription(project.description ?? '')
      setError('')
    }
  }, [project, isOpen])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    if (!project) return

    setError('')
    const trimmedDescription = description.trim()
    const descriptionValue = trimmedDescription === '' ? undefined : trimmedDescription

    void updateProject({
      variables: {
        id: project.id,
        input: {
          name: name.trim(),
          description: descriptionValue
        }
      }
    })
  }

  const handleClose = () => {
    if (!loading) {
      setName('')
      setDescription('')
      setError('')
      onClose()
    }
  }

  if (!project) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div data-testid="edit-project-modal">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1" data-testid="edit-project-modal-content">
          <Modal.Header>
            <div className="flex items-center justify-between">
              <h2 id="edit-project-title" className="text-xl font-semibold text-gray-900">
                Edit Project
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </Modal.Header>

        <Modal.Body>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="text-red-700 text-sm">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="editProjectName" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                id="editProjectName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Enter project name"
                maxLength={100}
                name="name"
                data-testid="project-name-input"
              />
              <p className="text-right text-xs text-gray-500 mt-1">
                {name.length}/100
              </p>
            </div>

            <div>
              <label htmlFor="editProjectDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="editProjectDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 resize-none"
                placeholder="Optional project description"
                maxLength={500}
                name="description"
                data-testid="project-description-input"
              />
              <p className="text-right text-xs text-gray-500 mt-1">
                {description.length}/500
              </p>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            data-testid="edit-project-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            data-testid="edit-project-submit"
          >
            {loading ? 'Updating...' : 'Update Project'}
          </button>
        </Modal.Footer>
        </form>
      </div>
    </Modal>
  )
}
