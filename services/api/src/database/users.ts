import { dynamodb, TABLES, getCurrentTimestamp } from './client'
import { User } from '@auteurium/shared-types'

export const getUserById = async (id: string): Promise<User | null> => {
  const params = {
    TableName: TABLES.USERS,
    Key: { id }
  }

  const result = await dynamodb.get(params).promise()
  return result.Item as User || null
}

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const params = {
    TableName: TABLES.USERS,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email
    }
  }

  const result = await dynamodb.query(params).promise()
  return result.Items?.[0] as User || null
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
  }

  await dynamodb.put(params).promise()
  return user
}

export const updateUser = async (id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> => {
  const updateExpression: string[] = []
  const expressionAttributeNames: Record<string, string> = {}
  const expressionAttributeValues: Record<string, any> = {}

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
    ReturnValues: 'ALL_NEW' as const
  }

  const result = await dynamodb.update(params).promise()
  return result.Attributes as User
}

export const deleteUser = async (id: string): Promise<boolean> => {
  const params = {
    TableName: TABLES.USERS,
    Key: { id },
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

export const getAllUsers = async (): Promise<User[]> => {
  const params = {
    TableName: TABLES.USERS
  }

  const result = await dynamodb.scan(params).promise()
  return result.Items as User[] || []
}