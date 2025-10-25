import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Logger } from '@aws-lambda-powertools/logger'

import {
  TABLES,
  dynamodb,
  generateId,
  getCurrentTimestamp,
  type DocumentClientType
} from './client'

import type { CreateProjectInput, Project, UpdateProjectInput } from '@auteurium/shared-types'

const logger = new Logger({ serviceName: 'projects-db' })
const s3Client = new S3Client({})
const MEDIA_BUCKET_NAME = process.env.MEDIA_BUCKET_NAME ?? ''

type AttributeValues = Record<string, unknown>
interface SimpleDeleteRequest {
  DeleteRequest: {
    Key: {
      projectId: string
      id: string
    }
  }
}

type SimpleDeleteBatch = SimpleDeleteRequest[]
type BatchWriteItems = Parameters<DocumentClientType['batchWrite']>[0]['RequestItems'][string]

const isConditionalCheckFailed = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 'ConditionalCheckFailedException'

export const getProjectsByUserId = async (userId: string): Promise<Project[]> => {
  const params = {
    TableName: TABLES.PROJECTS,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ScanIndexForward: false
  } satisfies Parameters<DocumentClientType['query']>[0]

  const result = await dynamodb.query(params).promise()
  return (result.Items ?? []) as Project[]
}

export const getProjectById = async (userId: string, projectId: string): Promise<Project | null> => {
  const params = {
    TableName: TABLES.PROJECTS,
    Key: {
      userId,
      id: projectId
    }
  } satisfies Parameters<DocumentClientType['get']>[0]

  const result = await dynamodb.get(params).promise()
  const item = result.Item as Project | undefined
  return item ?? null
}

export const createProject = async (userId: string, input: CreateProjectInput): Promise<Project> => {
  const now = getCurrentTimestamp()
  const project: Project = {
    id: generateId(),
    userId,
    name: input.name,
    description: input.description ?? '',
    createdAt: now,
    updatedAt: now,
    lastModified: now
  }

  const params = {
    TableName: TABLES.PROJECTS,
    Item: project
  } satisfies Parameters<DocumentClientType['put']>[0]

  await dynamodb.put(params).promise()
  return project
}

export const updateProject = async (
  userId: string,
  projectId: string,
  input: UpdateProjectInput
): Promise<Project | null> => {
  const updateExpression: string[] = []
  const expressionAttributeNames: Record<string, string> = {}
  const expressionAttributeValues: AttributeValues = {}

  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = value
    }
  })

  if (updateExpression.length === 0) {
    return null
  }

  const now = getCurrentTimestamp()
  updateExpression.push('#updatedAt = :updatedAt', '#lastModified = :lastModified')
  expressionAttributeNames['#updatedAt'] = 'updatedAt'
  expressionAttributeNames['#lastModified'] = 'lastModified'
  expressionAttributeValues[':updatedAt'] = now
  expressionAttributeValues[':lastModified'] = now

  const params = {
    TableName: TABLES.PROJECTS,
    Key: {
      userId,
      id: projectId
    },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: 'attribute_exists(id)',
    ReturnValues: 'ALL_NEW'
  } satisfies Parameters<DocumentClientType['update']>[0]

  try {
    const result = await dynamodb.update(params).promise()
    return result.Attributes as Project
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      return null
    }
    throw error
  }
}

export const deleteProject = async (userId: string, projectId: string): Promise<boolean> => {
  // Step 1: Query all snippets to collect metadata (imageS3Key, snippet IDs)
  const snippets = await queryProjectSnippets(projectId)

  logger.info('Starting cascade delete for project', {
    projectId,
    userId,
    snippetCount: snippets.length
  })

  // Step 2: Delete S3 media files (using imageS3Key from snippets)
  await deleteProjectMedia(snippets)

  // Step 3: Delete snippet versions (using snippet IDs)
  await deleteProjectVersions(snippets)

  // Step 4: Delete connections
  await deleteProjectConnections(projectId)

  // Step 5: Delete snippets
  await deleteProjectSnippets(snippets)

  // Step 6: Delete the project itself
  const params = {
    TableName: TABLES.PROJECTS,
    Key: {
      userId,
      id: projectId
    },
    ConditionExpression: 'attribute_exists(id)'
  } satisfies Parameters<DocumentClientType['delete']>[0]

  try {
    await dynamodb.delete(params).promise()
    logger.info('Project cascade delete completed successfully', {
      projectId,
      userId
    })
    return true
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      return false
    }
    throw error
  }
}

const chunkRequests = (requests: SimpleDeleteBatch, size: number): SimpleDeleteBatch[] => {
  const batches: SimpleDeleteBatch[] = []
  for (let index = 0; index < requests.length; index += size) {
    batches.push(requests.slice(index, index + size))
  }
  return batches
}

const deleteWriteRequests = (items: readonly Record<string, unknown>[] | undefined): SimpleDeleteBatch => {
  const requests: SimpleDeleteBatch = []

  for (const item of items ?? []) {
    const projectIdValue = item.projectId
    const idValue = item.id

    if (typeof projectIdValue === 'string' && typeof idValue === 'string') {
      requests.push({
        DeleteRequest: {
          Key: {
            projectId: projectIdValue,
            id: idValue
          }
        }
      })
    }
  }

  return requests
}

