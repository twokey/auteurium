import { useState } from 'react'

import { CreateProjectModal } from '../components/projects/CreateProjectModal'
import { ProjectCard } from '../components/projects/ProjectCard'
import { Button } from '../components/ui/Button'
import { GET_PROJECTS } from '../graphql/queries'
import { useAuth } from '../hooks/useAuth'
import { useGraphQLQuery } from '../hooks/useGraphQLQuery'

interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  lastModified: string
}

interface ProjectsQueryData {
  projects: Project[] | null
}

const Dashboard = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { user } = useAuth()

  const { data, loading, error, refetch } = useGraphQLQuery<ProjectsQueryData>(GET_PROJECTS)

  const projects: Project[] = data?.projects ?? []

  const handleProjectCreated = () => {
    void refetch()
    setShowCreateModal(false)
  }

  const handleProjectDeleted = () => {
    void refetch()
  }

  const handleProjectUpdated = () => {
    void refetch()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Error loading projects</div>
          <p className="text-surface-600 mb-4">{error.message}</p>
          <Button onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 font-display tracking-tight">
              Welcome back, {user?.name}
            </h1>
            <p className="text-surface-600 mt-1 text-lg">
              Manage your projects and create new snippet canvases
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setShowCreateModal(true)}
            data-testid="create-project-button"
            className="shadow-lg shadow-primary-500/20"
          >
            New Project
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-surface-300" data-testid="empty-projects-state">
          <div className="mx-auto h-16 w-16 bg-surface-50 rounded-full flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-surface-400"
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
          </div>
          <h3 className="mt-2 text-lg font-medium text-surface-900">No projects</h3>
          <p className="mt-1 text-surface-500 max-w-sm mx-auto">
            Get started by creating your first project. Projects help you organize your snippets and ideas.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => setShowCreateModal(true)}
              data-testid="create-first-project-button"
            >
              Create Project
            </Button>
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

// Named export for lazy loading
export { Dashboard }
