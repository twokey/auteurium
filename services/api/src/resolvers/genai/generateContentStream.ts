import { GenerationOrchestrator } from '@auteurium/genai-orchestrator'
import { generateContentInputSchema } from '@auteurium/validation'
import { Logger } from '@aws-lambda-powertools/logger'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { HttpRequest } from '@smithy/protocol-http'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import { SignatureV4 } from '@aws-sdk/signature-v4'
import { Sha256 } from '@aws-crypto/sha256-js'
import { AppSyncClient, ListGraphqlApisCommand } from '@aws-sdk/client-appsync'
import type { AppSyncResolverHandler } from 'aws-lambda'

import type {
  GenerationRequest,
  GenerationResponse
} from '@auteurium/shared-types'

import { createContext, type AppSyncEvent } from '../../middleware/auth'
import { handleError } from '../../utils/errors'

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

interface PublishEventInput {
  snippetId: string
  content: string
  isComplete: boolean
  tokensUsed?: number
}

const logger = new Logger({ serviceName: 'genai-generate-content-stream' })

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const secretsClient = new SecretsManagerClient({})

const GENERATIONS_TABLE = process.env.GENERATIONS_TABLE!
const SNIPPETS_TABLE = process.env.SNIPPETS_TABLE!
const LLM_API_KEYS_SECRET_ARN = process.env.LLM_API_KEYS_SECRET_ARN!
const AWS_REGION = process.env.AWS_REGION ?? 'us-west-2'
const APPSYNC_API_NAME = process.env.APPSYNC_API_NAME ?? `auteurium-api-${process.env.STAGE ?? 'dev'}`

const signer = new SignatureV4({
  credentials: defaultProvider(),
  region: AWS_REGION,
  service: 'appsync',
  sha256: Sha256
})

const appsyncClient = new AppSyncClient({ region: AWS_REGION })
let cachedGraphqlUrl: string | null = null

const PUBLISH_MUTATION = /* GraphQL */ `
  mutation PublishGenerationStreamEvent($input: GenerationStreamEventInput!) {
    publishGenerationStreamEvent(input: $input) {
      snippetId
      content
      isComplete
      tokensUsed
    }
  }
`

const toFetchHeaders = (headers: HttpRequest['headers']): Record<string, string> => {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      result[key] = value.join(',')
    } else if (typeof value === 'string') {
      result[key] = value
    }
  }
  return result
}

const resolveGraphqlUrl = async (): Promise<string> => {
  if (cachedGraphqlUrl) {
    return cachedGraphqlUrl
  }

  let nextToken: string | undefined
  do {
    const response = await appsyncClient.send(new ListGraphqlApisCommand({ nextToken }))
    const apis = response.graphqlApis ?? []

    for (const api of apis) {
      if (api.name === APPSYNC_API_NAME) {
        const url = api.uris?.GRAPHQL
        if (!url) {
          throw new Error(`GraphQL URL missing for API ${APPSYNC_API_NAME}`)
        }
        cachedGraphqlUrl = url
        return url
      }
    }

    nextToken = response.nextToken
  } while (nextToken)

  throw new Error(`GraphQL API ${APPSYNC_API_NAME} not found`)
}

const publishStreamEvent = async (event: PublishEventInput) => {
  try {
    const graphqlUrl = await resolveGraphqlUrl()
    const url = new URL(graphqlUrl)

    const request = new HttpRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: url.host
      },
      hostname: url.host,
      path: url.pathname,
      body: JSON.stringify({
        query: PUBLISH_MUTATION,
        variables: {
          input: event
        }
      })
    })

    const signed = await signer.sign(request)

    const response = await fetch(graphqlUrl, {
      method: signed.method ?? 'POST',
      headers: toFetchHeaders(signed.headers),
      body: signed.body ?? request.body
    })

    const result = await response.json()
    if (!response.ok || result.errors) {
      logger.error('Failed to publish generation stream event', {
        status: response.status,
        statusText: response.statusText,
        errors: result.errors,
        snippetId: event.snippetId
      })
    }
  } catch (error) {
    logger.error('Error publishing generation stream event', {
      error: error instanceof Error ? error.message : String(error),
      snippetId: event.snippetId
    })
  }
}

export const handler: AppSyncResolverHandler<GenerateContentArgs, GenerationResponse> = async (event) => {
  try {
    const context = await createContext(event as unknown as AppSyncEvent)

    if (!context.user) {
      throw new Error('User not authenticated')
    }

    const userId = context.user.id
    const { projectId, snippetId, input } = event.arguments

    logger.info('Starting streaming content generation', {
      userId,
      projectId,
      snippetId,
      modelId: input.modelId
    })

    const validatedInput = generateContentInputSchema.parse(input)

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

    const secretResult = await secretsClient.send(new GetSecretValueCommand({
      SecretId: LLM_API_KEYS_SECRET_ARN
    }))

    if (!secretResult.SecretString) {
      throw new Error('Failed to retrieve LLM API keys')
    }

    const apiKeys = JSON.parse(secretResult.SecretString) as Record<string, string>

    const orchestrator = new GenerationOrchestrator()
    orchestrator.setApiKey('gemini', apiKeys.gemini)
    orchestrator.setApiKey('openai', apiKeys.openai || '')

    let fullContent = ''

    const response = await orchestrator.generateStream(
      validatedInput,
      {
        userId,
        snippetId,
        projectId
      },
      async (chunk) => {
        fullContent += chunk.content
        await publishStreamEvent({
          snippetId,
          content: chunk.content,
          isComplete: chunk.isComplete,
          tokensUsed: chunk.tokensUsed
        })
      }
    )

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

    logger.info('Streaming content generation completed', {
      userId,
      snippetId,
      generationId,
      tokensUsed: response.tokensUsed,
      cost: response.cost
    })

    return {
      ...response,
      content: fullContent || response.content,
      generationId,
      generationCreatedAt: createdAt
    }
  } catch (error) {
    logger.error('Streaming content generation failed', {
      error: error instanceof Error ? error.message : String(error),
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId,
      modelId: event.arguments.input.modelId
    })

    handleError(error, logger, {
      operation: 'generateContentStream',
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId,
      modelId: event.arguments.input.modelId
    })

    throw error
  }
}
