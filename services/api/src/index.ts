import { Logger } from '@aws-lambda-powertools/logger'

import { createContext, type AppSyncEvent } from './middleware/auth'
import { connectionMutations } from './resolvers/connection/mutations'
import { connectionQueries } from './resolvers/connection/queries'
import { projectMutations } from './resolvers/project/mutations'
import { projectQueries } from './resolvers/project/queries'
import { snippetMutations } from './resolvers/snippet/mutations'
import { snippetQueries } from './resolvers/snippet/queries'
import { userQueries } from './resolvers/user/queries'
import { handleError } from './utils/errors'

import type { GraphQLContext } from './types/context'
import type { AppSyncResolverEvent, AppSyncResolverHandler } from 'aws-lambda'

const logger = new Logger({ serviceName: 'auteurium-api' })

type ResolverFunction = (
  parent: unknown,
  args: unknown,
  context: GraphQLContext
) => Promise<unknown>

const resolverMap: Record<string, ResolverFunction> = {
  'Query.me': userQueries.me,
  'Query.users': userQueries.users,

  'Query.projects': projectQueries.projects,
  'Query.project': projectQueries.project,

  'Query.snippet': snippetQueries.snippet,
  'Query.projectSnippets': snippetQueries.projectSnippets,
  'Query.mySnippets': snippetQueries.mySnippets,
  'Query.snippetVersions': snippetQueries.snippetVersions,

  'Query.projectConnections': connectionQueries.projectConnections,
  'Query.snippetConnections': connectionQueries.snippetConnections,
  'Query.connectionsByType': connectionQueries.connectionsByType,
  'Query.exploreGraph': connectionQueries.exploreGraph,
  'Query.connectionStats': connectionQueries.connectionStats,

  'Mutation.createProject': projectMutations.createProject,
  'Mutation.updateProject': projectMutations.updateProject,
  'Mutation.deleteProject': projectMutations.deleteProject,

  'Mutation.createSnippet': snippetMutations.createSnippet,
  'Mutation.updateSnippet': snippetMutations.updateSnippet,
  'Mutation.deleteSnippet': snippetMutations.deleteSnippet,
  'Mutation.combineSnippetConnections': snippetMutations.combineSnippetConnections,
  'Mutation.revertSnippetToVersion': snippetMutations.revertSnippetToVersion,
  'Mutation.updateSnippetPositions': snippetMutations.updateSnippetPositions,

  'Mutation.createConnection': connectionMutations.createConnection,
  'Mutation.updateConnection': connectionMutations.updateConnection,
  'Mutation.deleteConnection': connectionMutations.deleteConnection,
  'Mutation.bulkCreateConnections': connectionMutations.bulkCreateConnections,
  'Mutation.removeConnectionsBetweenSnippets': connectionMutations.removeConnectionsBetweenSnippets,

  // Field resolvers
  'Project.snippets': snippetQueries.projectSnippets
}

const getRequestId = (event: AppSyncEvent): string => {
  const eventWithContext = event as AppSyncEvent & { requestContext?: { requestId?: string } }
  if (eventWithContext.requestContext?.requestId) {
    return eventWithContext.requestContext.requestId
  }

  const headers = event.request?.headers as Record<string, string> | undefined
  if (headers && typeof headers['x-amz-requestid'] === 'string') {
    return headers['x-amz-requestid']
  }

  return 'unknown'
}

export const handler: AppSyncResolverHandler<Record<string, unknown>, unknown> = async (
  lambdaEvent: AppSyncResolverEvent<Record<string, unknown>, Record<string, unknown> | null>
) => {
  const event = lambdaEvent as unknown as AppSyncEvent
  const { fieldName, parentTypeName } = event.info
  const resolverKey = `${parentTypeName}.${fieldName}`
  const resolver = resolverMap[resolverKey]
  const requestId = getRequestId(event)

  logger.info('GraphQL request', {
    fieldName,
    parentTypeName,
    requestId,
    hasSource: !!event.source
  })

  if (!resolver) {
    logger.warn('Unknown resolver', { resolverKey, requestId })
    throw new Error(`Unknown resolver: ${resolverKey}`)
  }

  try {
    const context = await createContext(event)
    // Pass event.source as the parent for field resolvers
    return await resolver(event.source ?? null, event.arguments, context)
  } catch (error) {
    logger.error('Resolver error', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      fieldName,
      parentTypeName,
      requestId
    })

    handleError(error, logger, { fieldName, parentTypeName, requestId })
  }
}