const batchDelete = async (requests: SimpleDeleteBatch, table: string): Promise<void> => {
  const batches = chunkRequests(requests, 25)

  for (const batch of batches) {
    const awsBatch = batch.map((request) => ({
      DeleteRequest: {
        Key: request.DeleteRequest.Key
      }
    })) satisfies BatchWriteItems

    const params = {
      RequestItems: {
        [table]: awsBatch
      }
    } satisfies Parameters<DocumentClientType['batchWrite']>[0]

    await dynamodb.batchWrite(params).promise()
  }
}

const queryProjectSnippets = async (projectId: string): Promise<readonly Record<string, unknown>[]> => {
  const params = {
    TableName: TABLES.SNIPPETS,
    KeyConditionExpression: 'projectId = :projectId',
    ExpressionAttributeValues: {
      ':projectId': projectId
    }
  } satisfies Parameters<DocumentClientType['query']>[0]

  const result = await dynamodb.query(params).promise()
  return Array.isArray(result.Items) ? result.Items : []
}

const deleteProjectMedia = async (snippets: readonly Record<string, unknown>[]): Promise<void> => {
  if (!MEDIA_BUCKET_NAME || MEDIA_BUCKET_NAME.trim().length === 0) {
    logger.info('Media bucket not configured, skipping S3 cleanup')
    return
  }

  const s3Keys: string[] = []
  for (const snippet of snippets) {
    const imageS3Key = snippet.imageS3Key
    if (typeof imageS3Key === 'string' && imageS3Key.trim().length > 0) {
      s3Keys.push(imageS3Key)
    }
  }

  if (s3Keys.length === 0) {
    logger.info('No media files to delete')
    return
  }

  logger.info('Deleting media files from S3', { count: s3Keys.length })

  for (const key of s3Keys) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: MEDIA_BUCKET_NAME,
        Key: key
      })
      await s3Client.send(command)
      logger.info('Deleted S3 object', { key })
    } catch (error) {
      // Log warning but don't fail the entire deletion
      logger.warn('Failed to delete S3 object', {
        key,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

const deleteProjectVersions = async (snippets: readonly Record<string, unknown>[]): Promise<void> => {
  const snippetIds: string[] = []
  for (const snippet of snippets) {
    const id = snippet.id
    if (typeof id === 'string') {
      snippetIds.push(id)
    }
  }

  if (snippetIds.length === 0) {
    logger.info('No snippet versions to delete')
    return
  }

  logger.info('Deleting snippet versions', { snippetCount: snippetIds.length })

  // Query and delete versions for each snippet
  for (const snippetId of snippetIds) {
    try {
      const params = {
        TableName: TABLES.VERSIONS,
        KeyConditionExpression: 'snippetId = :snippetId',
        ExpressionAttributeValues: {
          ':snippetId': snippetId
        }
      } satisfies Parameters<DocumentClientType['query']>[0]

      const result = await dynamodb.query(params).promise()
      const versions = Array.isArray(result.Items) ? result.Items : []

      if (versions.length > 0) {
        // Build delete requests for versions - batch delete in chunks of 25
        const versionDeleteRequests = versions.map((version) => ({
          DeleteRequest: {
            Key: {
              snippetId,
              version: version.version
            }
          }
        }))

        // Chunk into batches of 25
        const batches: typeof versionDeleteRequests[] = []
        for (let i = 0; i < versionDeleteRequests.length; i += 25) {
          batches.push(versionDeleteRequests.slice(i, i + 25))
        }

        for (const batch of batches) {
          const batchParams = {
            RequestItems: {
              [TABLES.VERSIONS]: batch
            }
          } satisfies Parameters<DocumentClientType['batchWrite']>[0]

          await dynamodb.batchWrite(batchParams).promise()
        }

        logger.info('Deleted versions for snippet', { snippetId, versionCount: versions.length })
      }
    } catch (error) {
      logger.warn('Failed to delete versions for snippet', {
        snippetId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

const deleteProjectSnippets = async (snippets: readonly Record<string, unknown>[]): Promise<void> => {
  const requests = deleteWriteRequests(snippets)

  if (requests.length > 0) {
    await batchDelete(requests, TABLES.SNIPPETS)
  }
}

const deleteProjectConnections = async (projectId: string): Promise<void> => {
  const params = {
    TableName: TABLES.CONNECTIONS,
    KeyConditionExpression: 'projectId = :projectId',
    ExpressionAttributeValues: {
      ':projectId': projectId
    }
  } satisfies Parameters<DocumentClientType['query']>[0]

  const result = await dynamodb.query(params).promise()
  const items = Array.isArray(result.Items) ? result.Items : []
  const requests = deleteWriteRequests(items)

  if (requests.length > 0) {
    await batchDelete(requests, TABLES.CONNECTIONS)
  }
}
