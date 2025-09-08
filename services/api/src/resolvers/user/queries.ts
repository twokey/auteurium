import { GraphQLContext } from '../../types/context'
import { User } from '@auteurium/shared-types'

export const userQueries = {
  me: async (parent: any, args: any, context: GraphQLContext): Promise<User | null> => {
    const { user, logger } = context
    
    logger.info('Fetching current user profile')
    
    if (!user) {
      return null
    }

    return user
  },

  users: async (parent: any, args: any, context: GraphQLContext): Promise<User[]> => {
    const { isAdmin, logger } = context
    
    if (!isAdmin) {
      throw new Error('Admin access required')
    }

    logger.info('Fetching all users')
    
    // TODO: Implement database query to fetch all users
    throw new Error('Not implemented yet')
  }
}