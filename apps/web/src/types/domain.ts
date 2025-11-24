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
  zIndex?: number
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
  model?: string
  taskId?: string
  bgm?: boolean
  credits?: number
  offPeak?: boolean
  createdAt?: string
}

export type VideoGenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

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

export interface SnippetField {
  label?: string
  value: string
  type?: string // 'shortText' | 'longText' | 'tagList' | etc.
  isSystem?: boolean // true = system-defined
  order?: number // optional for display ordering
}

export interface Snippet {
  id: string
  projectId: string
  userId?: string
  title: string
  content: Record<string, SnippetField>
  position: Position
  tags: string[]
  version: number
  createdAt: string
  updatedAt: string
  imageS3Key?: string | null
  imageMetadata?: ImageMetadata | null
  videoS3Key?: string | null
  videoMetadata?: VideoMetadata | null
  imageUrl?: string | null
  videoUrl?: string | null
  createdFrom?: string | null
  generated?: boolean
  generationId?: string | null
  generationCreatedAt?: string | null
  connections?: Connection[]
  snippetType: 'text' | 'image' | 'video' | 'audio' | 'generic' | 'content'
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
  title: string
  content: Record<string, SnippetField>
  position?: Position
  tags?: string[]
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
  generationId?: string | null
  generationCreatedAt?: string | null
}
