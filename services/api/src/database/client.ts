import { DynamoDB } from 'aws-sdk'

// Initialize DynamoDB client
export const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1'
})

// Table names from environment variables
export const TABLES = {
  USERS: process.env.USERS_TABLE!,
  PROJECTS: process.env.PROJECTS_TABLE!,
  SNIPPETS: process.env.SNIPPETS_TABLE!,
  CONNECTIONS: process.env.CONNECTIONS_TABLE!,
  VERSIONS: process.env.VERSIONS_TABLE!
}

// Helper function to generate unique IDs
export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Helper function to get current timestamp
export const getCurrentTimestamp = () => {
  return new Date().toISOString()
}