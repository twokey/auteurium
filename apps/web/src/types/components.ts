/**
 * Component-specific types and interfaces
 * Props, state, and component-related types
 */

import type { Snippet, Project, User } from './domain'

// Auth Component Props
export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  hasCheckedAuth: boolean
}

export interface SignUpResult {
  isSignUpComplete?: boolean
  nextStep?: {
    signUpStep?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

// Modal Props
export interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export interface EditSnippetModalProps extends BaseModalProps {
  snippet: Snippet
}

export interface DeleteSnippetConfirmationProps extends BaseModalProps {
  snippet: Snippet
  onDeleted?: () => void
}

export interface ManageConnectionsModalProps extends BaseModalProps {
  snippet: Snippet
  allSnippets: Snippet[]
}

export interface VersionHistoryModalProps extends BaseModalProps {
  snippet: Snippet
}

export interface GeneratedSnippetPreviewModalProps extends BaseModalProps {
  content: string
  onCreate: () => void
  isCreating?: boolean
}

export interface CreateProjectModalProps extends BaseModalProps {
  onCreated: () => void
}

export interface EditProjectModalProps extends BaseModalProps {
  project: Project | null
  onUpdated: () => void
}

// Canvas Component Types
export interface CanvasToolbarProps {
  onCreateSnippet: (position: { x: number; y: number }) => void
  onSaveCanvas: () => void
  onZoomToFit: () => void
  isLoading?: boolean
  reactFlowInstance: unknown // ReactFlowInstance type from reactflow
}

export interface CanvasInfoPanelProps {
  project: {
    id: string
    name: string
    description?: string
    lastModified: string
  }
  snippetCount: number
  connectionCount: number
}

// Snippet Node Types
export type EditableField = 'textField1'

export interface SnippetNodeData {
  snippet: {
    id: string
    title?: string
    textField1: string
    tags?: string[]
    categories?: string[]
    connectionCount: number
    imageUrl?: string | null
    imageS3Key?: string | null
    imageMetadata?: {
      width: number
      height: number
      aspectRatio: string
    } | null
  }
  onEdit: (snippetId: string) => void
  onDelete: (snippetId: string) => void
  onManageConnections: (snippetId: string) => void
  onViewVersions: (snippetId: string) => void
  onUpdateContent: (snippetId: string, changes: Partial<Pick<Snippet, 'textField1'>>) => Promise<void>
  onCombine: (snippetId: string) => Promise<void>
  onGenerateImage: (snippetId: string, modelId?: string) => void
  isGeneratingImage: boolean
  connectedSnippets?: Array<{ id: string; imageS3Key?: string | null }>
}

export interface SnippetNodeProps {
  id: string
  data: SnippetNodeData
}

// Project Card Props
export interface ProjectCardProps {
  project: Project
  onDeleted: () => void
  onUpdated: () => void
}

// Navigation Props
export interface NavigationProps {
  currentProject?: {
    id: string
    name: string
  }
}

// Hook Return Types
export interface UseGraphQLQueryOptions<TVariables = Record<string, unknown>> {
  variables?: TVariables
  skip?: boolean
  pollInterval?: number
}

export interface UseGraphQLQueryResult<TData> {
  data: TData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export interface UseGraphQLMutationOptions {
  onCompleted?: (data: unknown) => void
  onError?: (error: Error) => void
}

export interface UseGraphQLMutationResult<TData, TVariables> {
  mutate: (options: { variables: TVariables }) => Promise<TData | null>
  data: TData | null
  loading: boolean
  error: Error | null
  reset: () => void
}
