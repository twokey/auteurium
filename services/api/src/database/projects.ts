import { dynamodb, TABLES, generateId, getCurrentTimestamp } from './client'
import { Project, CreateProjectInput, UpdateProjectInput } from '@auteurium/shared-types'

export const getProjectsByUserId = async (userId: string): Promise<Project[]> => {
  const params = {
    TableName: TABLES.PROJECTS,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ScanIndexForward: false // Get most recent first
  }

  const result = await dynamodb.query(params).promise()
  return (result.Items as Project[]) || []
}

export const getProjectById = async (userId: string, projectId: string): Promise<Project | null> => {
  const params = {
    TableName: TABLES.PROJECTS,
    Key: {
      userId,
      id: projectId
    }
  }

  const result = await dynamodb.get(params).promise()
  return result.Item as Project || null
}

export const createProject = async (userId: string, input: CreateProjectInput): Promise<Project> => {
  const now = getCurrentTimestamp()
  const project: Project = {
    id: generateId(),
    userId,
    name: input.name,
    description: input.description || '',
    createdAt: now,
    updatedAt: now,
    lastModified: now
  }

  const params = {
    TableName: TABLES.PROJECTS,
    Item: project
  }

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
  const expressionAttributeValues: Record<string, any> = {}

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
    ReturnValues: 'ALL_NEW' as const
  }

  try {
    const result = await dynamodb.update(params).promise()
    return result.Attributes as Project
  } catch (error: any) {
    if (error.code === 'ConditionalCheckFailedException') {
      return null
    }
    throw error
  }
}

export const deleteProject = async (userId: string, projectId: string): Promise<boolean> => {
  // First, we need to delete all snippets and connections in this project
  await deleteProjectSnippets(projectId)
  await deleteProjectConnections(projectId)

  const params = {
    TableName: TABLES.PROJECTS,
    Key: {
      userId,
      id: projectId
    },
    ConditionExpression: 'attribute_exists(id)'
  }

  try {
    await dynamodb.delete(params).promise()
    return true
  } catch (error: any) {
    if (error.code === 'ConditionalCheckFailedException') {
      return false
    }
    throw error
  }
}

// Helper function to delete all snippets in a project (cascade delete)
const deleteProjectSnippets = async (projectId: string): Promise<void> => {
  const params = {
    TableName: TABLES.SNIPPETS,
    KeyConditionExpression: 'projectId = :projectId',
    ExpressionAttributeValues: {
      ':projectId': projectId
    }
  }

  const result = await dynamodb.query(params).promise()
  
  if (result.Items && result.Items.length > 0) {
    // Delete snippets in batches
    const deleteRequests = result.Items.map(item => ({
      DeleteRequest: {
        Key: {
          projectId: item.projectId,
          id: item.id
        }
      }
    }))

    // DynamoDB batch operations can handle up to 25 items
    for (let i = 0; i < deleteRequests.length; i += 25) {
      const batch = deleteRequests.slice(i, i + 25)
      const batchParams = {
        RequestItems: {
          [TABLES.SNIPPETS]: batch
        }
      }
      await dynamodb.batchWrite(batchParams).promise()
    }
  }
}

// Helper function to delete all connections in a project (cascade delete)
const deleteProjectConnections = async (projectId: string): Promise<void> => {
  const params = {
    TableName: TABLES.CONNECTIONS,
    KeyConditionExpression: 'projectId = :projectId',
    ExpressionAttributeValues: {
      ':projectId': projectId
    }
  }

  const result = await dynamodb.query(params).promise()
  
  if (result.Items && result.Items.length > 0) {
    // Delete connections in batches
    const deleteRequests = result.Items.map(item => ({
      DeleteRequest: {
        Key: {
          projectId: item.projectId,
          id: item.id
        }
      }
    }))

    // DynamoDB batch operations can handle up to 25 items
    for (let i = 0; i < deleteRequests.length; i += 25) {
      const batch = deleteRequests.slice(i, i + 25)
      const batchParams = {
        RequestItems: {
          [TABLES.CONNECTIONS]: batch
        }
      }
      await dynamodb.batchWrite(batchParams).promise()
    }
  }
}
// Alias for backward compatibility
export const getProject = getProjectById
