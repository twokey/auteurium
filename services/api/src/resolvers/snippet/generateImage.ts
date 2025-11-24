import { GenerationOrchestrator } from '@auteurium/genai-orchestrator'
import { Logger } from '@aws-lambda-powertools/logger'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

import { createContext, type AppSyncEvent } from '../../middleware/auth'
import { handleError } from '../../utils/errors'
import { withSignedImageUrl } from '../../utils/snippetImages'
import { queryConnections } from '../../database/connections'
import { batchGetSnippets } from '../../database/snippets'

import type { ImageMetadata, Snippet } from '@auteurium/shared-types'
import type { AppSyncResolverHandler } from 'aws-lambda'

const logger = new Logger({ serviceName: 'snippet-generate-image' })

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3Client = new S3Client({})
const secretsClient = new SecretsManagerClient({})

const SNIPPETS_TABLE = process.env.SNIPPETS_TABLE!
const GENERATIONS_TABLE = process.env.GENERATIONS_TABLE!
const MEDIA_BUCKET_NAME = process.env.MEDIA_BUCKET_NAME!
const LLM_API_KEYS_SECRET_ARN = process.env.LLM_API_KEYS_SECRET_ARN!

interface GenerateImageArgs {
  projectId: string
  snippetId: string
  modelId?: string // Optional model selection, defaults to Imagen
}

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
}

/**
 * Extract timestamp from S3 key pattern: snippets/{projectId}/{snippetId}/image-{timestamp}.png
 */
