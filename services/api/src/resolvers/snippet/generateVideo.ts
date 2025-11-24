import { GenerationOrchestrator } from '@auteurium/genai-orchestrator'
import { Logger } from '@aws-lambda-powertools/logger'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

import { createContext, type AppSyncEvent } from '../../middleware/auth'
import { handleError } from '../../utils/errors'
import { queryConnections } from '../../database/connections'
import { batchGetSnippets } from '../../database/snippets'
import { generateId, getCurrentTimestamp } from '../../database/client'

import type { Snippet, ImageMetadata, VideoMetadata } from '@auteurium/shared-types'
import type { AppSyncResolverHandler } from 'aws-lambda'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { generateVideoInputSchema } from '@auteurium/validation'

const logger = new Logger({ serviceName: 'snippet-generate-video' })

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3Client = new S3Client({})
const secretsClient = new SecretsManagerClient({})

const SNIPPETS_TABLE = process.env.SNIPPETS_TABLE!
const GENERATIONS_TABLE = process.env.GENERATIONS_TABLE!
const MEDIA_BUCKET_NAME = process.env.MEDIA_BUCKET_NAME!
const LLM_API_KEYS_SECRET_ARN = process.env.LLM_API_KEYS_SECRET_ARN!
const VIDEO_SNIPPET_HORIZONTAL_OFFSET = 950

interface GenerateVideoArgs {
  projectId: string
  snippetId: string
  modelId: string
  duration?: number
  aspectRatio?: string
  resolution?: string
  style?: string
  seed?: number
  movementAmplitude?: string
}

const buildPromptContent = (prompt: string): Record<string, { label?: string; value: string; type?: string; isSystem?: boolean; order?: number }> => ({
  prompt: {
    label: 'Prompt',
    value: prompt,
    type: 'longText',
    isSystem: true,
    order: 0
  }
})

interface SnippetRecord {
  id: string
  projectId: string
  userId: string
  content: Record<string, any>
  title?: string
  tags?: string[]
  version: number
  position: { x: number; y: number }
  createdAt: string
  updatedAt: string
  imageS3Key?: string | null
  imageMetadata?: ImageMetadata | null
  videoS3Key?: string | null
  videoMetadata?: VideoMetadata | null
  snippetType: 'text' | 'image' | 'video' | 'audio' | 'generic'
}

/**
 * Extract timestamp from S3 key pattern: snippets/{projectId}/{snippetId}/image-{timestamp}.png
 */
const extractTimestampFromS3Key = (s3Key: string): number => {
  const match = s3Key.match(/(?:image|video)-(\d+)\.\w+$/)
  return match ? parseInt(match[1], 10) : 0
}

const getReferenceImageLimit = (modelId: string): number => {
  const normalized = modelId.toLowerCase()
  if (normalized.includes('q1') || normalized.includes('q2')) {
    return 7
  }
  return 3
}

/**
 * Mutation resolver: generateSnippetVideo
 * Generates a video using Vidu model based on snippet's primary text content
 * Supports image-to-video with connected snippets' images (up to 3-7 depending on model)
 */
