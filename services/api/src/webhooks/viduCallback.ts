import { Logger } from '@aws-lambda-powertools/logger'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { z } from 'zod'
import { randomUUID } from 'crypto'

import { verifyViduSignature } from '../utils/viduSignature'

import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import type { VideoGenerationStatus, VideoMetadata, GenerationRecord, Snippet } from '@auteurium/shared-types'
import { ConnectionType } from '@auteurium/shared-types'

const logger = new Logger({ serviceName: 'vidu-webhook-handler' })

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3Client = new S3Client({})
const secretsClient = new SecretsManagerClient({})

const SNIPPETS_TABLE = process.env.SNIPPETS_TABLE!
const GENERATIONS_TABLE = process.env.GENERATIONS_TABLE!
const MEDIA_BUCKET_NAME = process.env.MEDIA_BUCKET_NAME!
const LLM_API_KEYS_SECRET_ARN = process.env.LLM_API_KEYS_SECRET_ARN!
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!
const VERSIONS_TABLE = process.env.VERSIONS_TABLE!

const SUCCESS_STATES = new Set(['succeed', 'success', 'completed'])
const FAILURE_STATES = new Set(['failed', 'error'])

const viduCreationSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  cover_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
})

const viduCallbackSchema = z.object({
  task_id: z.string().optional(),
  id: z.string().optional(),
  state: z.string().optional(),
  status: z.string().optional(),
  err_code: z.string().optional(),
  error: z.string().optional(),
  credits: z.number().optional(),
  payload: z.string().optional(),
  bgm: z.boolean().optional(),
  off_peak: z.boolean().optional(),
  creations: z.array(viduCreationSchema).optional()
}).passthrough().refine(data => data.state || data.status, {
  message: 'Missing state/status in Vidu callback'
})

interface GenerationTaskRecord extends GenerationRecord {
  PK: string
  SK: string
  videoRequest?: Record<string, unknown>
}

let cachedViduSecret: string | null = null

const loadViduSecret = async (): Promise<string> => {
  if (cachedViduSecret) {
    return cachedViduSecret
  }

  const secretResult = await secretsClient.send(new GetSecretValueCommand({
    SecretId: LLM_API_KEYS_SECRET_ARN
  }))

  if (!secretResult.SecretString) {
    throw new Error('LLM API keys secret not configured')
  }

  try {
    const parsed = JSON.parse(secretResult.SecretString) as Record<string, string>
    const viduSecret = parsed.vidu ?? parsed.VIDU
    if (!viduSecret) {
      throw new Error('Vidu API key missing from LLM API keys secret')
    }
    cachedViduSecret = viduSecret
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to parse LLM API keys secret')
  }

  return cachedViduSecret
}

const getHeaderValue = (headers: Record<string, string | undefined>, key: string): string | undefined => {
  const lowerKey = key.toLowerCase()
  return headers[key] ?? headers[lowerKey] ?? headers[key.toUpperCase()]
}

const buildQueryString = (
  multi?: Record<string, (string | null)[] | undefined>,
  single?: Record<string, string | undefined>
): string => {
  const segments: string[] = []

  if (multi) {
    for (const [key, values] of Object.entries(multi)) {
      if (!values) {
        continue
      }
      for (const value of values) {
        if (value === undefined || value === null) {
          continue
        }
        segments.push(`${key}=${value}`)
      }
    }
    return segments.join('&')
  }

  if (single) {
    for (const [key, value] of Object.entries(single)) {
      if (value === undefined) {
        continue
      }
      segments.push(`${key}=${value}`)
    }
    return segments.join('&')
  }

  return ''
}

const buildVideoMetadata = (record: GenerationTaskRecord, fileSize: number): VideoMetadata => {
  const request = (record.videoRequest ?? {}) as Record<string, unknown>

  const metadata: VideoMetadata = {
    duration: typeof request.duration === 'number' ? request.duration : 4,
    resolution: typeof request.resolution === 'string' ? request.resolution : '720p',
    aspectRatio: typeof request.aspectRatio === 'string' ? request.aspectRatio : '16:9',
    format: 'mp4',
    fileSize
  }

  const optionalFields: Array<[keyof VideoMetadata, unknown]> = [
    ['style', typeof request.style === 'string' ? request.style : undefined],
    ['seed', typeof request.seed === 'number' ? request.seed : undefined],
    ['movementAmplitude', typeof request.movementAmplitude === 'string' ? request.movementAmplitude : undefined]
  ]

  for (const [key, value] of optionalFields) {
    if (value !== undefined) {
      Object.assign(metadata, { [key]: value })
    }
  }

  return metadata
}

const VIDEO_SNIPPET_HORIZONTAL_OFFSET = 950

