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

export interface VideoMetadata {
  duration: number
  resolution: string
  aspectRatio: string
  style?: string
  seed?: number
  format?: string
  fileSize?: number
  movementAmplitude?: string
}

export type VideoGenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'

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
  position?: Position | null
  tags?: string[]
  categories?: string[]
  version: number
  createdAt: string
  updatedAt: string
  imageUrl?: string | null
  imageS3Key?: string | null
  imageMetadata?: ImageMetadata | null
  videoUrl?: string | null
  videoS3Key?: string | null
  videoMetadata?: VideoMetadata | null
  videoGenerationStatus?: VideoGenerationStatus | null
  videoGenerationTaskId?: string | null
  videoGenerationError?: string | null
  createdFrom?: string | null
  connections?: Connection[]
  snippetType?: 'text' | 'video'
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
  createdAt: string
}

export type GenerationModality =
  | 'TEXT_TO_TEXT'
  | 'TEXT_TO_IMAGE'
  | 'TEXT_AND_IMAGE_TO_IMAGE'
  | 'TEXT_TO_VIDEO'
  | 'TEXT_TO_AUDIO'

export interface AvailableModel {
  id: string
  displayName: string
  description?: string | null
  provider: string
  modality: GenerationModality
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
