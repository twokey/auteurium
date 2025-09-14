import { AppSyncResolverHandler } from 'aws-lambda'
import { Logger } from '@aws-lambda-powertools/logger'
import { createContext } from './middleware/auth'
import { handleError } from './utils/errors'
import { userQueries } from './resolvers/user/queries'
import { projectQueries } from './resolvers/project/queries'
import { projectMutations } from './resolvers/project/mutations'
import { snippetQueries } from './resolvers/snippet/queries'
import { snippetMutations } from './resolvers/snippet/mutations'
import { connectionQueries } from './resolvers/connection/queries'
import { connectionMutations } from './resolvers/connection/mutations'

const logger = new Logger({ serviceName: 'auteurium-api' })

export const handler: AppSyncResolverHandler<any, any> = async (event) => {
  const { info, arguments: args } = event
  const { fieldName, parentTypeName } = info

  logger.info('GraphQL request', {
    fieldName,
    parentTypeName,
    requestId: event.request?.headers?.['x-amz-requestid']
  })

  let context: any

  try {
    // Create context from event
    context = await createContext(event)

    // Route to appropriate resolver
    const resolverKey = `${parentTypeName}.${fieldName}`
    
    switch (resolverKey) {
      // User Query resolvers
      case 'Query.me':
        return await userQueries.me(null, args, context)
      case 'Query.users':
        return await userQueries.users(null, args, context)

      // Project Query resolvers
      case 'Query.projects':
        return await projectQueries.projects(null, args, context)
      case 'Query.project':
        return await projectQueries.project(null, args, context)

      // Snippet Query resolvers
      case 'Query.snippet':
        return await snippetQueries.snippet(null, args, context)
      case 'Query.projectSnippets':
        return await snippetQueries.projectSnippets(null, args, context)
      case 'Query.mySnippets':
        return await snippetQueries.mySnippets(null, args, context)
      case 'Query.snippetVersions':
        return await snippetQueries.snippetVersions(null, args, context)

      // Connection Query resolvers
      case 'Query.projectConnections':
        return await connectionQueries.projectConnections(null, args, context)
      case 'Query.snippetConnections':
        return await connectionQueries.snippetConnections(null, args, context)
      case 'Query.connectionsByType':
        return await connectionQueries.connectionsByType(null, args, context)
      case 'Query.exploreGraph':
        return await connectionQueries.exploreGraph(null, args, context)
      case 'Query.connectionStats':
        return await connectionQueries.connectionStats(null, args, context)

      // Project Mutation resolvers
      case 'Mutation.createProject':
        return await projectMutations.createProject(null, args, context)
      case 'Mutation.updateProject':
        return await projectMutations.updateProject(null, args, context)
      case 'Mutation.deleteProject':
        return await projectMutations.deleteProject(null, args, context)

      // Snippet Mutation resolvers
      case 'Mutation.createSnippet':
        return await snippetMutations.createSnippet(null, args, context)
      case 'Mutation.updateSnippet':
        return await snippetMutations.updateSnippet(null, args, context)
      case 'Mutation.deleteSnippet':
        return await snippetMutations.deleteSnippet(null, args, context)
      case 'Mutation.revertSnippetToVersion':
        return await snippetMutations.revertSnippetToVersion(null, args, context)
      case 'Mutation.updateSnippetPositions':
        return await snippetMutations.updateSnippetPositions(null, args, context)

      // Connection Mutation resolvers
      case 'Mutation.createConnection':
        return await connectionMutations.createConnection(null, args, context)
      case 'Mutation.updateConnection':
        return await connectionMutations.updateConnection(null, args, context)
      case 'Mutation.deleteConnection':
        return await connectionMutations.deleteConnection(null, args, context)
      case 'Mutation.bulkCreateConnections':
        return await connectionMutations.bulkCreateConnections(null, args, context)
      case 'Mutation.removeConnectionsBetweenSnippets':
        return await connectionMutations.removeConnectionsBetweenSnippets(null, args, context)

      default:
        logger.warn('Unknown resolver', { resolverKey })
        throw new Error(`Unknown resolver: ${resolverKey}`)
    }
  } catch (error) {
    logger.error('Resolver error', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      fieldName,
      parentTypeName,
      requestId: context?.requestId
    })

    // Use centralized error handling
    handleError(error, logger, { fieldName, parentTypeName })
  }
}