export interface Snippet {
  id: string
  projectId: string
  userId: string
  textField1: string
  textField2: string
  position: {
    x: number
    y: number
  }
  tags: string[]
  categories: string[]
  version: number
  createdAt: string
  updatedAt: string
}

export interface SnippetVersion {
  id: string
  snippetId: string
  version: number
  textField1: string
  textField2: string
  createdAt: string
}

export interface CreateSnippetInput {
  projectId: string
  textField1?: string
  textField2?: string
  position: {
    x: number
    y: number
  }
  tags?: string[]
  categories?: string[]
}

export interface UpdateSnippetInput {
  textField1?: string
  textField2?: string
  position?: {
    x: number
    y: number
  }
  tags?: string[]
  categories?: string[]
}