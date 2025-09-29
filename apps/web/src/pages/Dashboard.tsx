import { useQuery } from '@apollo/client'
import { useState } from 'react'

import { CreateProjectModal } from '../components/projects/CreateProjectModal'
import { ProjectCard } from '../components/projects/ProjectCard'
import { GET_PROJECTS } from '../graphql/queries'
import { useAuth } from '../hooks/useAuth'

interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  lastModified: string
}

export const Dashboard = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { user } = useAuth()
  
  const { data, loading, error, refetch } = useQuery(GET_PROJECTS, {
    errorPolicy: 'all'
  })

  const isNonBlockingProjectsError = error?.graphQLErrors?.some((graphQLError) => {
    if (!graphQLError.path || graphQLError.path[0] !== 'projects') {
      return false
    }

    return graphQLError.message.includes('type mismatch error')
  })

  const projects: Project[] = isNonBlockingProjectsError ? [] : data?.projects || []

  const handleProjectCreated = () => {
    refetch()
    setShowCreateModal(false)
  }

  const handleProjectDeleted = () => {
    refetch()
  }

  const handleProjectUpdated = () => {
    refetch()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !isNonBlockingProjectsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Error loading projects</div>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your projects and create new snippet canvases
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            data-testid="create-project-button"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12" data-testid="empty-projects-state">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first project.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              data-testid="create-first-project-button"
            >
              Create Project
            </button>
          </div>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          data-testid="projects-grid"
        >
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDeleted={handleProjectDeleted}
              onUpdated={handleProjectUpdated}
            />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  )
}
