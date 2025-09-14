import { dynamodb, TABLES, generateId, getCurrentTimestamp } from './client'
import { Snippet, SnippetInput, UpdateSnippetInput, SnippetVersion, Position } from '@auteurium/shared-types'
import { createNotFoundError, createConflictError } from '../utils/errors'
import { Logger } from '@aws-lambda-powertools/logger'
import { deleteSnippetConnections } from './connections'

const logger = new Logger({ serviceName: 'snippets-db' })

// Create a new snippet
export const createSnippet = async (
  snippetInput: SnippetInput,
  userId: string
): Promise<Snippet> => {
  const snippetId = generateId()
  const timestamp = getCurrentTimestamp()

  const snippet: Snippet = {
    id: snippetId,
    projectId: snippetInput.projectId,
    userId,
    textField1: snippetInput.textField1,
    textField2: snippetInput.textField2,
    position: snippetInput.position || { x: 0, y: 0 },
    tags: snippetInput.tags || [],
    categories: snippetInput.categories || [],
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  }

  try {
    await dynamodb.put({
      TableName: TABLES.SNIPPETS,
      Item: snippet,
      // Ensure snippet ID is unique within the project
      ConditionExpression: 'attribute_not_exists(id)'
    }).promise()

    // Create initial version record
    await createSnippetVersion(snippet)

    logger.info('Snippet created', {
      snippetId,
      projectId: snippetInput.projectId,
      userId
    })

    return snippet
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      throw createConflictError('Snippet with this ID already exists')
    }
    logger.error('Failed to create snippet', { error, snippetInput, userId })
    throw error
  }
}

// Get snippet by ID
export const getSnippet = async (
  projectId: string,
  snippetId: string,
  userId: string
): Promise<Snippet | null> => {
  try {
    const result = await dynamodb.get({
      TableName: TABLES.SNIPPETS,
      Key: {
        projectId,
        id: snippetId
      }
    }).promise()

    if (!result.Item) {
      return null
    }

    const snippet = result.Item as Snippet

    // Verify user ownership
    if (snippet.userId !== userId) {
      throw createNotFoundError('Snippet')
    }

    return snippet
  } catch (error) {
    logger.error('Failed to get snippet', { error, projectId, snippetId, userId })
    throw error
  }
}

// Get all snippets for a project
export const getProjectSnippets = async (
  projectId: string,
  userId: string
): Promise<Snippet[]> => {
  try {
    const result = await dynamodb.query({
      TableName: TABLES.SNIPPETS,
      KeyConditionExpression: 'projectId = :projectId',
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':projectId': projectId,
        ':userId': userId
      }
    }).promise()

    return result.Items as Snippet[]
  } catch (error) {
    logger.error('Failed to get project snippets', { error, projectId, userId })
    throw error
  }
}

// Get all snippets for a user
export const getUserSnippets = async (
  userId: string,
  limit: number = 100,
  lastKey?: any
): Promise<{ snippets: Snippet[], lastKey?: any }> => {
  try {
    const params: any = {
      TableName: TABLES.SNIPPETS,
      IndexName: 'UserIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: limit,
      ScanIndexForward: false // Most recent first
    }

    if (lastKey) {
      params.ExclusiveStartKey = lastKey
    }

    const result = await dynamodb.query(params).promise()

    return {
      snippets: result.Items as Snippet[],
      lastKey: result.LastEvaluatedKey
    }
  } catch (error) {
    logger.error('Failed to get user snippets', { error, userId })
    throw error
  }
}

// Update snippet
export const updateSnippet = async (
  projectId: string,
  snippetId: string,
  updates: UpdateSnippetInput,
  userId: string
): Promise<Snippet> => {
  const timestamp = getCurrentTimestamp()

  try {
    // Get current snippet to create version
    const currentSnippet = await getSnippet(projectId, snippetId, userId)
    if (!currentSnippet) {
      throw createNotFoundError('Snippet')
    }

    // Build update expression
    const updateExpressions: string[] = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': timestamp,
      ':userId': userId,
      ':version': currentSnippet.version + 1
    }

    if (updates.textField1 !== undefined) {
      updateExpressions.push('#textField1 = :textField1')
      expressionAttributeNames['#textField1'] = 'textField1'
      expressionAttributeValues[':textField1'] = updates.textField1
    }

    if (updates.textField2 !== undefined) {
      updateExpressions.push('#textField2 = :textField2')
      expressionAttributeNames['#textField2'] = 'textField2'
      expressionAttributeValues[':textField2'] = updates.textField2
    }

    if (updates.position !== undefined) {
      updateExpressions.push('#position = :position')
      expressionAttributeNames['#position'] = 'position'
      expressionAttributeValues[':position'] = updates.position
    }

    if (updates.tags !== undefined) {
      updateExpressions.push('#tags = :tags')
      expressionAttributeNames['#tags'] = 'tags'
      expressionAttributeValues[':tags'] = updates.tags
    }

    if (updates.categories !== undefined) {
      updateExpressions.push('#categories = :categories')
      expressionAttributeNames['#categories'] = 'categories'
      expressionAttributeValues[':categories'] = updates.categories
    }

    updateExpressions.push('updatedAt = :updatedAt', '#version = :version')
    expressionAttributeNames['#version'] = 'version'

    const result = await dynamodb.update({
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
    }).promise()

    const updatedSnippet = result.Attributes as Snippet

    // Create version record for the update
    await createSnippetVersion(updatedSnippet)

    logger.info('Snippet updated', {
      snippetId,
      projectId,
      userId,
      version: updatedSnippet.version
    })

    return updatedSnippet
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      throw createNotFoundError('Snippet')
    }
    logger.error('Failed to update snippet', { error, projectId, snippetId, updates, userId })
    throw error
  }
}

