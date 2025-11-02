import { GenerationOrchestrator } from '@auteurium/genai-orchestrator'
import { createScenesInputSchema, MAX_SCENES } from '@auteurium/validation'
import { Logger } from '@aws-lambda-powertools/logger'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { DynamoDBDocumentClient, GetCommand, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { GraphQLError } from 'graphql'

import { createContext, type AppSyncEvent } from '../../middleware/auth'
import { handleError } from '../../utils/errors'
import { generateId, getCurrentTimestamp } from '../../database/client'

import type { Snippet } from '@auteurium/shared-types'
import type { AppSyncResolverHandler } from 'aws-lambda'

const logger = new Logger({ serviceName: 'genai-create-scenes' })

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const secretsClient = new SecretsManagerClient({})

const GENERATIONS_TABLE = process.env.GENERATIONS_TABLE!
const SNIPPETS_TABLE = process.env.SNIPPETS_TABLE!
const VERSIONS_TABLE = process.env.VERSIONS_TABLE!
const LLM_API_KEYS_SECRET_ARN = process.env.LLM_API_KEYS_SECRET_ARN!

// Constants for positioning
const COLUMN_WIDTH = 400
const COLUMN_GAP = 100
const SCENE_VERTICAL_SPACING = 50
const ESTIMATED_SNIPPET_HEIGHT = 200

interface CreateScenesInput {
  modelId: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

interface CreateScenesArgs {
  projectId: string
  snippetId: string
  input: CreateScenesInput
}

interface CreateScenesResult {
  scenes: Snippet[]
  tokensUsed: number
  cost: number
  modelUsed: string
  generationTimeMs: number
}

interface SnippetRecord {
  id: string
  projectId: string
  userId: string
  textField1: string
  position: { x: number; y: number }
}

interface SceneData {
  title: string
  content: string
}

interface ScenesResponse {
  scenes: SceneData[]
}

// Column positioning utilities
const getColumnIndex = (x: number): number => {
  return Math.round(x / (COLUMN_WIDTH + COLUMN_GAP))
}

const getColumnXPosition = (columnIndex: number): number => {
  return columnIndex * (COLUMN_WIDTH + COLUMN_GAP)
}

const snapToColumn = (x: number): number => {
  const columnIndex = getColumnIndex(x)
  return getColumnXPosition(columnIndex)
}

const DEFAULT_SYSTEM_PROMPT = `Analyze the provided story and split it into distinct scenes.
Return a JSON object with this exact structure:

{
  "scenes": [
    {
      "title": "Descriptive scene title",
      "content": "Full text content for this scene"
    }
  ]
}

Requirements:
- Each scene must have both "title" and "content" fields
- Scene titles should be descriptive (e.g., "Scene 1: Opening in the archive")
- Scene content should contain the full text for that scene
- Return valid JSON only, no additional text
- Maximum ${MAX_SCENES} scenes`.trim()

/**
 * Validates and parses the LLM response
 * Handles markdown-wrapped JSON (```json ... ```) and truncated responses
 */
const parseScenesResponse = (responseContent: string): SceneData[] => {
  // Log the raw response for debugging
  logger.info('Raw LLM response for scene generation', {
    responseContent: responseContent.substring(0, 1000), // First 1000 chars
    contentLength: responseContent.length
  })

  let cleaned = responseContent.trim()

  // Step 1: Strip markdown code fences (```json ... ```)
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n')
    // Remove first line (```json or ```)
    lines.shift()
    // Remove last line if it's closing fence (```)
    if (lines.length > 0 && lines[lines.length - 1].trim().startsWith('```')) {
      lines.pop()
    }
    cleaned = lines.join('\n').trim()

    logger.info('Stripped markdown fences from response', {
      originalLength: responseContent.length,
      cleanedLength: cleaned.length
    })
  }

  let parsed: unknown

  // Step 2: Try standard JSON.parse
  try {
    parsed = JSON.parse(cleaned)
    logger.info('Successfully parsed JSON response', {
      parsedType: typeof parsed,
      isArray: Array.isArray(parsed),
      keys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : []
    })
  } catch (error) {
    // Step 3: Best-effort recovery for truncated JSON
    logger.warn('Initial JSON parse failed, attempting recovery', {
      error: error instanceof Error ? error.message : String(error)
    })

    const lastBrace = cleaned.lastIndexOf('}')
    const lastBracket = cleaned.lastIndexOf(']')
    const cutPos = Math.max(lastBrace, lastBracket)

    if (cutPos !== -1) {
      const truncated = cleaned.slice(0, cutPos + 1)
      try {
        parsed = JSON.parse(truncated)
        logger.info('Successfully recovered truncated JSON', {
          originalLength: cleaned.length,
          truncatedLength: truncated.length
        })
      } catch (recoveryError) {
        logger.error('Failed to parse JSON even after recovery attempt', {
          error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
          responsePreview: cleaned.substring(0, 500)
        })
        throw new GraphQLError('INVALID_MODEL_RESPONSE: Failed to parse JSON', {
          extensions: { code: 'INVALID_MODEL_RESPONSE', responsePreview: cleaned.substring(0, 200) }
        })
      }
    } else {
      logger.error('Failed to parse JSON from LLM response', {
        error: error instanceof Error ? error.message : String(error),
        responsePreview: cleaned.substring(0, 500)
      })
      throw new GraphQLError('INVALID_MODEL_RESPONSE: Failed to parse JSON', {
        extensions: { code: 'INVALID_MODEL_RESPONSE', responsePreview: cleaned.substring(0, 200) }
      })
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new GraphQLError('INVALID_MODEL_RESPONSE: Response is not an object', {
      extensions: { code: 'INVALID_MODEL_RESPONSE' }
    })
  }

  const response = parsed as Partial<ScenesResponse>

  if (!response.scenes || !Array.isArray(response.scenes)) {
    throw new GraphQLError('INVALID_MODEL_RESPONSE: Missing or invalid scenes array', {
      extensions: { code: 'INVALID_MODEL_RESPONSE' }
    })
  }

  if (response.scenes.length === 0) {
    throw new GraphQLError('EMPTY_SCENES: Model did not generate any scenes', {
      extensions: { code: 'EMPTY_SCENES' }
    })
  }

  if (response.scenes.length > MAX_SCENES) {
    throw new GraphQLError(`TOO_MANY_SCENES: Model returned ${response.scenes.length} scenes (max ${MAX_SCENES})`, {
      extensions: { code: 'TOO_MANY_SCENES', count: response.scenes.length, max: MAX_SCENES }
    })
  }

  // Validate each scene has required fields
  for (let i = 0; i < response.scenes.length; i++) {
    const scene = response.scenes[i]
    if (!scene || typeof scene !== 'object') {
      throw new GraphQLError(`INVALID_SCENE: Scene ${i} is not an object`, {
        extensions: { code: 'INVALID_SCENE', sceneIndex: i }
      })
    }

    if (typeof scene.title !== 'string' || scene.title.trim() === '') {
      throw new GraphQLError(`INVALID_SCENE: Scene ${i} missing or invalid title`, {
        extensions: { code: 'INVALID_SCENE', sceneIndex: i, field: 'title' }
      })
    }

    if (typeof scene.content !== 'string' || scene.content.trim() === '') {
      throw new GraphQLError(`INVALID_SCENE: Scene ${i} missing or invalid content`, {
        extensions: { code: 'INVALID_SCENE', sceneIndex: i, field: 'content' }
      })
    }
  }

  return response.scenes as SceneData[]
}

/**
 * Creates snippet version records for all scenes
 */
const createSceneVersions = async (snippets: Snippet[]): Promise<void> => {
  const timestamp = getCurrentTimestamp()

  // Create version records for each snippet
  const versionPuts = snippets.map(snippet => ({
    PutRequest: {
      Item: {
        id: generateId(),
        snippetId: snippet.id,
        projectId: snippet.projectId,
        version: snippet.version,
        title: snippet.title,
        textField1: snippet.textField1,
        userId: snippet.userId,
        position: snippet.position,
        tags: snippet.tags,
        categories: snippet.categories,
        createdAt: timestamp
      }
    }
  }))

  // DynamoDB BatchWrite supports max 25 items per call
  const chunks: typeof versionPuts[] = []
  for (let i = 0; i < versionPuts.length; i += 25) {
    chunks.push(versionPuts.slice(i, i + 25))
  }

  for (const chunk of chunks) {
    await dynamoClient.send(new BatchWriteCommand({
      RequestItems: {
        [VERSIONS_TABLE]: chunk
      }
    }))
  }
}

/**
 * Mutation resolver: createScenes
 * Splits a snippet's story into multiple scene snippets using LLM
 */
export const handler: AppSyncResolverHandler<CreateScenesArgs, CreateScenesResult> = async (event) => {
  const startTime = Date.now()

  try {
    // Authenticate user
    const context = await createContext(event as unknown as AppSyncEvent)

    if (!context.user) {
      throw new Error('User not authenticated')
    }

    const userId = context.user.id
    const { projectId, snippetId, input } = event.arguments

    logger.info('Starting scene creation', {
      userId,
      projectId,
      snippetId,
      modelId: input.modelId
    })

    // Validate input
    const validatedInput = createScenesInputSchema.parse(input)

    // Verify snippet exists and belongs to user
    const snippetResult = await dynamoClient.send(new GetCommand({
      TableName: SNIPPETS_TABLE,
      Key: {
        projectId,
        id: snippetId
      }
    }))

    const sourceSnippet = snippetResult.Item as SnippetRecord | undefined

    if (!sourceSnippet || sourceSnippet.userId !== userId) {
      throw new Error('Snippet not found')
    }

    if (!sourceSnippet.textField1 || sourceSnippet.textField1.trim() === '') {
      throw new GraphQLError('Source snippet has no text content', {
        extensions: { code: 'EMPTY_SOURCE_SNIPPET' }
      })
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

    // Generate content with story as prompt
    const systemPrompt = validatedInput.systemPrompt || DEFAULT_SYSTEM_PROMPT
    const response = await orchestrator.generate({
      modelId: validatedInput.modelId,
      prompt: sourceSnippet.textField1,
      systemPrompt,
      temperature: validatedInput.temperature,
      maxTokens: validatedInput.maxTokens
    }, {
      userId,
      snippetId,
      projectId
    })

    logger.info('LLM generation completed', {
      userId,
      snippetId,
      tokensUsed: response.tokensUsed,
      cost: response.cost,
      contentPreview: response.content.substring(0, 200),
      contentLength: response.content.length
    })

    // Parse and validate scenes
    const scenesData = parseScenesResponse(response.content)

    logger.info('Parsed scenes', {
      userId,
      snippetId,
      sceneCount: scenesData.length
    })

    // Calculate positions for scenes (column to the right, stacked vertically)
    const sourceColumn = getColumnIndex(sourceSnippet.position.x)
    const targetColumn = sourceColumn + 1
    const baseX = snapToColumn(getColumnXPosition(targetColumn))
    const timestamp = getCurrentTimestamp()

    // Create snippet records for all scenes
    const sceneSnippets: Snippet[] = scenesData.map((scene, index) => ({
      id: generateId(),
      projectId,
      userId,
      title: scene.title,
      textField1: scene.content,
      position: {
        x: baseX,
        y: sourceSnippet.position.y + (index * (ESTIMATED_SNIPPET_HEIGHT + SCENE_VERTICAL_SPACING))
      },
      tags: [], // No inheritance per requirements
      categories: [], // No inheritance per requirements
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdFrom: snippetId // Link to source snippet
    } as Snippet))

    // Batch write snippets to DynamoDB
    const snippetPuts = sceneSnippets.map(snippet => ({
      PutRequest: {
        Item: snippet
      }
    }))

    // DynamoDB BatchWrite supports max 25 items per call
    const chunks: typeof snippetPuts[] = []
    for (let i = 0; i < snippetPuts.length; i += 25) {
      chunks.push(snippetPuts.slice(i, i + 25))
    }

    for (const chunk of chunks) {
      await dynamoClient.send(new BatchWriteCommand({
        RequestItems: {
          [SNIPPETS_TABLE]: chunk
        }
      }))
    }

    logger.info('Created scene snippets', {
      userId,
      projectId,
      sourceSnippetId: snippetId,
      sceneCount: sceneSnippets.length
    })

    // Create version records for all scenes
    await createSceneVersions(sceneSnippets)

    // Save generation record to DynamoDB
    const generationId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const createdAt = getCurrentTimestamp()
    const generationTimeMs = Date.now() - startTime

    await dynamoClient.send(new PutCommand({
      TableName: GENERATIONS_TABLE,
      Item: {
        PK: `USER#${userId}`,
        SK: `GENERATION#${createdAt}#${generationId}`,
        id: generationId,
        createdAt,
        userId,
        snippetId,
        projectId,
        modelProvider: response.modelUsed.split('-')[0], // Extract provider from model name
        modelId: validatedInput.modelId,
        prompt: sourceSnippet.textField1,
        systemPrompt,
        result: response.content,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        generationTimeMs
      }
    }))

    logger.info('Scene creation completed', {
      userId,
      snippetId,
      generationId,
      sceneCount: sceneSnippets.length,
      tokensUsed: response.tokensUsed,
      cost: response.cost,
      generationTimeMs
    })

    return {
      scenes: sceneSnippets,
      tokensUsed: response.tokensUsed,
      cost: response.cost,
      modelUsed: response.modelUsed,
      generationTimeMs
    }
  } catch (error) {
    logger.error('Scene creation failed', {
      error: error instanceof Error ? error.message : String(error),
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId,
      modelId: event.arguments.input.modelId
    })

    handleError(error, logger, {
      operation: 'createScenes',
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId,
      modelId: event.arguments.input.modelId
    })

    // Re-throw error after logging
    throw error
  }
}
