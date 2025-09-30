import { UserRole, type User } from '@auteurium/shared-types'
import { Logger } from '@aws-lambda-powertools/logger'
import { CognitoJwtVerifier } from 'aws-jwt-verify'

import { createUser, getUserById } from '../database/users'
import { createAuthError } from '../utils/errors'

import type { GraphQLContext } from '../types/context'
import type { AppSyncIdentityCognito, AppSyncResolverEvent } from 'aws-lambda'

const logger = new Logger({ serviceName: 'auteurium-api' })

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID ?? '',
  tokenUse: 'access',
  clientId: process.env.USER_POOL_CLIENT_ID ?? ''
})

const buildRole = (rawRole: unknown): UserRole =>
  rawRole === UserRole.ADMIN || rawRole === 'admin' ? UserRole.ADMIN : UserRole.STANDARD

const ensureUserRecord = async (
  userId: string,
  email: string,
  name: string,
  role: UserRole
): Promise<User> => {
  try {
    const existingUser = await getUserById(userId)
    if (existingUser) {
      return existingUser
    }
  } catch (lookupError) {
    logger.warn('User lookup failed, continuing with fallback user', {
      userId,
      error: lookupError instanceof Error ? lookupError.message : lookupError
    })
  }

  try {
    const createdUser = await createUser({ id: userId, email, name, role })
    logger.info('Created user during authentication', {
      userId: createdUser.id,
      email: createdUser.email,
      role: createdUser.role
    })
    return createdUser
  } catch (createError) {
    logger.error('Failed to persist authenticated user, using fallback object', {
      userId,
      email,
      error: createError instanceof Error ? createError.message : createError
    })
  }

  const fallbackTimestamp = new Date().toISOString()
  return {
    id: userId,
    email,
    name,
    role,
    createdAt: fallbackTimestamp,
    updatedAt: fallbackTimestamp
  }
}

const extractUserFromIdentity = async (
  identity: AppSyncIdentityCognito,
  requestId: string
): Promise<User | undefined> => {
  const claims = (identity.claims ?? {}) as Record<string, unknown>
  const userId = String(identity.sub)
  const email = typeof claims.email === 'string' ? claims.email : String(identity.username ?? '')
  const rawName =
    typeof claims.name === 'string'
      ? claims.name
      : typeof claims.email === 'string'
        ? claims.email
        : typeof identity.username === 'string'
          ? identity.username
          : 'Unknown User'
  const name = rawName.trim() === '' ? 'Unknown User' : rawName
  const role = buildRole(claims['custom:role'])

  try {
    return await ensureUserRecord(userId, email, name, role)
  } catch (error) {
    logger.error('Failed to build user from identity claims', {
      requestId,
      error: error instanceof Error ? error.message : error
    })
    return undefined
  }
}

const getAuthorizationHeader = (event: AppSyncEvent): string | undefined => {
  const headers = {
    ...event.request?.headers,
    ...('headers' in event ? (event as { headers?: Record<string, string | undefined> }).headers : undefined)
  }

  return headers?.Authorization ?? headers?.authorization
}

export const validateToken = async (token: string): Promise<User | undefined> => {
  try {
    const payload = await verifier.verify(token)

    const userId = String(payload.sub ?? '')
    const emailValue = typeof payload.email === 'string' ? payload.email : (typeof payload.username === 'string' ? payload.username : '')
    const email = String(emailValue)
    const nameValue = typeof payload.name === 'string' ? payload.name : (typeof payload.email === 'string' ? payload.email : (typeof payload.username === 'string' ? payload.username : 'Unknown User'))
    const rawName = String(nameValue)
    const name = rawName.trim() === '' ? 'Unknown User' : rawName
    const role = buildRole(payload['custom:role'])

    return await ensureUserRecord(userId, email, name, role)
  } catch (error) {
    logger.error('Token validation failed', {
      error: error instanceof Error ? error.message : error
    })
    return undefined
  }
}

export type AppSyncEvent = AppSyncResolverEvent<Record<string, unknown>, GraphQLContext>

export const createContext = async (event: AppSyncEvent): Promise<GraphQLContext> => {
  const eventWithContext = event as AppSyncEvent & { requestContext?: { requestId?: string } }
  const requestId = eventWithContext.requestContext?.requestId ?? 'unknown'

  try {
    const identity = event.identity

    if (identity && 'sub' in identity && typeof identity.sub === 'string') {
      const cognitoIdentity = identity as AppSyncIdentityCognito
      const user = await extractUserFromIdentity(cognitoIdentity, requestId)

      if (!user) {
        throw createAuthError('Unable to derive user from identity claims')
      }

      return {
        user,
        isAdmin: user.role === (UserRole.ADMIN as string),
        requestId,
        logger
      }
    }

    const authHeader = getAuthorizationHeader(event)

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      requestId,
      isAdmin: false,
      logger
    }
  }

    const token = authHeader.slice('Bearer '.length)
    const user = await validateToken(token)

    return {
      user,
      isAdmin: (user?.role ?? UserRole.STANDARD) === UserRole.ADMIN,
      requestId,
      logger
    }
  } catch (error) {
    logger.error('Authentication error', {
      requestId,
      error: error instanceof Error ? error.message : error
    })

    return {
      requestId,
      isAdmin: false,
      logger
    }
  }
}
