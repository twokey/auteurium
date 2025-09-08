export interface Project {
  id: string
  userId: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  lastModified: string
}

export interface CreateProjectInput {
  name: string
  description?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
}