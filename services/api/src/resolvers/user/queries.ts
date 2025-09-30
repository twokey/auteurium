import { requireAdmin } from '../../middleware/validation'

import type { GraphQLContext } from '../../types/context'
import type { User } from '@auteurium/shared-types'

export const userQueries = {
  me: async (_parent: unknown, _args: unknown, context: GraphQLContext): Promise<User | null> => {
    const { user, logger } = context

    logger.info('Fetching current user profile')

    if (!user) {
      return null
    }

    return user
  },

  users: async (_parent: unknown, _args: unknown, context: GraphQLContext): Promise<User[]> => {
    const { logger } = context
    requireAdmin(context.user)

    logger.info('Fetching all users')

    // Not yet implemented
    throw new Error('Not implemented')
  }
}