const generateId = (): string => {
  if (typeof randomUUID === 'function') {
    return randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((entry): entry is string => typeof entry === 'string')
}

const buildDerivedSnippetTitle = (sourceTitle?: string): string => {
  if (sourceTitle && sourceTitle.trim() !== '') {
    return `${sourceTitle.trim()} - Video`
  }
  return 'Generated Video'
}

const getSourceSnippet = async (projectId: string, snippetId: string): Promise<Snippet | null> => {
  const snippetResult = await dynamoClient.send(new GetCommand({
    TableName: SNIPPETS_TABLE,
    Key: {
      projectId,
      id: snippetId
    }
  }))

  return snippetResult.Item as Snippet | undefined ?? null
}

const saveSnippetVersion = async (snippet: Snippet): Promise<void> => {
  await dynamoClient.send(new PutCommand({
    TableName: VERSIONS_TABLE,
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
      createdAt: new Date().toISOString()
    }
  }))
}

const createDerivedVideoSnippet = async (
  record: GenerationTaskRecord,
  sourceSnippet: Snippet,
  s3Key: string,
  metadata: VideoMetadata
): Promise<Snippet> => {
  const timestamp = new Date().toISOString()
  const position = sourceSnippet.position ?? { x: 0, y: 0 }

  const derivedSnippet: Snippet = {
    id: generateId(),
    projectId: record.projectId,
    userId: sourceSnippet.userId ?? record.userId,
    title: buildDerivedSnippetTitle(sourceSnippet.title),
    textField1: sourceSnippet.textField1 ?? '',
    position: {
      x: position.x + VIDEO_SNIPPET_HORIZONTAL_OFFSET,
      y: position.y
    },
    tags: normalizeStringArray(sourceSnippet.tags),
    categories: normalizeStringArray(sourceSnippet.categories),
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    snippetType: 'text',
    createdFrom: sourceSnippet.id,
    videoS3Key: s3Key,
    videoMetadata: metadata,
    videoGenerationStatus: 'COMPLETE'
  }

  await dynamoClient.send(new PutCommand({
    TableName: SNIPPETS_TABLE,
    Item: derivedSnippet
  }))

  await saveSnippetVersion(derivedSnippet)

  return derivedSnippet
}

