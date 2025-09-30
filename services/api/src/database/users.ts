import { TABLES, dynamodb, getCurrentTimestamp, type DocumentClientType } from './client'

import type { User } from '@auteurium/shared-types'

const isConditionalCheckFailed = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 'ConditionalCheckFailedException'

export const getUserById = async (id: string): Promise<User | null> => {
  const params = {
    TableName: TABLES.USERS,
    Key: { id }
  } satisfies Parameters<DocumentClientType['get']>[0]

  const result = await dynamodb.get(params).promise()
  const item = result.Item as User | undefined
  return item ?? null
}

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const params = {
    TableName: TABLES.USERS,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email
    }
  } satisfies Parameters<DocumentClientType['query']>[0]

  const result = await dynamodb.query(params).promise()
  const [item] = (result.Items ?? []) as User[]
  return item ?? null
}

export const createUser = async (userData: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> => {
  const now = getCurrentTimestamp()
  const user: User = {
    ...userData,
    createdAt: now,
    updatedAt: now
  }

  const params = {
    TableName: TABLES.USERS,
    Item: user,
    ConditionExpression: 'attribute_not_exists(id)'
  } satisfies Parameters<DocumentClientType['put']>[0]

  await dynamodb.put(params).promise()
  return user
}

export const updateUser = async (
  id: string,
  updates: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User> => {
  const updateExpression: string[] = []
  const expressionAttributeNames: Record<string, string> = {}
  const expressionAttributeValues: Record<string, unknown> = {}

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = value
    }
  })

  updateExpression.push('#updatedAt = :updatedAt')
  expressionAttributeNames['#updatedAt'] = 'updatedAt'
  expressionAttributeValues[':updatedAt'] = getCurrentTimestamp()

  const params = {
    TableName: TABLES.USERS,
    Key: { id },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  } satisfies Parameters<DocumentClientType['update']>[0]

  const result = await dynamodb.update(params).promise()
  return result.Attributes as User
}

export const deleteUser = async (id: string): Promise<boolean> => {
  const params = {
    TableName: TABLES.USERS,
    Key: { id },
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
