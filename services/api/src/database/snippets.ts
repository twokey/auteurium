import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Logger } from '@aws-lambda-powertools/logger'

import {
  TABLES,
  dynamodb,
  generateId,
  getCurrentTimestamp,
  type DocumentClientType
} from './client'
import { deleteSnippetConnections } from './connections'
import { createConflictError, createNotFoundError } from '../utils/errors'

import type {
  Position,
  Snippet,
  SnippetInput,
  SnippetVersion,
  UpdateSnippetInput,
  SnippetField
} from '@auteurium/shared-types'

const logger = new Logger({ serviceName: 'snippets-db' })

const DEFAULT_QUERY_LIMIT = 100
const MEDIA_BUCKET_NAME = process.env.MEDIA_BUCKET_NAME ?? ''
const s3Client = new S3Client({})

const isConditionalCheckFailed = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 'ConditionalCheckFailedException'

const toStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  const items: string[] = []
  for (const entry of value) {
    if (typeof entry === 'string') {
      items.push(entry)
    }
  }

  return items
}

const toPosition = (value: unknown): Position | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  const candidate = value as Record<string, unknown>
  return typeof candidate.x === 'number' && typeof candidate.y === 'number'
    ? { x: candidate.x, y: candidate.y, zIndex: typeof candidate.zIndex === 'number' ? candidate.zIndex : undefined }
    : undefined
}

const toContent = (value: unknown): Record<string, SnippetField> | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  return value as Record<string, SnippetField>
}

const runQuery = async (
  params: Parameters<DocumentClientType['query']>[0]
): Promise<Snippet[]> => {
  const result = await dynamodb.query(params).promise()
  return (result.Items ?? []) as Snippet[]
}

const isMediaBucketConfigured = (): boolean => MEDIA_BUCKET_NAME.trim().length > 0

const deleteSnippetMedia = async (snippet: Snippet | undefined): Promise<void> => {
  if (!snippet) {
    return
  }

  if (!isMediaBucketConfigured()) {
    logger.info('Media bucket not configured, skipping snippet media deletion', {
      snippetId: snippet.id
    })
    return
  }

  const deleteKey = async (key: string | undefined, assetType: 'image' | 'video'): Promise<void> => {
    if (!key) {
      return
    }

    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: MEDIA_BUCKET_NAME,
        Key: key
      }))

      logger.info(`Snippet ${assetType} deleted from S3`, {
        snippetId: snippet.id,
        key
      })
    } catch (error) {
      logger.warn(`Failed to delete snippet ${assetType} from S3`, {
        snippetId: snippet.id,
        key,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  await Promise.all([
    deleteKey(snippet.imageS3Key || undefined, 'image'),
    deleteKey(snippet.videoS3Key || undefined, 'video')
  ])
}

const buildSnippet = (input: SnippetInput, userId: string, now: string): Snippet => {
  const snippetType = input.snippetType ?? 'text'
  const content = input.content ?? {}

  return {
    id: generateId(),
    projectId: input.projectId,
    userId,
    title: input.title ?? 'New snippet',
    content,
    position: input.position ?? { x: 0, y: 0 },
    tags: input.tags ?? [],
    version: 1,
    createdAt: now,
    updatedAt: now,
    snippetType,
    ...(input.createdFrom && { createdFrom: input.createdFrom })
  }
}

const createSnippetVersion = async (snippet: Snippet): Promise<void> => {
  const params: Parameters<DocumentClientType['put']>[0] = {
    TableName: TABLES.VERSIONS,
    Item: {
      id: generateId(),
      snippetId: snippet.id,
      projectId: snippet.projectId,
      version: snippet.version,
      title: snippet.title,
      content: snippet.content,
      userId: snippet.userId,
      position: snippet.position,
      tags: snippet.tags,
      createdAt: getCurrentTimestamp()
    }
  }

  await dynamodb.put(params).promise()
}

export const createSnippet = async (
  snippetInput: SnippetInput,
  userId: string
): Promise<Snippet> => {
  const timestamp = getCurrentTimestamp()
  const snippet = buildSnippet(snippetInput, userId, timestamp)

  try {
    const params: Parameters<DocumentClientType['put']>[0] = {
      TableName: TABLES.SNIPPETS,
      Item: snippet,
      ConditionExpression: 'attribute_not_exists(id)'
    }

    await dynamodb.put(params).promise()
    await createSnippetVersion(snippet)

    logger.info('Snippet created', {
      snippetId: snippet.id,
      projectId: snippet.projectId,
      userId
    })

    return snippet
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      throw createConflictError('Snippet with this ID already exists')
    }

    logger.error('Failed to create snippet', { error, snippetInput, userId })
    throw error
  }
}

export const getSnippet = async (
  projectId: string,
  snippetId: string,
  userId: string
): Promise<Snippet | null> => {
  const params: Parameters<DocumentClientType['get']>[0] = {
    TableName: TABLES.SNIPPETS,
    Key: {
      projectId,
      id: snippetId
    }
  }

  try {
    const result = await dynamodb.get(params).promise()
    const snippet = result.Item as Snippet | undefined

    if (!snippet || snippet.userId !== userId) {
      if (!snippet) {
        return null
      }
      throw createNotFoundError('Snippet')
    }

    return snippet
  } catch (error) {
    logger.error('Failed to get snippet', { error, projectId, snippetId, userId })
    throw error
  }
}

export const getProjectSnippets = async (
  projectId: string,
  userId: string
): Promise<Snippet[]> => {
  const params: Parameters<DocumentClientType['query']>[0] = {
    TableName: TABLES.SNIPPETS,
    KeyConditionExpression: 'projectId = :projectId',
    FilterExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':projectId': projectId,
      ':userId': userId
    }
  }

  try {
    return runQuery(params)
  } catch (error) {
    logger.error('Failed to get project snippets', { error, projectId, userId })
    throw error
  }
}