const extractTimestampFromS3Key = (s3Key: string): number => {
  const match = s3Key.match(/image-(\d+)\.png$/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Mutation resolver: generateSnippetImage
 * Generates an image using specified model based on snippet's primary text content
 * For Gemini Flash Image model, also uses images from connected snippets (up to 3)
 */
export const handler: AppSyncResolverHandler<GenerateImageArgs, Snippet> = async (event) => {
  try {
    // Authenticate user
    const context = await createContext(event as unknown as AppSyncEvent)

    if (!context.user) {
      throw new Error('User not authenticated')
    }

    const userId = context.user.id
    const { projectId, snippetId, modelId = 'imagen-4.0-fast-generate-001' } = event.arguments

    logger.info('Starting image generation for snippet', {
      userId,
      projectId,
      snippetId,
      modelId
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
      throw new Error('Snippet must have text content for image generation')
    }

    // Get connected snippet images if using multimodal model
    const inputImages: Array<{ data: Buffer; mimeType: string }> = []

    if (modelId === 'gemini-2.5-flash-image') {
      logger.info('Fetching connected snippets for multimodal generation', { snippetId })

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

        // Validate image count
        if (snippetsWithImages.length > 3) {
          throw new Error(
            `Too many connected images (${snippetsWithImages.length}). Maximum 3 images supported. ` +
            `Remove connections to snippets to use 3 or fewer images.`
          )
        }

        // Download images from S3
        for (const sourceSnippet of snippetsWithImages.slice(0, 3)) {
          try {
            const getObjectResult = await s3Client.send(new GetObjectCommand({
              Bucket: MEDIA_BUCKET_NAME,
              Key: sourceSnippet.imageS3Key!
            }))

            if (getObjectResult.Body) {
              const imageBytes = await getObjectResult.Body.transformToByteArray()
              inputImages.push({
                data: Buffer.from(imageBytes),
                mimeType: getObjectResult.ContentType || 'image/png'
              })

              logger.info('Downloaded image from S3', {
                s3Key: sourceSnippet.imageS3Key,
                size: imageBytes.length
              })
            }
          } catch (error) {
            logger.error('Failed to download image from S3', {
              error: error instanceof Error ? error.message : String(error),
              s3Key: sourceSnippet.imageS3Key
            })
            // Continue with other images instead of failing
          }
        }
      }

      logger.info('Prepared input images for multimodal generation', {
        snippetId,
        inputImagesCount: inputImages.length
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

    // Generate image
    logger.info('Calling image generation API', {
      snippetId,
      modelId,
      promptLength: prompt.length,
      inputImagesCount: inputImages.length
    })

    const imageResponse = await orchestrator.generateImage(
      {
        modelId,
        prompt,
        inputImages: inputImages.length > 0 ? inputImages : undefined
      } as any, // Type assertion needed for extended image generation parameters
      {
        userId,
        snippetId,
        projectId
      }
    )

    // Extract image data - handle different possible formats
    let imageBuffer: Buffer
    const imageData = (imageResponse as unknown as { imageData: unknown }).imageData

    if (typeof imageData === 'string') {
      // Base64 string
      imageBuffer = Buffer.from(imageData, 'base64')
    } else if (imageData instanceof Buffer) {
      imageBuffer = imageData
    } else if (imageData instanceof Uint8Array) {
      // Uint8Array to Buffer
      imageBuffer = Buffer.from(imageData)
    } else if (imageData && typeof imageData === 'object') {
      // Try common properties
      const dataObj = imageData as Record<string, unknown>

      if ('imageBytes' in dataObj) {
        const bytes = dataObj.imageBytes
        if (typeof bytes === 'string') {
          imageBuffer = Buffer.from(bytes, 'base64')
        } else if (bytes instanceof Buffer || bytes instanceof Uint8Array) {
          imageBuffer = Buffer.from(bytes as Uint8Array)
        } else {
          throw new Error(`Unexpected imageBytes type: ${typeof bytes}`)
        }
      } else if ('data' in dataObj) {
        const data = dataObj.data
        if (typeof data === 'string') {
          imageBuffer = Buffer.from(data, 'base64')
        } else if (data instanceof Buffer || data instanceof Uint8Array) {
          imageBuffer = Buffer.from(data as Uint8Array)
        } else {
          throw new Error(`Unexpected data type: ${typeof data}`)
        }
      } else {
        throw new Error(`Image data object has unexpected structure. Keys: ${Object.keys(dataObj).join(', ')}`)
      }
    } else {
      throw new Error(`Unexpected image data format from Imagen: ${typeof imageData}`)
    }

    // Upload to S3
    const timestamp = Date.now()
    const s3Key = `snippets/${projectId}/${snippetId}/image-${timestamp}.png`

    logger.info('Uploading image to S3', {
      snippetId,
      s3Key,
      imageSize: imageBuffer.length
    })

    await s3Client.send(new PutObjectCommand({
      Bucket: MEDIA_BUCKET_NAME,
      Key: s3Key,
      Body: imageBuffer,
      ContentType: 'image/png',
      Metadata: {
        projectId,
        snippetId,
        userId,
        generatedAt: new Date().toISOString()
      }
    }))

    // Note: We don't store a public URL here. The S3 bucket is private.
    // Presigned URLs are generated at query time by withSignedImageUrl() utility.

    // Extract image metadata with proper types
    const imageMetadata: ImageMetadata = {
      width: imageResponse.image.metadata.width as number,
      height: imageResponse.image.metadata.height as number,
      aspectRatio: imageResponse.image.metadata.aspectRatio as string
    }

    // Update snippet in DynamoDB with image info
    const updatedAt = new Date().toISOString()

    logger.info('Updating snippet with image metadata', {
      snippetId,
      s3Key
    })

    await dynamoClient.send(new UpdateCommand({
      TableName: SNIPPETS_TABLE,
      Key: {
        projectId,
        id: snippetId
      },
      UpdateExpression: 'SET imageS3Key = :imageS3Key, imageMetadata = :imageMetadata, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':imageS3Key': s3Key,
        ':imageMetadata': imageMetadata,
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
        ':modelProvider': 'gemini',
        ':modelId': modelId, // Use the actual modelId from arguments
        ':prompt': prompt,
        ':result': s3Key, // Store S3 key instead of URL
        ':tokensUsed': imageResponse.tokensUsed,
        ':cost': imageResponse.cost,
        ':generationTimeMs': imageResponse.generationTimeMs,
        ':createdAt': createdAt
      }
    }))

    logger.info('Image generation completed successfully', {
      userId,
      snippetId,
      generationId,
      cost: imageResponse.cost,
      s3Key
    })

    // Return updated snippet with signed URL for immediate preview
    const snippetWithImage = {
      ...snippet,
      imageS3Key: s3Key,
      imageMetadata,
      updatedAt
    } as Snippet

    // Generate presigned URL for immediate preview (valid for 1 hour)
    return await withSignedImageUrl(snippetWithImage, logger)
  } catch (error) {
    logger.error('Image generation failed', {
      error: error instanceof Error ? error.message : String(error),
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId
    })

    handleError(error, logger, {
      operation: 'generateSnippetImage',
      projectId: event.arguments.projectId,
      snippetId: event.arguments.snippetId
    })

    throw error
  }
}
