import { GraphQLContext } from '../../types/context'
import { Project } from '@auteurium/shared-types'
import { getProjectsByUserId, getProjectById } from '../../database/projects'

export const projectQueries = {
  projects: async (parent: any, args: any, context: GraphQLContext): Promise<Project[]> => {
    const { user, logger } = context

    if (!user) {
      throw new Error('Authentication required')
    }

    logger.info('Fetching user projects', { userId: user.id })

    try {
      const projects = await getProjectsByUserId(user.id)

      if (!Array.isArray(projects)) {
        logger.warn('Projects resolver received non-array response, coercing to empty array', {
          userId: user.id,
          receivedType: typeof projects
        })
        return []
      }

      return projects
    } catch (error) {
      logger.error('Error fetching user projects', { userId: user.id, error })
      throw new Error('Failed to fetch projects')
    }
  },

  project: async (parent: any, args: { id: string }, context: GraphQLContext): Promise<Project | null> => {
    const { user, logger } = context

    if (!user) {
      throw new Error('Authentication required')
    }

    logger.info('Fetching project', { projectId: args.id, userId: user.id })

    try {
      return await getProjectById(user.id, args.id)
    } catch (error) {
      logger.error('Error fetching project', { projectId: args.id, userId: user.id, error })
      throw new Error('Failed to fetch project')
    }
  }
}
