import { GraphQLContext } from '../../types/context'
import { Project, ProjectInput, UpdateProjectInput } from '@auteurium/shared-types'
import {
  createProject,
  updateProject,
  deleteProject,
  getProject
} from '../../database/projects'
import { deleteProjectSnippets } from '../../database/snippets'
import { requireAuth, requireOwnership } from '../../middleware/validation'
import { validateInput } from '../../middleware/validation'
import { z } from 'zod'

// Validation schemas
const createProjectSchema = z.object({
  input: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional()
  })
})

const updateProjectSchema = z.object({
  projectId: z.string(),
  input: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional()
  })
})

const deleteProjectSchema = z.object({
  projectId: z.string()
})

export const projectMutations = {
  // Create a new project
  createProject: async (
    _parent: any,
    args: any,
    context: GraphQLContext
  ): Promise<Project> => {
    const { input } = validateInput(createProjectSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Creating project', {
      projectName: input.name,
      userId: user.id
    })

    return await createProject(input, user.id)
  },

  // Update an existing project
  updateProject: async (
    _parent: any,
    args: any,
    context: GraphQLContext
  ): Promise<Project> => {
    const { projectId, input } = validateInput(updateProjectSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Updating project', {
      projectId,
      userId: user.id
    })

    // Verify ownership before updating
    const project = await getProject(projectId, user.id)
    if (!project) {
      throw new Error('Project not found or access denied')
    }

    requireOwnership(user, project.userId, 'project')

    return await updateProject(projectId, input, user.id)
  },

  // Delete a project with CASCADE DELETE of all related data
  deleteProject: async (
    _parent: any,
    args: any,
    context: GraphQLContext
  ): Promise<boolean> => {
    const { projectId } = validateInput(deleteProjectSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Starting cascade delete of project', {
      projectId,
      userId: user.id
    })

    // Verify ownership before deleting
    const project = await getProject(projectId, user.id)
    if (!project) {
      throw new Error('Project not found or access denied')
    }

    requireOwnership(user, project.userId, 'project')

    try {
      // Step 1: Delete all snippets in the project (this will cascade to connections and versions)
      context.logger.info('Cascade deleting all project snippets', {
        projectId,
        userId: user.id
      })
      await deleteProjectSnippets(projectId, user.id)

      // Step 2: Delete the project itself
      context.logger.info('Deleting project record', {
        projectId,
        userId: user.id
      })
      await deleteProject(projectId, user.id)

      context.logger.info('Project cascade delete completed successfully', {
        projectId,
        userId: user.id
      })

      return true
    } catch (error) {
      context.logger.error('Failed to cascade delete project', {
        error: error instanceof Error ? error.message : error,
        projectId,
        userId: user.id
      })
      throw new Error('Failed to delete project. Some data may remain.')
    }
  }
}