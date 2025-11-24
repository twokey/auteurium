import type { VideoMetadata } from './genai'

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

export interface SnippetField {
  label?: string
  value: string
  type?: string // 'shortText' | 'longText' | 'tagList' | etc.
  isSystem?: boolean // true = system-defined
  order?: number // optional for display ordering
}

export interface Snippet {
  // Keys / ownership
  projectId: string // partition key
  id: string // sort key
  userId: string // for access control

  // Classification
  snippetType: 'text' | 'image' | 'video' | 'audio' | 'generic'
  title: string

  // New dynamic content field (core of this refactor)
  content: Record<string, SnippetField>

  // Tags (for filtering)
  tags: string[]

  // Canvas position
  position: Position

  // Lifecycle
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  createdFrom?: string // snippetId, optional
  version: number

  // Media (optional)
  imageS3Key?: string
  imageMetadata?: any
  imageUrl?: string // Signed URL
  videoS3Key?: string | null
  videoMetadata?: VideoMetadata | null
  videoUrl?: string | null // Signed URL
}

export interface SnippetVersion {
  id: string
  snippetId: string
  projectId: string
  version: number
  title: string
  content: Record<string, SnippetField>
  position?: Position
  tags?: string[]
  userId: string
  createdAt: string
}

export interface SnippetInput {
  projectId: string
  title?: string
  content?: Record<string, SnippetField>
  position?: Position
  tags?: string[]
  createdFrom?: string
  snippetType?: 'text' | 'image' | 'video' | 'audio' | 'generic'
}

export interface UpdateSnippetInput {
  title?: string
  content?: Record<string, SnippetField | null>
  position?: Position
  tags?: string[]
}

// Legacy interfaces for backward compatibility
export interface CreateSnippetInput extends SnippetInput {
  position: Position // Required in create
}