export const getUserSnippets = async (
  userId: string,
  limit = DEFAULT_QUERY_LIMIT,
  lastKey?: Record<string, unknown>
): Promise<{ snippets: Snippet[]; lastKey?: Record<string, unknown> }> => {
  const params: Parameters<DocumentClientType['query']>[0] = {
    TableName: TABLES.SNIPPETS,
    IndexName: 'UserIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    Limit: limit,
    ScanIndexForward: false
  }

  if (lastKey) {
    params.ExclusiveStartKey = lastKey
  }

  try {
    const result = await dynamodb.query(params).promise()
    const snippets = (result.Items ?? []) as Snippet[]

    return {
      snippets,
      lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined
    }
  } catch (error) {
    logger.error('Failed to get user snippets', { error, userId })
    throw error
  }
}

const buildSnippetUpdate = (
  updates: UpdateSnippetInput,
  currentSnippet: Snippet,
  timestamp: string,
  userId: string
) => {
  console.log('[buildSnippetUpdate] Called with:', {
    updates,
    currentSnippetId: currentSnippet.id
  })

  const updateExpressions: string[] = [
    '#updatedAt = :updatedAt',
    '#version = :version'
  ]
  const expressionAttributeNames: Record<string, string> = {
    '#updatedAt': 'updatedAt',
    '#version': 'version'
  }
  const expressionAttributeValues: Record<string, unknown> = {
    ':updatedAt': timestamp,
    ':userId': userId,
    ':version': currentSnippet.version + 1
  }

  const assignField = <K extends keyof Snippet>(
    key: K,
    value: Snippet[K] | undefined
  ) => {
    if (value !== undefined) {
      const placeholder = `#${key as string}`
      const valuePlaceholder = `:${key as string}`
      updateExpressions.push(`${placeholder} = ${valuePlaceholder}`)
      expressionAttributeNames[placeholder] = key as string
      expressionAttributeValues[valuePlaceholder] = value
    }
  }

  assignField('title', updates.title)

  const mergedContent = updates.content
    ? Object.entries(updates.content).reduce<Record<string, SnippetField>>((acc, [key, value]) => {
      if (value === null) {
        const next = { ...acc }
        delete next[key]
        return next
      }

      const existing = acc[key]
      return {
        ...acc,
        [key]: {
          ...(existing ?? {}),
          ...value
        }
      }
    }, { ...currentSnippet.content })
    : undefined

  assignField('content', mergedContent)
  assignField('position', updates.position)
  assignField('tags', updates.tags)

  const result = {
    updateExpressions,
    expressionAttributeNames,
    expressionAttributeValues
  }

  return result
}

