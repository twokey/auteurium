export interface Position {
  x: number
  y: number
}

export interface ImageMetadata {
  width: number
  height: number
  aspectRatio: string
}

export interface Snippet {
  id: string
  projectId: string
  userId: string
  title?: string
  textField1: string
  position: Position
  tags: string[]
  categories: string[]
  version: number
  createdAt: string
  updatedAt: string
  imageUrl?: string
  imageS3Key?: string
  imageMetadata?: ImageMetadata
  createdFrom?: string
}

export interface SnippetVersion {
  id: string
  snippetId: string
  projectId: string
  version: number
  title?: string
  textField1: string
  position?: Position
  tags?: string[]
  categories?: string[]
  userId: string
  createdAt: string
}

export interface SnippetInput {
  projectId: string
  title?: string
  textField1?: string
  position?: Position
  tags?: string[]
  categories?: string[]
  createdFrom?: string
}

export interface UpdateSnippetInput {
  title?: string
  textField1?: string
  position?: Position
  tags?: string[]
  categories?: string[]
}

// Legacy interfaces for backward compatibility
export interface CreateSnippetInput extends SnippetInput {
  position: Position // Required in create
}
