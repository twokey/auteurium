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

export type GraphQLGenerationModality =
  | 'TEXT_TO_TEXT'
  | 'TEXT_TO_IMAGE'
  | 'TEXT_AND_IMAGE_TO_IMAGE'
  | 'TEXT_TO_VIDEO'
  | 'TEXT_TO_AUDIO'

export interface AvailableModelsQueryVariables {
  modality?: GraphQLGenerationModality
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
  createdFrom?: string
  snippetType?: 'text' | 'video'
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

export interface UpdateSnippetPositionVariables {
  snippetId: string
  position: Position
}

export interface UpdateSnippetPositionsVariables {
  projectId: string
  updates: UpdateSnippetPositionVariables[]
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

export interface GenerateSnippetVideoVariables {
  projectId: string
  snippetId: string
  modelId: string
  duration?: number
  aspectRatio?: string
  resolution?: string
  style?: string
  seed?: number
  movementAmplitude?: string
}

export interface GenerateSnippetVideoMutationData {
  generateSnippetVideo: Snippet
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

export interface UpdateSnippetPositionsMutationData {
  updateSnippetPositions: Snippet[]
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

// GraphQL Error Types
export interface ValidationDetail {
  field: string
  message: string
}

export interface GraphQLErrorExtensions {
  code?: string
  details?: ValidationDetail[]
  validationErrors?: Record<string, string>
}

export interface GraphQLError {
  message: string
  extensions?: GraphQLErrorExtensions
  locations?: { line: number; column: number }[]
  path?: (string | number)[]
}

export interface GraphQLResponse<T> {
  data?: T
  errors?: GraphQLError[]
}

// Type guards for GraphQL errors
export function isGraphQLError(error: unknown): error is { errors: GraphQLError[] } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'errors' in error &&
    Array.isArray((error as { errors: unknown }).errors)
  )
}

export function hasValidationErrors(error: GraphQLError): boolean {
  return !!(error.extensions?.validationErrors ?? error.extensions?.details)
}

export function extractValidationErrors(errors: GraphQLError[]): Record<string, string> {
  const validationErrors: Record<string, string> = {}

  for (const error of errors) {
    if (error.extensions?.validationErrors) {
      Object.assign(validationErrors, error.extensions.validationErrors)
    }
    if (error.extensions?.details) {
      for (const detail of error.extensions.details) {
        validationErrors[detail.field] = detail.message
      }
    }
  }

  return validationErrors
}