export const updateSnippet = async (
  projectId: string,
  snippetId: string,
  updates: UpdateSnippetInput,
  userId: string
): Promise<Snippet> => {
  const timestamp = getCurrentTimestamp()

  const currentSnippet = await getSnippet(projectId, snippetId, userId)
  if (!currentSnippet) {
    throw createNotFoundError('Snippet')
  }

  const {
    updateExpressions,
    expressionAttributeNames,
    expressionAttributeValues
  } = buildSnippetUpdate(updates, currentSnippet, timestamp, userId)

  if (updateExpressions.length === 0) {
    return currentSnippet
  }

  const params: Parameters<DocumentClientType['update']>[0] = {
    TableName: TABLES.SNIPPETS,
    Key: {
      projectId,
      id: snippetId
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: 'userId = :userId',
    ReturnValues: 'ALL_NEW'
  }

  try {
    const result = await dynamodb.update(params).promise()
    const updatedSnippet = result.Attributes as Snippet

    await createSnippetVersion({
      ...updatedSnippet,
      version: updatedSnippet.version
    })

    logger.info('Snippet updated', {
      snippetId,
      projectId,
      userId
    })

    return updatedSnippet
  } catch (error) {
    logger.error('Failed to update snippet', {
      error,
      projectId,
      snippetId,
      userId,
      updates
    })
    throw error
  }
}

export const deleteSnippet = async (
  projectId: string,
  snippetId: string,
  userId: string
): Promise<void> => {
  const params: Parameters<DocumentClientType['delete']>[0] = {
    TableName: TABLES.SNIPPETS,
    Key: {
      projectId,
      id: snippetId
    },
    ConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ReturnValues: 'ALL_OLD'
  }

  try {
    const result = await dynamodb.delete(params).promise()
    const deletedSnippet = result.Attributes as Snippet | undefined

    await deleteSnippetMedia(deletedSnippet)
    await deleteSnippetConnections(snippetId, userId)

    logger.info('Snippet deleted', { snippetId, userId, projectId })
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      throw createNotFoundError('Snippet')
    }

    logger.error('Failed to delete snippet', { error, projectId, snippetId, userId })
    throw error
  }
}

export const getSnippetVersions = async (
  snippetId: string,
  limit = DEFAULT_QUERY_LIMIT
): Promise<SnippetVersion[]> => {
  const params: Parameters<DocumentClientType['query']>[0] = {
    TableName: TABLES.VERSIONS,
    KeyConditionExpression: 'snippetId = :snippetId',
    ExpressionAttributeValues: {
      ':snippetId': snippetId
    },
    Limit: limit,
    ScanIndexForward: false
  }

  const result = await dynamodb.query(params).promise()
  return (result.Items ?? []) as SnippetVersion[]
}

export const revertSnippetToVersion = async (
  projectId: string,
  snippetId: string,
  targetVersion: number,
  userId: string
): Promise<Snippet> => {
  const versionParams: Parameters<DocumentClientType['query']>[0] = {
    TableName: TABLES.VERSIONS,
    KeyConditionExpression: 'snippetId = :snippetId AND version = :version',
    ExpressionAttributeValues: {
      ':snippetId': snippetId,
      ':version': targetVersion
    },
    Limit: 1
  }

  const versionResult = await dynamodb.query(versionParams).promise()
  const [rawVersion] = versionResult.Items ?? []

  if (!rawVersion) {
    throw createNotFoundError('Snippet version')
  }

  const version = rawVersion as Record<string, unknown>
  const content = toContent(version.content) ?? {}
  const position = toPosition(version.position)
  const tags = toStringArray(version.tags)

  return updateSnippet(
    projectId,
    snippetId,
    {
      content,
      position,
      tags
    },
    userId
  )
}

/**
 * Helper function to chunk an array into smaller arrays
 */
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Batch fetch multiple snippets efficiently using DynamoDB batchGet
 * DynamoDB supports up to 100 items per batchGet call
 */
export const batchGetSnippets = async (
  projectId: string,
  snippetIds: string[]
): Promise<Map<string, Snippet>> => {
  const snippetMap = new Map<string, Snippet>()

  if (snippetIds.length === 0) {
    return snippetMap
  }

  try {
    // DynamoDB batchGet supports up to 100 items per call
    const chunks = chunkArray(snippetIds, 100)

    for (const chunk of chunks) {
      const keys = chunk.map(id => ({ projectId, id }))

      const params = {
        RequestItems: {
          [TABLES.SNIPPETS]: {
            Keys: keys
          }
        }
      }

      const result = await dynamodb.batchGet(params).promise()
      const items = result.Responses?.[TABLES.SNIPPETS] ?? []

      for (const item of items) {
        const snippet = item as Snippet
        snippetMap.set(snippet.id, snippet)
      }
    }

    logger.info('Batch fetched snippets', {
      projectId,
      requestedCount: snippetIds.length,
      fetchedCount: snippetMap.size
    })

    return snippetMap
  } catch (error) {
    logger.error('Failed to batch fetch snippets', {
      error,
      projectId,
      snippetIds
    })
    throw error
  }
}
