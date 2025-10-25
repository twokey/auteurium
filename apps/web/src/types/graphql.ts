/**
 * GraphQL operation types
 * Variables and response types for queries and mutations
 */

import type {
  Snippet,
  Project,
  Connection,
  User,
  Position,
  SnippetVersion,
  AvailableModel,
  GenerateContentResult
} from './domain'

// Query Variables
export interface ProjectQueryVariables {
  id: string
}

export interface ProjectWithSnippetsQueryVariables {
  projectId: string
}

export interface ProjectConnectionsQueryVariables {
  projectId: string
  limit?: number
}

export interface SnippetQueryVariables {
  id: string
}

export interface SnippetVersionsQueryVariables {
  snippetId: string
}

export interface AvailableModelsQueryVariables {
  modality: 'TEXT_TO_TEXT' | 'TEXT_TO_IMAGE'
}

// Query Response Types
export interface ProjectsQueryData {
  projects: Project[] | null
}

export interface ProjectQueryData {
  project: Project | null
}

export interface ProjectWithSnippetsQueryData {
  project: Project | null
}

export interface ProjectConnectionsQueryData {
  projectConnections: Connection[]
}

export interface SnippetQueryData {
  snippet: Snippet | null
}

export interface SnippetVersionsQueryData {
  snippetVersions: SnippetVersion[]
}

export interface MeQueryData {
  me: User
}

export interface AvailableModelsQueryData {
  availableModels: AvailableModel[]
}

// Mutation Variables
export interface CreateProjectInput {
  name: string
  description?: string
}

export interface CreateProjectVariables {
  input: CreateProjectInput
}

export interface UpdateProjectInput {
  name?: string
  description?: string
}

export interface UpdateProjectVariables {
  id: string
  input: UpdateProjectInput
}

export interface DeleteProjectVariables {
  id: string
}

export interface CreateSnippetInput {
  projectId: string
  title?: string
  textField1: string
  position?: Position
  tags?: string[]
  categories?: string[]
}

export interface CreateSnippetVariables {
  input: CreateSnippetInput
}

export interface UpdateSnippetInput {
  title?: string
  textField1?: string
  position?: Position
  tags?: string[]
  categories?: string[]
}

export interface UpdateSnippetVariables {
  projectId: string
  id: string
  input: UpdateSnippetInput
}

export interface DeleteSnippetVariables {
  projectId: string
  id: string
}

export interface RevertSnippetVariables {
  projectId: string
  id: string
  version: number
}

export interface CombineSnippetConnectionsVariables {
  projectId: string
  snippetId: string
}

export interface GenerateSnippetImageVariables {
  projectId: string
  snippetId: string
  modelId?: string
}

export interface CreateConnectionInput {
  projectId: string
  sourceSnippetId: string
  targetSnippetId: string
  label?: string | null
}

export interface CreateConnectionVariables {
  input: CreateConnectionInput
}

export interface UpdateConnectionInput {
  label?: string | null
}

export interface UpdateConnectionVariables {
  id: string
  input: UpdateConnectionInput
}

export interface DeleteConnectionVariables {
  projectId: string
  connectionId: string
}

export interface GenerateContentInput {
  modelId: string
  prompt: string
}

export interface GenerateContentVariables {
  projectId: string
  snippetId: string
  input: GenerateContentInput
}

// Mutation Response Types
export interface CreateProjectMutationData {
  createProject: Project
}

export interface UpdateProjectMutationData {
  updateProject: Project
}

export interface DeleteProjectMutationData {
  deleteProject: boolean
}

export interface CreateSnippetMutationData {
  createSnippet: Snippet
}

export interface UpdateSnippetMutationData {
  updateSnippet: Snippet
}

export interface DeleteSnippetMutationData {
  deleteSnippet: boolean
}

export interface RevertSnippetMutationData {
  revertSnippet: Snippet
}

export interface CombineSnippetConnectionsMutationData {
  combineSnippetConnections: Snippet
}

export interface GenerateSnippetImageMutationData {
  generateSnippetImage: Snippet
}

export interface CreateConnectionMutationData {
  createConnection: Connection
}

export interface UpdateConnectionMutationData {
  updateConnection: Connection
}

export interface DeleteConnectionMutationData {
  deleteConnection: boolean
}

export interface GenerateContentMutationData {
  generateContent: GenerateContentResult
}

export interface GenerateContentStreamMutationData {
  generateContentStream: GenerateContentResult
}

// Subscription Types
export interface GenerationStreamEvent {
  snippetId: string
  content: string | null
  isComplete: boolean
  tokensUsed?: number | null
}

export interface GenerationStreamSubscriptionData {
  onGenerationStream: GenerationStreamEvent | null
}

