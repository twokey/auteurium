import { getProjectById, getProjectsByUserId } from '../../database/projects'
import { createAuthError } from '../../utils/errors'

import type { GraphQLContext } from '../../types/context'
import type { Project } from '@auteurium/shared-types'

export const projectQueries = {
  projects: async (
    _parent: unknown,
    _args: Record<string, never>,
    context: GraphQLContext
  ): Promise<Project[]> => {
    const { user, logger } = context

    if (!user) {
      throw createAuthError()
    }

    logger.info('Fetching user projects', { userId: user.id })

    try {
      return await getProjectsByUserId(user.id)
    } catch (error) {
      logger.error('Error fetching user projects', {
        userId: user.id,
        error: error instanceof Error ? error.message : error
      })
      throw new Error('Failed to fetch projects')
    }
  },

  project: async (
    _parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ): Promise<Project | null> => {
    const { user, logger } = context

    if (!user) {
      throw createAuthError()
    }

    logger.info('Fetching project', { projectId: args.id, userId: user.id })

    try {
      return await getProjectById(user.id, args.id)
    } catch (error) {
      logger.error('Error fetching project', {
        projectId: args.id,
        userId: user.id,
        error: error instanceof Error ? error.message : error
      })
      throw new Error('Failed to fetch project')
    }
  }
}