export const handler: AppSyncResolverHandler<GenerateVideoArgs, Snippet> = async (event) => {
  try {
    // Authenticate user
    const context = await createContext(event as unknown as AppSyncEvent)

    if (!context.user) {
      throw new Error('User not authenticated')
    }

    const userId = context.user.id

    logger.info('Validating video generation input', {
      arguments: event.arguments
    })

    const {
      projectId,
      snippetId,
      modelId,
      duration,
      aspectRatio,
      resolution,
      style,
      seed,
      movementAmplitude
    } = generateVideoInputSchema.parse(event.arguments)

    logger.info('Starting video generation for snippet', {
      userId,
      projectId,
      snippetId,
      modelId,
      duration,
      aspectRatio,
      resolution,
      style
    })

    // Get snippet from DynamoDB
    const snippetResult = await dynamoClient.send(new GetCommand({
      TableName: SNIPPETS_TABLE,
      Key: {
        projectId,
        id: snippetId
      }
    }))

    const snippet = snippetResult.Item as SnippetRecord | undefined

    if (!snippet || snippet.userId !== userId) {
      throw new Error('Snippet not found or access denied')
    }

    // Validate content
    const prompt = snippet.content?.mainText?.value ||
      (snippet.content ? Object.values(snippet.content)[0]?.value : undefined)

    if (!prompt || prompt.trim() === '') {
      throw new Error('Snippet must have text content for video generation')
    }

    // Get connected snippet images for image-to-video generation
    const inputImageUrls: string[] = []

    logger.info('Fetching connected snippets for multimodal video generation', { snippetId })

    // Query incoming connections (where current snippet is target)
    const incomingConnections = await queryConnections({
      projectId,
      targetSnippetId: snippetId
    })

    if (incomingConnections.length > 0) {
      // Get source snippet IDs
      const sourceSnippetIds = incomingConnections.map(conn => conn.sourceSnippetId)

      // Batch fetch source snippets
      const sourceSnippets = await batchGetSnippets(projectId, sourceSnippetIds)

      // Filter snippets with images and sort by generation time (most recent first)
      const snippetsWithImages = Array.from(sourceSnippets.values())
        .filter(s => s.imageS3Key)
        .sort((a, b) => {
          const timestampA = a.imageS3Key ? extractTimestampFromS3Key(a.imageS3Key) : 0
          const timestampB = b.imageS3Key ? extractTimestampFromS3Key(b.imageS3Key) : 0
          return timestampB - timestampA // Most recent first
        })

      logger.info('Found connected snippets with images', {
        snippetId,
        totalConnections: incomingConnections.length,
        snippetsWithImages: snippetsWithImages.length
      })

      const maxImages = getReferenceImageLimit(modelId)
      if (snippetsWithImages.length > maxImages) {
        throw new Error(
          `Too many connected images (${snippetsWithImages.length}). Maximum ${maxImages} images supported for ${modelId}. ` +
          `Remove connections to snippets to use ${maxImages} or fewer images.`
        )
      }

      // Generate presigned URLs for images
      for (const sourceSnippet of snippetsWithImages.slice(0, maxImages)) {
        try {
          const presignedUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: MEDIA_BUCKET_NAME,
              Key: sourceSnippet.imageS3Key!
            }),
            { expiresIn: 3600 } // 1 hour - long enough for video generation
          )

          inputImageUrls.push(presignedUrl)

          logger.info('Generated presigned URL for image', {
            s3Key: sourceSnippet.imageS3Key
          })
        } catch (error) {
          logger.error('Failed to generate presigned URL for image', {
            error: error instanceof Error ? error.message : String(error),
            s3Key: sourceSnippet.imageS3Key
          })
          // Continue with other images instead of failing
        }
      }
    }

    logger.info('Prepared input images for video generation', {
      snippetId,
      inputImagesCount: inputImageUrls.length
    })

    // Get LLM API keys from Secrets Manager
    const secretResult = await secretsClient.send(new GetSecretValueCommand({
      SecretId: LLM_API_KEYS_SECRET_ARN
    }))

    if (!secretResult.SecretString) {
      throw new Error('Failed to retrieve LLM API keys')
    }

    const apiKeys = JSON.parse(secretResult.SecretString) as Record<string, string>

    if (!apiKeys.vidu) {
      throw new Error('Vidu API key not configured in Secrets Manager')
    }

    // Initialize orchestrator
    const orchestrator = new GenerationOrchestrator()
    orchestrator.setApiKey('vidu', apiKeys.vidu)

    // Generate video
    logger.info('Calling video generation API', {
      snippetId,
      modelId,
      promptLength: prompt.length,
      inputImagesCount: inputImageUrls.length,
      duration,
      aspectRatio,
      resolution
    })

    const videoResponse = await orchestrator.generateVideo(
      {
        modelId,
        prompt,
        duration: duration ?? undefined,
        aspectRatio: aspectRatio ?? undefined,
        resolution: resolution ?? undefined,
        style: style ?? undefined,
        seed: seed ?? undefined,
        movementAmplitude: movementAmplitude ?? undefined,
        inputImages: inputImageUrls.length > 0 ? inputImageUrls : undefined
      },
      {
        userId,
        snippetId,
        projectId
      }
    )
    if (!videoResponse.taskId) {
      throw new Error('Vidu did not return a task ID for tracking')
    }

    const requestMetadata = {
      ...(duration !== undefined && { duration }),
      ...(aspectRatio !== undefined && { aspectRatio }),
      ...(resolution !== undefined && { resolution }),
      ...(style !== undefined && { style }),
      ...(seed !== undefined && { seed }),
      ...(movementAmplitude !== undefined && { movementAmplitude }),
      inputImagesCount: inputImageUrls.length
    }
    const pendingStatus = 'PENDING'

    const generationId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const createdAt = new Date().toISOString()

    await dynamoClient.send(new UpdateCommand({
      TableName: GENERATIONS_TABLE,
      Key: {
        PK: `USER#${userId}`,
        SK: `GENERATION#${createdAt}#${generationId}`
      },
      UpdateExpression: 'SET id = :id, userId = :userId, snippetId = :snippetId, projectId = :projectId, modelProvider = :modelProvider, modelId = :modelId, prompt = :prompt, #result = :result, tokensUsed = :tokensUsed, cost = :cost, generationTimeMs = :generationTimeMs, createdAt = :createdAt, taskId = :taskId, #status = :status, videoRequest = :videoRequest',
      ExpressionAttributeNames: {
        '#result': 'result',
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':id': generationId,
        ':userId': userId,
        ':snippetId': snippetId,
        ':projectId': projectId,
        ':modelProvider': 'vidu',
        ':modelId': modelId,
        ':prompt': prompt,
        ':result': snippet.videoS3Key ?? 'pending',
        ':tokensUsed': videoResponse.tokensUsed || 0,
        ':cost': videoResponse.cost,
        ':generationTimeMs': videoResponse.generationTimeMs,
        ':createdAt': createdAt,
        ':taskId': videoResponse.taskId,
        ':status': pendingStatus,
        ':videoRequest': requestMetadata
      }
    }))

    // Create output snippet immediately so callbacks can update it by task ID
    const promptContent = buildPromptContent(prompt)
    const targetPosition = {
      x: (snippet.position?.x ?? 0) + VIDEO_SNIPPET_HORIZONTAL_OFFSET,
      y: snippet.position?.y ?? 0
    }

    const outputSnippet: Snippet = {
      id: generateId(),
      projectId,
      userId,
      title: snippet.title ? `${snippet.title} (Generated Video)` : 'Generated video',
      content: promptContent,
      position: targetPosition,
      tags: [],
      snippetType: 'content',
      createdFrom: snippetId,
      generated: true,
      generationId,
      generationCreatedAt: createdAt,
      version: 1,
      createdAt,
      updatedAt: createdAt
    }

    await dynamoClient.send(new UpdateCommand({
      TableName: SNIPPETS_TABLE,
      Key: {
        projectId: outputSnippet.projectId,
        id: outputSnippet.id
      },
      UpdateExpression: 'SET #title = :title, #content = :content, #position = :position, #tags = :tags, #snippetType = :snippetType, #createdFrom = :createdFrom, #generated = :generated, #generationId = :generationId, #generationCreatedAt = :generationCreatedAt, #version = :version, #createdAt = :createdAt, #updatedAt = :updatedAt, #userId = :userId',
      ExpressionAttributeNames: {
        '#title': 'title',
        '#content': 'content',
        '#position': 'position',
        '#tags': 'tags',
        '#snippetType': 'snippetType',
        '#createdFrom': 'createdFrom',
        '#generated': 'generated',
        '#generationId': 'generationId',
        '#generationCreatedAt': 'generationCreatedAt',
        '#version': 'version',
        '#createdAt': 'createdAt',
        '#updatedAt': 'updatedAt',
        '#userId': 'userId'
      },
      ExpressionAttributeValues: {
        ':title': outputSnippet.title,
        ':content': outputSnippet.content,
        ':position': outputSnippet.position,
        ':tags': outputSnippet.tags,
        ':snippetType': outputSnippet.snippetType,
        ':createdFrom': outputSnippet.createdFrom,
        ':generated': outputSnippet.generated ?? false,
        ':generationId': outputSnippet.generationId ?? null,
        ':generationCreatedAt': outputSnippet.generationCreatedAt ?? null,
        ':version': outputSnippet.version,
        ':createdAt': outputSnippet.createdAt,
        ':updatedAt': outputSnippet.updatedAt,
        ':userId': outputSnippet.userId
      },
      ConditionExpression: 'attribute_not_exists(id)'
    }))

    const initialVideoMetadata: VideoMetadata = {
      duration: duration ?? 4,
      resolution: resolution ?? '720p',
      aspectRatio: aspectRatio ?? '16:9',
      format: 'mp4',
      taskId: videoResponse.taskId,
      model: modelId,
      createdAt
    }
    if (style !== undefined && style !== null) {
      initialVideoMetadata.style = style
    }
    if (seed !== undefined && seed !== null) {
      initialVideoMetadata.seed = seed
    }
    if (movementAmplitude !== undefined && movementAmplitude !== null) {
      initialVideoMetadata.movementAmplitude = movementAmplitude
    }
    if (typeof videoResponse.bgm === 'boolean') {
      initialVideoMetadata.bgm = videoResponse.bgm
    }
    if (typeof videoResponse.credits === 'number') {
      initialVideoMetadata.credits = videoResponse.credits
    }
    if (typeof videoResponse.offPeak === 'boolean') {
      initialVideoMetadata.offPeak = videoResponse.offPeak
    }

    await dynamoClient.send(new UpdateCommand({
      TableName: SNIPPETS_TABLE,
      Key: {
        projectId,
        id: outputSnippet.id
      },
      UpdateExpression: 'SET videoMetadata = :videoMetadata, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':videoMetadata': initialVideoMetadata,
        ':updatedAt': createdAt
      }
    }))

    // Store output snippet reference on generation record for callback lookup
    await dynamoClient.send(new UpdateCommand({
      TableName: GENERATIONS_TABLE,
      Key: {
        PK: `USER#${userId}`,
        SK: `GENERATION#${createdAt}#${generationId}`
      },
      UpdateExpression: 'SET outputSnippetId = :outputSnippetId',
      ExpressionAttributeValues: {
        ':outputSnippetId': outputSnippet.id
      }
    }))

    logger.info('Video generation task queued', {
      userId,
      snippetId,
      generationId,
      cost: videoResponse.cost,
      taskId: videoResponse.taskId
    })

    let videoUrl: string | undefined
    if (snippet.videoS3Key) {
      try {
        videoUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: MEDIA_BUCKET_NAME,
            Key: snippet.videoS3Key
          }),
          { expiresIn: 3600 }
        )
      } catch (signError) {
        logger.warn('Failed to generate signed URL for existing video', {
          snippetId,
          videoKey: snippet.videoS3Key,
          error: signError instanceof Error ? signError.message : String(signError)
        })
      }
    }

    const responseSnippet: Snippet = {
      ...outputSnippet,
      videoUrl
    }

    if (videoUrl) {
      responseSnippet.videoUrl = videoUrl
    }

    return responseSnippet
  } catch (error) {
    logger.error('Video generation failed', {
      error: error instanceof Error ? error.message : String(error),
      errorDetails: error,
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId,
      arguments: event.arguments
    })

    handleError(error, logger, {
      operation: 'generateSnippetVideo',
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId
    })

    throw error
  }
}
