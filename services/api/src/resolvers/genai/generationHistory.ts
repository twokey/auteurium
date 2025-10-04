import { generationHistoryInputSchema } from '@auteurium/validation'
import { Logger } from '@aws-lambda-powertools/logger'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'

import { createContext, type AppSyncEvent } from '../../middleware/auth'
import { handleError } from '../../utils/errors'

import type { GenerationRecord } from '@auteurium/shared-types'
import type { AppSyncResolverHandler } from 'aws-lambda'

const logger = new Logger({ serviceName: 'genai-generation-history' })

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const GENERATIONS_TABLE = process.env.GENERATIONS_TABLE!

interface GenerationHistoryArgs {
  snippetId: string
}

/**
 * Query resolver: generationHistory
 * Returns generation history for a specific snippet
 */
export const handler: AppSyncResolverHandler<GenerationHistoryArgs, GenerationRecord[]> = async (event) => {
  try {
    // Authenticate user
    const context = await createContext(event as unknown as AppSyncEvent)

    if (!context.user) {
      throw new Error('User not authenticated')
    }

    const userId = context.user.id
    const { snippetId } = event.arguments

    logger.info('Fetching generation history', {
      userId,
      snippetId
    })

    // Validate input
    generationHistoryInputSchema.parse({ snippetId })

    // Query generations by snippetId using GSI
    const result = await dynamoClient.send(new QueryCommand({
      TableName: GENERATIONS_TABLE,
      IndexName: 'snippetId-index',
      KeyConditionExpression: 'snippetId = :snippetId',
      ExpressionAttributeValues: {
        ':snippetId': snippetId
      },
      ScanIndexForward: false, // Sort by createdAt descending (newest first)
      Limit: 50 // Limit to last 50 generations
    }))

    const generations = (result.Items ?? []) as GenerationRecord[]

    // Filter to ensure user only sees their own generations
    const userGenerations = generations.filter(gen => gen.userId === userId)

    logger.info('Generation history retrieved', {
      userId,
      snippetId,
      count: userGenerations.length
    })

    return userGenerations
  } catch (error) {
    logger.error('Failed to fetch generation history', {
      error: error instanceof Error ? error.message : String(error),
      snippetId: event.arguments.snippetId
    })

    handleError(error, logger, {
      operation: 'generationHistory',
      snippetId: event.arguments.snippetId
    })

    // Return empty array as fallback
    return []
  }
}
