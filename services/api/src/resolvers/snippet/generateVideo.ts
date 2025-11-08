import { GenerationOrchestrator } from '@auteurium/genai-orchestrator'
import { Logger } from '@aws-lambda-powertools/logger'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

import { createContext, type AppSyncEvent } from '../../middleware/auth'
import { handleError } from '../../utils/errors'
import { queryConnections } from '../../database/connections'
import { batchGetSnippets } from '../../database/snippets'

import type { VideoMetadata, Snippet, ImageMetadata } from '@auteurium/shared-types'
import type { AppSyncResolverHandler } from 'aws-lambda'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const logger = new Logger({ serviceName: 'snippet-generate-video' })

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3Client = new S3Client({})
const secretsClient = new SecretsManagerClient({})

const SNIPPETS_TABLE = process.env.SNIPPETS_TABLE!
const GENERATIONS_TABLE = process.env.GENERATIONS_TABLE!
const MEDIA_BUCKET_NAME = process.env.MEDIA_BUCKET_NAME!
const LLM_API_KEYS_SECRET_ARN = process.env.LLM_API_KEYS_SECRET_ARN!

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

interface SnippetRecord {
  id: string
  projectId: string
  userId: string
  textField1: string
  title?: string
  tags?: string[]
  categories?: string[]
  version: number
  position: { x: number; y: number }
  createdAt: string
  updatedAt: string
  imageS3Key?: string | null
  imageMetadata?: ImageMetadata | null
  videoS3Key?: string | null
  videoMetadata?: VideoMetadata | null
}

/**
 * Extract timestamp from S3 key pattern: snippets/{projectId}/{snippetId}/image-{timestamp}.png
 */
const extractTimestampFromS3Key = (s3Key: string): number => {
  const match = s3Key.match(/(?:image|video)-(\d+)\.\w+$/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Mutation resolver: generateSnippetVideo
 * Generates a video using Vidu model based on snippet's textField1
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
    } = event.arguments

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

    // Validate textField1 has content
    if (!snippet.textField1 || snippet.textField1.trim() === '') {
      throw new Error('Text Field 1 must have content for video generation')
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

      // Validate image count (Vidu Q1 supports up to 7, Vidu 2.0/1.5 support up to 3)
      const maxImages = modelId.includes('q1') ? 7 : 3
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
      promptLength: snippet.textField1.length,
      inputImagesCount: inputImageUrls.length,
      duration,
      aspectRatio,
      resolution
    })

    const videoResponse = await orchestrator.generateVideo(
      {
        modelId,
        prompt: snippet.textField1,
        duration,
        aspectRatio,
        resolution,
        style,
        seed,
        movementAmplitude,
        inputImages: inputImageUrls.length > 0 ? inputImageUrls : undefined
      },
      {
        userId,
        snippetId,
        projectId
      }
    )

    // Extract video buffer
    if (!videoResponse.videoBuffer) {
      throw new Error('No video data returned from Vidu')
    }

    const videoBuffer = Buffer.from(videoResponse.videoBuffer)

    // Upload to S3
    const timestamp = Date.now()
    const s3Key = `snippets/${projectId}/${snippetId}/video-${timestamp}.mp4`

    logger.info('Uploading video to S3', {
      snippetId,
      s3Key,
      videoSize: videoBuffer.length
    })

    await s3Client.send(new PutObjectCommand({
      Bucket: MEDIA_BUCKET_NAME,
      Key: s3Key,
      Body: videoBuffer,
      ContentType: 'video/mp4',
      Metadata: {
        projectId,
        snippetId,
        userId,
        generatedAt: new Date().toISOString(),
        modelId,
        duration: String(videoResponse.metadata.duration),
        resolution: videoResponse.metadata.resolution
      }
    }))

    // Note: We don't store a public URL here. The S3 bucket is private.
    // Presigned URLs are generated at query time.

    // Extract video metadata
    const videoMetadata: VideoMetadata = {
      duration: videoResponse.metadata.duration,
      resolution: videoResponse.metadata.resolution,
      aspectRatio: videoResponse.metadata.aspectRatio,
      style: videoResponse.metadata.style,
      seed: videoResponse.metadata.seed,
      format: videoResponse.metadata.format,
      fileSize: videoResponse.metadata.fileSize,
      movementAmplitude: videoResponse.metadata.movementAmplitude
    }

    // Update snippet in DynamoDB with video info
    const updatedAt = new Date().toISOString()

    logger.info('Updating snippet with video metadata', {
      snippetId,
      s3Key
    })

    await dynamoClient.send(new UpdateCommand({
      TableName: SNIPPETS_TABLE,
      Key: {
        projectId,
        id: snippetId
      },
      UpdateExpression: 'SET videoS3Key = :videoS3Key, videoMetadata = :videoMetadata, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':videoS3Key': s3Key,
        ':videoMetadata': videoMetadata,
        ':updatedAt': updatedAt
      }
    }))

    // Save generation record to DynamoDB
    const generationId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const createdAt = new Date().toISOString()

    await dynamoClient.send(new UpdateCommand({
      TableName: GENERATIONS_TABLE,
      Key: {
        PK: `USER#${userId}`,
        SK: `GENERATION#${createdAt}#${generationId}`
      },
      UpdateExpression: 'SET id = :id, userId = :userId, snippetId = :snippetId, projectId = :projectId, modelProvider = :modelProvider, modelId = :modelId, prompt = :prompt, #result = :result, tokensUsed = :tokensUsed, cost = :cost, generationTimeMs = :generationTimeMs, createdAt = :createdAt',
      ExpressionAttributeNames: {
        '#result': 'result' // 'result' is a reserved keyword in DynamoDB
      },
      ExpressionAttributeValues: {
        ':id': generationId,
        ':userId': userId,
        ':snippetId': snippetId,
        ':projectId': projectId,
        ':modelProvider': 'vidu',
        ':modelId': modelId,
        ':prompt': snippet.textField1,
        ':result': s3Key, // Store S3 key
        ':tokensUsed': videoResponse.tokensUsed || 0,
        ':cost': videoResponse.cost,
        ':generationTimeMs': videoResponse.generationTimeMs,
        ':createdAt': createdAt
      }
    }))

    logger.info('Video generation completed successfully', {
      userId,
      snippetId,
      generationId,
      cost: videoResponse.cost,
      s3Key
    })

    // Generate presigned URL for immediate preview (valid for 1 hour)
    const videoUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: MEDIA_BUCKET_NAME,
        Key: s3Key
      }),
      { expiresIn: 3600 }
    )

    // Return updated snippet with signed URL for immediate preview
    return {
      ...snippet,
      videoUrl,
      videoS3Key: s3Key,
      videoMetadata,
      updatedAt
    } as Snippet
  } catch (error) {
    logger.error('Video generation failed', {
      error: error instanceof Error ? error.message : String(error),
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId
    })

    handleError(error, logger, {
      operation: 'generateSnippetVideo',
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId
    })

    throw error
  }
}
