import { useMemo } from 'react'
import type { Snippet, Connection } from '../../../types'

interface ConnectionWithSource extends Connection {
  sourceSnippet?: Snippet
}

export interface UseConnectionListingReturn {
  outgoingConnections: Connection[]
  incomingConnections: ConnectionWithSource[]
  getSnippetPreview: (snippetId: string, allSnippets: Snippet[]) => string
}

/**
 * useConnectionListing - Organize and memoize connection lists
 * Separates outgoing and incoming connections with memoization
 */
export const useConnectionListing = (
  snippet: Pick<Snippet, 'id' | 'connections'>,
  allSnippets: Snippet[]
): UseConnectionListingReturn => {
  // Get outgoing connections (where this snippet is source)
  const outgoingConnections = useMemo(
    () => snippet.connections ?? [],
    [snippet.connections]
  )

  // Get incoming connections (where this snippet is target)
  const incomingConnections = useMemo(
    () =>
      allSnippets
        .flatMap(s => (s.connections ?? []).map((conn: Connection) => ({ ...conn, sourceSnippet: s })))
        .filter(conn => conn.targetSnippetId === snippet.id),
    [allSnippets, snippet.id]
  )

  // Helper to get snippet preview text
  const getSnippetPreview = (snippetId: string, snippets: Snippet[]): string => {
    const foundSnippet = snippets.find(s => s.id === snippetId)
    if (!foundSnippet) return `Unknown snippet (${snippetId.slice(0, 8)})`

    const previewSource = foundSnippet.textField1?.trim()
    const preview = previewSource && previewSource !== '' ? previewSource : 'Untitled snippet'
    return preview.length > 40 ? `${preview.substring(0, 40)}...` : preview
  }

  return {
    outgoingConnections,
    incomingConnections,
    getSnippetPreview
  }
}
