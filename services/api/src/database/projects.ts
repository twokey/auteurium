import {
  TABLES,
  dynamodb,
  generateId,
  getCurrentTimestamp,
  type DocumentClientType
} from './client'

import type { CreateProjectInput, Project, UpdateProjectInput } from '@auteurium/shared-types'

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
  await deleteProjectSnippets(projectId)
  await deleteProjectConnections(projectId)

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

const deleteProjectSnippets = async (projectId: string): Promise<void> => {
  const params = {
    TableName: TABLES.SNIPPETS,
    KeyConditionExpression: 'projectId = :projectId',
    ExpressionAttributeValues: {
      ':projectId': projectId
    }
  } satisfies Parameters<DocumentClientType['query']>[0]

  const result = await dynamodb.query(params).promise()
  const items = Array.isArray(result.Items) ? result.Items : []
  const requests = deleteWriteRequests(items)

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
