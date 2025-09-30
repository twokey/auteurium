import { type Project } from '@auteurium/shared-types'
import { z } from 'zod'

import {
  createProject,
  deleteProject,
  getProjectById,
  updateProject
} from '../../database/projects'
import { requireAuth, requireOwnership, validateInput } from '../../middleware/validation'
import { createNotFoundError } from '../../utils/errors'

import type { GraphQLContext } from '../../types/context'

// Validation schemas
const createProjectSchema = z.object({
  input: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional()
  })
})

const updateProjectSchema = z.object({
  id: z.string(),
  input: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional()
  })
})

const deleteProjectSchema = z.object({
  id: z.string()
})

export const projectMutations = {
  // Create a new project
  createProject: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Project> => {
    const { input } = validateInput(createProjectSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Creating project', {
      projectName: input.name,
      userId: user.id
    })

    return await createProject(user.id, input)
  },

  // Update an existing project
  updateProject: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Project> => {
    const { id: projectId, input } = validateInput(updateProjectSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Updating project', {
      projectId,
      userId: user.id
    })

    // Verify ownership before updating
    const project = await getProjectById(user.id, projectId)
    if (!project) {
      throw createNotFoundError('Project')
    }

    requireOwnership(user, project.userId, 'project')

    const updatedProject = await updateProject(user.id, projectId, input)
    if (!updatedProject) {
      throw createNotFoundError('Project')
    }
    return updatedProject
  },

  // Delete a project with CASCADE DELETE of all related data
  deleteProject: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<boolean> => {
    const { id: projectId } = validateInput(deleteProjectSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Starting cascade delete of project', {
      projectId,
      userId: user.id
    })

    // Verify ownership before deleting
    const project = await getProjectById(user.id, projectId)
    if (!project) {
      throw createNotFoundError('Project')
    }

    requireOwnership(user, project.userId, 'project')

    try {
      // Note: Cascade deletion of snippets, connections, and versions should be handled
      // by the database layer or via DynamoDB streams
      context.logger.info('Deleting project', {
        projectId,
        userId: user.id
      })
      await deleteProject(user.id, projectId)

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