const linkSnippets = async (
  record: GenerationTaskRecord,
  sourceSnippetId: string,
  targetSnippetId: string
): Promise<void> => {
  const timestamp = new Date().toISOString()
  const metadata: Record<string, unknown> = {
    provider: 'vidu',
    assetType: 'video'
  }

  if (record.taskId) {
    metadata.taskId = record.taskId
  }

  await dynamoClient.send(new PutCommand({
    TableName: CONNECTIONS_TABLE,
    Item: {
      id: generateId(),
      projectId: record.projectId,
      sourceSnippetId,
      targetSnippetId,
      connectionType: ConnectionType.REFERENCES,
      label: 'Video Output',
      metadata,
      userId: record.userId,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  }))
}

const updateSnippetStatus = async (
  record: GenerationTaskRecord,
  status: VideoGenerationStatus,
  attributes: Record<string, unknown>
): Promise<void> => {
  const updateExpressionParts = ['videoGenerationStatus = :status', 'updatedAt = :updatedAt']
  const expressionAttributeValues: Record<string, unknown> = {
    ':status': status,
    ':updatedAt': new Date().toISOString(),
    ':taskId': record.taskId ?? null
  }

  if ('videoGenerationError' in attributes) {
    updateExpressionParts.push('videoGenerationError = :error')
    expressionAttributeValues[':error'] = attributes.videoGenerationError
  }

  if ('videoS3Key' in attributes) {
    updateExpressionParts.push('videoS3Key = :videoS3Key')
    expressionAttributeValues[':videoS3Key'] = attributes.videoS3Key
  }

  if ('videoMetadata' in attributes) {
    updateExpressionParts.push('videoMetadata = :videoMetadata')
    expressionAttributeValues[':videoMetadata'] = attributes.videoMetadata
  }

  updateExpressionParts.push('videoGenerationTaskId = :taskId')

  await dynamoClient.send(new UpdateCommand({
    TableName: SNIPPETS_TABLE,
    Key: {
      projectId: record.projectId,
      id: record.snippetId
    },
    UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
    ExpressionAttributeValues: expressionAttributeValues
  }))
}

const updateGenerationRecord = async (
  record: GenerationTaskRecord,
  status: VideoGenerationStatus,
  attributes: Record<string, unknown>
): Promise<void> => {
  const updateParts = ['#status = :status', '#result = :result', 'updatedAt = :updatedAt']
  const attributeNames = {
    '#status': 'status',
    '#result': 'result'
  }

  const attributeValues: Record<string, unknown> = {
    ':status': status,
    ':result': attributes.result ?? record.result,
    ':updatedAt': new Date().toISOString(),
    ':videoS3Key': attributes.videoS3Key ?? record.videoS3Key ?? null,
    ':videoMetadata': attributes.videoMetadata ?? record.videoMetadata ?? null,
    ':errorMessage': attributes.errorMessage ?? null
  }

  updateParts.push('videoS3Key = :videoS3Key')
  updateParts.push('videoMetadata = :videoMetadata')
  updateParts.push('errorMessage = :errorMessage')

  await dynamoClient.send(new UpdateCommand({
    TableName: GENERATIONS_TABLE,
    Key: {
      PK: record.PK,
      SK: record.SK
    },
    UpdateExpression: `SET ${updateParts.join(', ')}`,
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues
  }))
}

const downloadVideo = async (url: string): Promise<Buffer> => {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

const uploadVideoToS3 = async (buffer: Buffer, projectId: string, snippetId: string): Promise<string> => {
  const s3Key = `snippets/${projectId}/${snippetId}/video-${Date.now()}.mp4`

  await s3Client.send(new PutObjectCommand({
    Bucket: MEDIA_BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: 'video/mp4'
  }))

  return s3Key
}

const respond = (statusCode: number, body: Record<string, unknown>) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
})

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const legacyEvent = event as unknown as {
      httpMethod?: string
      path?: string
      resource?: string
      queryStringParameters?: Record<string, string | undefined>
      multiValueQueryStringParameters?: Record<string, (string | null)[] | undefined>
    }

    const stage = event.requestContext?.stage
    const httpMethod = event.requestContext?.http?.method ?? legacyEvent.httpMethod ?? 'POST'

    const rawPathCandidate = event.requestContext?.http?.path
      ?? event.rawPath
      ?? legacyEvent.path
      ?? (legacyEvent.resource && event.requestContext?.stage
        ? `/${event.requestContext.stage}${legacyEvent.resource}`
        : undefined)
      ?? getHeaderValue(event.headers ?? {}, 'x-forwarded-uri')
      ?? '/'

    const httpPath = rawPathCandidate === '' ? '/' : rawPathCandidate

    const canonicalPath = (() => {
      if (!stage || stage === '$default') {
        return httpPath
      }
      if (httpPath.startsWith(`/${stage}`)) {
        return httpPath
      }
      if (httpPath === '/') {
        return `/${stage}`
      }
      return `/${stage}${httpPath}`
    })()

    const rawQueryString = event.rawQueryString
      ?? buildQueryString(
        legacyEvent.multiValueQueryStringParameters,
        legacyEvent.queryStringParameters
      )

    if (httpMethod.toUpperCase() !== 'POST') {
      return respond(405, { message: 'Method Not Allowed' })
    }

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
      : event.body ?? ''

    const headers = event.headers ?? {}
    const signature = getHeaderValue(headers, 'X-HMAC-SIGNATURE')
    const signedHeaders = getHeaderValue(headers, 'X-HMAC-SIGNED-HEADERS')
    const algorithm = getHeaderValue(headers, 'X-HMAC-ALGORITHM')

    logger.info('Processing Vidu webhook request', {
      method: httpMethod,
      path: canonicalPath,
      rawQueryString: event.rawQueryString,
      signedHeaders,
      algorithm,
      rawPath: {
        requestContextPath: event.requestContext?.http?.path,
        rawPath: event.rawPath ?? legacyEvent.path ?? null,
        forwardedUri: getHeaderValue(headers, 'x-forwarded-uri')
      },
      canonicalPath,
      derivedQueryString: rawQueryString,
      headers: {
        date: getHeaderValue(headers, 'Date'),
        nonce: getHeaderValue(headers, 'x-request-nonce'),
        accessKey: getHeaderValue(headers, 'X-HMAC-ACCESS-KEY')
      },
      rawBody
    })

    if (algorithm && algorithm.toLowerCase() !== 'hmac-sha256') {
      logger.warn('Unexpected Vidu webhook algorithm', { algorithm })
    }

    const secret = await loadViduSecret()
    const verification = verifyViduSignature({
      secret,
      httpMethod,
      path: canonicalPath,
      rawQueryString,
      headers,
      signature,
      signedHeaders
    })

    if (!verification.valid) {
      logger.warn('Invalid Vidu webhook signature', {
        reason: verification.reason,
        signingString: verification.debugString,
        providedSignature: verification.providedSignature,
        expectedSignature: verification.expectedSignature
      })
      return respond(401, { message: 'Invalid signature' })
    }

    const payload = viduCallbackSchema.parse(JSON.parse(rawBody))
    const normalizedState = (payload.state ?? payload.status ?? '').toLowerCase()
    const taskId = payload.task_id ?? payload.id

    if (!taskId) {
      logger.error('Vidu webhook missing task identifier', { payload })
      return respond(400, { message: 'Missing task identifier' })
    }

    if (!normalizedState) {
      logger.error('Vidu webhook missing state/status value after normalization', { payload })
      return respond(400, { message: 'Missing state/status' })
    }

    logger.info('Received Vidu webhook', { ...payload, task_id: taskId, normalizedState })

    const taskQuery = await dynamoClient.send(new QueryCommand({
      TableName: GENERATIONS_TABLE,
      IndexName: 'taskId-index',
      KeyConditionExpression: 'taskId = :taskId',
      ExpressionAttributeValues: {
        ':taskId': taskId
      },
      Limit: 1
    }))

    const record = taskQuery.Items?.[0] as GenerationTaskRecord | undefined

    if (!record) {
      logger.error('No generation record found for Vidu task', {
        taskId
      })
      return respond(202, { message: 'Task not recognized' })
    }

    if (SUCCESS_STATES.has(normalizedState)) {
      const creation = payload.creations?.find((item: z.infer<typeof viduCreationSchema>) => Boolean(item?.url))
      if (!creation?.url) {
        const errorMessage = 'Missing creation URL in success payload'

        await updateSnippetStatus(record, 'FAILED', {
          videoGenerationError: errorMessage
        })

        await updateGenerationRecord(record, 'FAILED', {
          errorMessage,
          result: 'failed'
        })

        logger.error(errorMessage, { taskId, payload })
        return respond(400, { message: errorMessage })
      }

      const videoBuffer = await downloadVideo(creation.url)
      const s3Key = await uploadVideoToS3(videoBuffer, record.projectId, record.snippetId)
      const metadata = buildVideoMetadata(record, videoBuffer.length)

      let derivedSnippet: Snippet | null = null
      try {
        const sourceSnippet = await getSourceSnippet(record.projectId, record.snippetId)

        if (sourceSnippet) {
          derivedSnippet = await createDerivedVideoSnippet(record, sourceSnippet, s3Key, metadata)
          try {
            await linkSnippets(record, sourceSnippet.id, derivedSnippet.id)
          } catch (linkError) {
            logger.warn('Failed to link generated video snippet to source', {
              taskId,
              sourceSnippetId: sourceSnippet.id,
              generatedSnippetId: derivedSnippet.id,
              error: linkError instanceof Error ? linkError.message : String(linkError)
            })
          }
        } else {
          logger.warn('Source snippet not found for generated video', {
            projectId: record.projectId,
            snippetId: record.snippetId
          })
        }
      } catch (creationError) {
        logger.error('Failed to create derived video snippet', {
          taskId,
          snippetId: record.snippetId,
          error: creationError instanceof Error ? creationError.message : String(creationError)
        })
      }

      record.taskId = undefined

      await updateSnippetStatus(record, 'COMPLETE', derivedSnippet
        ? {
            videoGenerationError: null
          }
        : {
            videoS3Key: s3Key,
            videoMetadata: metadata,
            videoGenerationError: null
          })

      await updateGenerationRecord(record, 'COMPLETE', {
        result: s3Key,
        videoS3Key: s3Key,
        videoMetadata: metadata,
        errorMessage: null
      })

      logger.info('Processed successful Vidu callback', {
        taskId,
        snippetId: record.snippetId,
        projectId: record.projectId,
        generatedSnippetId: derivedSnippet?.id ?? null
      })

      return respond(200, {
        message: derivedSnippet ? 'Video snippet created' : 'Video stored successfully'
      })
    }

    if (FAILURE_STATES.has(normalizedState)) {
      const errorMessage = payload.error ?? payload.err_code ?? 'Video generation failed'

      await updateSnippetStatus(record, 'FAILED', {
        videoGenerationError: errorMessage
      })

      await updateGenerationRecord(record, 'FAILED', {
        errorMessage,
        result: 'failed'
      })

      logger.warn('Processed failed Vidu callback', {
        taskId,
        error: errorMessage
      })

      return respond(200, { message: 'Failure recorded' })
    }

    await updateSnippetStatus(record, 'PROCESSING', {
      videoGenerationError: null
    })

    await updateGenerationRecord(record, 'PROCESSING', {
      result: record.result ?? 'processing'
    })

    logger.info('Updated Vidu task status', {
      taskId,
      state: normalizedState
    })

    return respond(200, { message: 'Task status updated' })
  } catch (error) {
    logger.error('Failed to process Vidu webhook', {
      error: error instanceof Error ? error.message : String(error)
    })

    return respond(500, { message: 'Internal server error' })
  }
}
