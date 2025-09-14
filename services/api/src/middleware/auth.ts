import { GraphQLContext } from '../types/context'
import { Logger } from '@aws-lambda-powertools/logger'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { User, UserRole } from '@auteurium/shared-types'

const logger = new Logger({ serviceName: 'auteurium-api' })

// Create Cognito JWT verifier instance
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.USER_POOL_CLIENT_ID!
})

export async function validateToken(token: string): Promise<User | null> {
  try {
    // Verify and decode the JWT token
    const payload = await verifier.verify(token)

    // Extract user information from the token payload
    const user: User = {
      id: payload.sub,
      email: payload.email || payload.username || '',
      name: payload.name || payload.email || payload.username || 'Unknown User',
      role: (payload['custom:role'] as UserRole) || UserRole.STANDARD,
      createdAt: new Date(payload.iat * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }

    logger.info('Token validated successfully', {
      userId: user.id,
      email: user.email,
      role: user.role
    })

    return user
  } catch (error) {
    logger.error('Token validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}

export async function createContext(event: any): Promise<GraphQLContext> {
  const requestId = event.requestContext?.requestId || 'unknown'
  
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        requestId,
        isAdmin: false,
        logger
      }
    }

    const token = authHeader.substring(7)
    const user = await validateToken(token)
    
    return {
      user,
      isAdmin: user?.role === UserRole.ADMIN,
      requestId,
      logger
    }
  } catch (error) {
    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    })
    return {
      requestId,
      isAdmin: false,
      logger
    }
  }
}