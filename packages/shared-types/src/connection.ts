export interface Connection {
  id: string
  projectId: string
  sourceSnippetId: string
  targetSnippetId: string
  label?: string
  createdAt: string
  updatedAt: string
}

export interface CreateConnectionInput {
  projectId: string
  sourceSnippetId: string
  targetSnippetId: string
  label?: string
}

export interface UpdateConnectionInput {
  label?: string
}