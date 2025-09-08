import { GraphQLContext } from '../types/context'
import { Logger } from '@aws-lambda-powertools/logger'

const logger = new Logger({ serviceName: 'auteurium-api' })

export async function validateToken(token: string): Promise<any> {
  // TODO: Implement Cognito token validation
  // This would typically verify the JWT token with AWS Cognito
  throw new Error('Token validation not implemented yet')
}

export async function createContext(event: any): Promise<GraphQLContext> {
  const requestId = event.requestContext?.requestId || 'unknown'
  
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        requestId,
        isAdmin: false,
        logger: logger.createChild({ requestId })
      }
    }

    const token = authHeader.substring(7)
    const user = await validateToken(token)
    
    return {
      user,
      isAdmin: user?.role === 'admin',
      requestId,
      logger: logger.createChild({ requestId, userId: user?.id })
    }
  } catch (error) {
    logger.error('Authentication error', { error, requestId })
    return {
      requestId,
      isAdmin: false,
      logger: logger.createChild({ requestId })
    }
  }
}