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
  UpdateSnippetInput
} from '@auteurium/shared-types'

const logger = new Logger({ serviceName: 'snippets-db' })

const DEFAULT_QUERY_LIMIT = 100

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
    ? { x: candidate.x, y: candidate.y }
    : undefined
}

const runQuery = async (
  params: Parameters<DocumentClientType['query']>[0]
): Promise<Snippet[]> => {
  const result = await dynamodb.query(params).promise()
  return (result.Items ?? []) as Snippet[]
}

const buildSnippet = (input: SnippetInput, userId: string, now: string): Snippet => ({
  id: generateId(),
  projectId: input.projectId,
  userId,
  textField1: input.textField1 ?? '',
  textField2: input.textField2 ?? '',
  position: input.position ?? { x: 0, y: 0 },
  tags: input.tags ?? [],
  categories: input.categories ?? [],
  version: 1,
  createdAt: now,
  updatedAt: now
})

const createSnippetVersion = async (snippet: Snippet): Promise<void> => {
  const params: Parameters<DocumentClientType['put']>[0] = {
    TableName: TABLES.VERSIONS,
    Item: {
      id: generateId(),
      snippetId: snippet.id,
      projectId: snippet.projectId,
      version: snippet.version,
      textField1: snippet.textField1,
      textField2: snippet.textField2,
      userId: snippet.userId,
      position: snippet.position,
      tags: snippet.tags,
      categories: snippet.categories,
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
  const updateExpressions: string[] = []
  const expressionAttributeNames: Record<string, string> = {}
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

  assignField('textField1', updates.textField1)
  assignField('textField2', updates.textField2)
  assignField('position', updates.position)
  assignField('tags', updates.tags)
  assignField('categories', updates.categories)

  return {
    updateExpressions,
    expressionAttributeNames,
    expressionAttributeValues
  }
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
    }
  }

  try {
    await dynamodb.delete(params).promise()
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
  const textField1 = typeof version.textField1 === 'string' ? version.textField1 : ''
  const textField2 = typeof version.textField2 === 'string' ? version.textField2 : ''
  const position = toPosition(version.position)
  const tags = toStringArray(version.tags)
  const categories = toStringArray(version.categories)

  return updateSnippet(
    projectId,
    snippetId,
    {
      textField1,
      textField2,
      position,
      tags,
      categories
    },
    userId
  )
}
