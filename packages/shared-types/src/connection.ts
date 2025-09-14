// Connection types for different relationship meanings
export enum ConnectionType {
  RELATED = 'RELATED',           // General relationship
  DEPENDS_ON = 'DEPENDS_ON',     // A depends on B
  SUPPORTS = 'SUPPORTS',         // A supports B
  CONTRADICTS = 'CONTRADICTS',   // A contradicts B
  EXTENDS = 'EXTENDS',           // A extends B
  CONTAINS = 'CONTAINS',         // A contains B
  REFERENCES = 'REFERENCES',     // A references B
  SIMILAR = 'SIMILAR',           // A is similar to B
  CUSTOM = 'CUSTOM'              // Custom relationship with label
}

export interface Connection {
  id: string
  projectId: string
  sourceSnippetId: string
  targetSnippetId: string
  connectionType: ConnectionType
  label?: string                 // Human-readable description
  description?: string          // Detailed description of the relationship
  metadata?: Record<string, any> // Extensible metadata for future features
  userId: string                // User who created the connection
  createdAt: string
  updatedAt: string
}

export interface ConnectionInput {
  projectId: string
  sourceSnippetId: string
  targetSnippetId: string
  connectionType?: ConnectionType
  label?: string
  description?: string
  metadata?: Record<string, any>
}

export interface UpdateConnectionInput {
  connectionType?: ConnectionType
  label?: string
  description?: string
  metadata?: Record<string, any>
}

// Graph traversal types for Neptune-like queries
export interface GraphNode {
  snippetId: string
  connections: Connection[]
  depth: number
}

export interface GraphTraversalResult {
  nodes: GraphNode[]
  connections: Connection[]
  totalNodes: number
  maxDepthReached: number
}