// Delete snippet with cascade
export const deleteSnippet = async (
  projectId: string,
  snippetId: string,
  userId: string
): Promise<void> => {
  try {
    // First, verify ownership and get the snippet
    const snippet = await getSnippet(projectId, snippetId, userId)
    if (!snippet) {
      throw createNotFoundError('Snippet')
    }

    // Delete all connections involving this snippet
    await deleteSnippetConnections(snippetId, userId)

    // Delete all versions of this snippet
    await deleteSnippetVersions(snippetId)

    // Delete the snippet itself
    await dynamodb.delete({
      TableName: TABLES.SNIPPETS,
      Key: {
        projectId,
        id: snippetId
      },
      ConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise()

    logger.info('Snippet deleted with cascade', {
      snippetId,
      projectId,
      userId
    })
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      throw createNotFoundError('Snippet')
    }
    logger.error('Failed to delete snippet', { error, projectId, snippetId, userId })
    throw error
  }
}

// Delete all snippets for a project (used in project cascade delete)
export const deleteProjectSnippets = async (
  projectId: string,
  userId: string
): Promise<void> => {
  try {
    const snippets = await getProjectSnippets(projectId, userId)

    for (const snippet of snippets) {
      await deleteSnippet(projectId, snippet.id, userId)
    }

    logger.info('All project snippets deleted', {
      projectId,
      snippetsCount: snippets.length,
      userId
    })
  } catch (error) {
    logger.error('Failed to delete project snippets', { error, projectId, userId })
    throw error
  }
}

// Version management functions
const createSnippetVersion = async (snippet: Snippet): Promise<void> => {
  const version: SnippetVersion = {
    id: generateId(),
    snippetId: snippet.id,
    version: snippet.version,
    textField1: snippet.textField1,
    textField2: snippet.textField2,
    userId: snippet.userId,
    createdAt: snippet.updatedAt
  }

  await dynamodb.put({
    TableName: TABLES.VERSIONS,
    Item: version
  }).promise()
}

const deleteSnippetVersions = async (snippetId: string): Promise<void> => {
  const result = await dynamodb.query({
    TableName: TABLES.VERSIONS,
    KeyConditionExpression: 'snippetId = :snippetId',
    ExpressionAttributeValues: {
      ':snippetId': snippetId
    }
  }).promise()

  for (const version of result.Items || []) {
    await dynamodb.delete({
      TableName: TABLES.VERSIONS,
      Key: {
        snippetId,
        version: version.version
      }
    }).promise()
  }
}

// Get snippet versions
export const getSnippetVersions = async (
  snippetId: string,
  userId: string
): Promise<SnippetVersion[]> => {
  try {
    const result = await dynamodb.query({
      TableName: TABLES.VERSIONS,
      KeyConditionExpression: 'snippetId = :snippetId',
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':snippetId': snippetId,
        ':userId': userId
      },
      ScanIndexForward: false // Latest versions first
    }).promise()

    return result.Items as SnippetVersion[]
  } catch (error) {
    logger.error('Failed to get snippet versions', { error, snippetId, userId })
    throw error
  }
}

// Revert snippet to a specific version
export const revertSnippetToVersion = async (
  projectId: string,
  snippetId: string,
  targetVersion: number,
  userId: string
): Promise<Snippet> => {
  try {
    // Get the target version
    const versionResult = await dynamodb.get({
      TableName: TABLES.VERSIONS,
      Key: {
        snippetId,
        version: targetVersion
      }
    }).promise()

    if (!versionResult.Item) {
      throw createNotFoundError('Snippet version')
    }

    const targetVersionData = versionResult.Item as SnippetVersion

    // Verify user ownership
    if (targetVersionData.userId !== userId) {
      throw createNotFoundError('Snippet version')
    }

    // Update the snippet with the version data
    const updateInput: UpdateSnippetInput = {
      textField1: targetVersionData.textField1,
      textField2: targetVersionData.textField2
    }

    const revertedSnippet = await updateSnippet(projectId, snippetId, updateInput, userId)

    logger.info('Snippet reverted to version', {
      snippetId,
      targetVersion,
      newVersion: revertedSnippet.version,
      userId
    })

    return revertedSnippet
  } catch (error) {
    logger.error('Failed to revert snippet', { error, projectId, snippetId, targetVersion, userId })
    throw error
  }
}