import { GenerationOrchestrator } from '@auteurium/genai-orchestrator'
import { generateContentInputSchema } from '@auteurium/validation'
import { Logger } from '@aws-lambda-powertools/logger'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

import { createContext, type AppSyncEvent } from '../../middleware/auth'
import { handleError } from '../../utils/errors'

import type { GenerationRequest, GenerationResponse } from '@auteurium/shared-types'
import type { AppSyncResolverHandler } from 'aws-lambda'

const logger = new Logger({ serviceName: 'genai-generate-content' })

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const secretsClient = new SecretsManagerClient({})

const GENERATIONS_TABLE = process.env.GENERATIONS_TABLE!
const SNIPPETS_TABLE = process.env.SNIPPETS_TABLE!
const LLM_API_KEYS_SECRET_ARN = process.env.LLM_API_KEYS_SECRET_ARN!

interface GenerateContentArgs {
  projectId: string
  snippetId: string
  input: GenerationRequest
}

interface SnippetRecord {
  id: string
  projectId: string
  userId: string
}

/**
 * Mutation resolver: generateContent
 * Generates content using specified LLM model
 */
export const handler: AppSyncResolverHandler<GenerateContentArgs, GenerationResponse> = async (event) => {
  try {
    // Authenticate user
    const context = await createContext(event as unknown as AppSyncEvent)

    if (!context.user) {
      throw new Error('User not authenticated')
    }

    const userId = context.user.id
    const { projectId, snippetId, input } = event.arguments

    logger.info('Starting content generation', {
      userId,
      projectId,
      snippetId,
      modelId: input.modelId
    })

    // Validate input
    const validatedInput = generateContentInputSchema.parse(input)

    // Verify snippet exists and belongs to user via direct lookup
    const snippetResult = await dynamoClient.send(new GetCommand({
      TableName: SNIPPETS_TABLE,
      Key: {
        projectId,
        id: snippetId
      }
    }))

    const snippetItem = snippetResult.Item as SnippetRecord | undefined

    if (!snippetItem || snippetItem.userId !== userId) {
      throw new Error('Snippet not found')
    }

    // Get LLM API keys from Secrets Manager
    const secretResult = await secretsClient.send(new GetSecretValueCommand({
      SecretId: LLM_API_KEYS_SECRET_ARN
    }))

    if (!secretResult.SecretString) {
      throw new Error('Failed to retrieve LLM API keys')
    }

    const apiKeys = JSON.parse(secretResult.SecretString) as Record<string, string>

    // Initialize orchestrator
    const orchestrator = new GenerationOrchestrator()
    orchestrator.setApiKey('gemini', apiKeys.gemini)
    orchestrator.setApiKey('openai', apiKeys.openai || '')

    // Generate content
    const response = await orchestrator.generate(validatedInput, {
      userId,
      snippetId,
      projectId
    })

    // Save generation record to DynamoDB
    const generationId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const createdAt = new Date().toISOString()

    const generationRecord = orchestrator.createGenerationRecord(validatedInput, response, {
      userId,
      snippetId,
      projectId
    })

    await dynamoClient.send(new PutCommand({
      TableName: GENERATIONS_TABLE,
      Item: {
        PK: `USER#${userId}`,
        SK: `GENERATION#${createdAt}#${generationId}`,
        id: generationId,
        createdAt,
        ...generationRecord
      }
    }))

    logger.info('Content generation completed', {
      userId,
      snippetId,
      generationId,
      tokensUsed: response.tokensUsed,
      cost: response.cost
    })

    return response
  } catch (error) {
    logger.error('Content generation failed', {
      error: error instanceof Error ? error.message : String(error),
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId,
      modelId: event.arguments.input.modelId
    })

    handleError(error, logger, {
      operation: 'generateContent',
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId,
      modelId: event.arguments.input.modelId
    })

    // Re-throw error after logging
    throw error
  }
}
