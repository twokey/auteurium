export interface Position {
  x: number
  y: number
}

export interface Snippet {
  id: string
  projectId: string
  userId: string
  textField1: string
  textField2: string
  position: Position
  tags: string[]
  categories: string[]
  version: number
  createdAt: string
  updatedAt: string
}

export interface SnippetVersion {
  id: string
  snippetId: string
  projectId: string
  version: number
  textField1: string
  textField2: string
  position?: Position
  tags?: string[]
  categories?: string[]
  userId: string
  createdAt: string
}

export interface SnippetInput {
  projectId: string
  textField1?: string
  textField2?: string
  position?: Position
  tags?: string[]
  categories?: string[]
}

export interface UpdateSnippetInput {
  textField1?: string
  textField2?: string
  position?: Position
  tags?: string[]
  categories?: string[]
}

// Legacy interfaces for backward compatibility
export interface CreateSnippetInput extends SnippetInput {
  position: Position // Required in create
}
