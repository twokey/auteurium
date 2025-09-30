import { DynamoDB } from 'aws-sdk'

export type DocumentClientType = DynamoDB.DocumentClient
export type WriteRequest = DocumentClientType.WriteRequest

// Initialize DynamoDB client
const resolveEnv = (value: string | undefined, fallback: string) =>
  typeof value === 'string' && value.trim() !== '' ? value : fallback

export const dynamodb = new DynamoDB.DocumentClient({
  region: resolveEnv(process.env.AWS_REGION, 'us-east-1')
})

// Table names from environment variables
export const TABLES = {
  USERS: resolveEnv(process.env.USERS_TABLE, 'users'),
  PROJECTS: resolveEnv(process.env.PROJECTS_TABLE, 'projects'),
  SNIPPETS: resolveEnv(process.env.SNIPPETS_TABLE, 'snippets'),
  CONNECTIONS: resolveEnv(process.env.CONNECTIONS_TABLE, 'connections'),
  VERSIONS: resolveEnv(process.env.VERSIONS_TABLE, 'versions')
}

// Helper function to generate unique IDs
export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Helper function to get current timestamp
export const getCurrentTimestamp = () => {
  return new Date().toISOString()
}
