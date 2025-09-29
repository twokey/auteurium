import { GraphQLContext } from '../types/context'
import { Logger } from '@aws-lambda-powertools/logger'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { User, UserRole } from '@auteurium/shared-types'
import { getUserById, createUser } from '../database/users'

const logger = new Logger({ serviceName: 'auteurium-api' })

// Create Cognito JWT verifier instance (used as a fallback when identity isn't populated)
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.USER_POOL_CLIENT_ID!
})

const buildRole = (rawRole?: unknown): UserRole => {
  if (rawRole === UserRole.ADMIN || rawRole === 'admin') {
    return UserRole.ADMIN
  }
  return UserRole.STANDARD
}

const ensureUserRecord = async (userId: string, email: string, name: string, role: UserRole): Promise<User> => {
  let user: User | null = null

  try {
    user = await getUserById(userId)
  } catch (dbLookupError) {
    logger.error('Failed to fetch user from database', {
      userId,
      error: dbLookupError instanceof Error ? dbLookupError.message : dbLookupError
    })
  }

  if (!user) {
    try {
      user = await createUser({ id: userId, email, name, role })
      logger.info('Created new user in database', { userId: user.id, email: user.email, role: user.role })
    } catch (createUserError) {
      logger.error('Failed to create user in database', {
        userId,
        email,
        error: createUserError instanceof Error ? createUserError.message : createUserError
      })
    }
  }

  if (!user) {
    const fallbackTimestamp = new Date().toISOString()
    user = {
      id: userId,
      email,
      name,
      role,
      createdAt: fallbackTimestamp,
      updatedAt: fallbackTimestamp
    }
  }

  return user
}

export async function validateToken(token: string): Promise<User | undefined> {
  try {
    // Verify and decode the JWT token - auto-create users in DB
    const payload = await verifier.verify(token)

    const userId = String(payload.sub || '')
    const email = String(payload.email || payload.username || '')
    const name = String(payload.name || payload.email || payload.username || 'Unknown User')
    const role = buildRole(payload['custom:role'])

    const user = await ensureUserRecord(userId, email, name, role)

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
    return undefined
  }
}

export async function createContext(event: any): Promise<GraphQLContext> {
  const requestId = event.requestContext?.requestId || 'unknown'
  
  try {
    // Preferred path: leverage AppSync identity (already verified by Cognito User Pool auth)
    const identity = event.identity

    if (identity?.sub) {
      const claims = identity.claims || {}
      const userId = String(identity.sub)
      const email = String(claims.email || identity.username || '')
      const name = String(claims.name || claims.email || identity.username || 'Unknown User')
      const role = buildRole(claims['custom:role'])

      const user = await ensureUserRecord(userId, email, name, role)

      return {
        user,
        isAdmin: user.role === UserRole.ADMIN,
        requestId,
        logger
      }
    }

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
