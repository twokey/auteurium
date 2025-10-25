/**
 * Core domain types used throughout the application
 * These represent the primary business entities
 */

export enum UserRole {
  ADMIN = 'admin',
  STANDARD = 'standard'
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface Position {
  x: number
  y: number
}

export interface ImageMetadata {
  width: number
  height: number
  aspectRatio: string
}

export interface Connection {
  id: string
  projectId: string
  sourceSnippetId: string
  targetSnippetId: string
  connectionType?: string
  label?: string | null
  createdAt: string
  updatedAt: string
}

export interface Snippet {
  id: string
  projectId: string
  title?: string
  textField1: string
  textField2: string
  position?: Position | null
  tags?: string[]
  categories?: string[]
  version: number
  createdAt: string
  updatedAt: string
  imageUrl?: string | null
  imageS3Key?: string | null
  imageMetadata?: ImageMetadata | null
  connections?: Connection[]
}

export interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  lastModified: string
  snippets?: Snippet[]
}

export interface SnippetVersion {
  id: string
  version: number
  textField1: string
  textField2: string
  createdAt: string
}

export interface AvailableModel {
  id: string
  displayName: string
  description?: string | null
  provider: string
  maxTokens?: number | null
  costPerToken?: number | null
}

export interface GenerateContentResult {
  content: string
  tokensUsed: number
  cost: number
  modelUsed: string
  generationTimeMs: number
}


