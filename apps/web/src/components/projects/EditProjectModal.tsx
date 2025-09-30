import { useMutation } from '@apollo/client'
import { useEffect, useState } from 'react'

import { UPDATE_PROJECT } from '../../graphql/mutations'

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

  const [updateProject, { loading }] = useMutation(UPDATE_PROJECT, {
    onCompleted: () => {
      onUpdated()
      setError('')
    },
    onError: (error) => {
      console.error('Error updating project:', error)
      setError(error.message || 'Failed to update project')
    }
  })

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description ?? '')
      setError('')
    }
  }, [project])

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

  if (!isOpen || !project) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="button"
      tabIndex={0}
      aria-label="Close edit project modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          handleClose()
        }
      }}
      data-testid="edit-project-modal"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-project-title"
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        data-testid="edit-project-modal-content"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="edit-project-title" className="text-xl font-semibold text-gray-900">
            Edit Project
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="text-right text-xs text-gray-500 mt-1">
              {description.length}/500
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
              data-testid="edit-project-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              data-testid="edit-project-submit"
            >
              {loading ? 'Updating...' : 'Update Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
