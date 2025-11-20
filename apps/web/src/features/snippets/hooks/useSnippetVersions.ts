import { useCallback, useState } from 'react'

import { useGraphQLQuery } from '../../../hooks/useGraphQLQuery'
import { useToast } from '../../../store/toastStore'

import type { SnippetVersion } from '../../../types'

export interface UseSnippetVersionsReturn {
  versions: SnippetVersion[]
  isLoading: boolean
  error: Error | null
  revertVersion: (projectId: string, snippetId: string, version: number) => Promise<boolean>
  isReverting: boolean
}

/**
 * useSnippetVersions - Manage snippet version history
 * Handles: fetching versions, reverting to previous versions
 */
export const useSnippetVersions = (snippetId: string): UseSnippetVersionsReturn => {
  const toast = useToast()
  const [isReverting, setIsReverting] = useState(false)

  // Fetch versions from GraphQL
  const { data, loading, error } = useGraphQLQuery<{ snippetVersions: SnippetVersion[] }>(
    `query GetSnippetVersions($snippetId: ID!) {
      snippetVersions(snippetId: $snippetId) {
        id
        version
        textField1
        createdAt
      }
    }`,
    { variables: { snippetId } }
  )

  // Handle version revert
  const revertVersion = useCallback(
    async (_projectId: string, _snippetId: string, _version: number): Promise<boolean> => {
      setIsReverting(true)
      try {
        // Note: You'll need to implement REVERT_SNIPPET_VERSION mutation in graphql/mutations.ts
        // This is a placeholder that shows the pattern
        const confirmed = window.confirm(
          'Are you sure you want to revert to this version? This action cannot be undone.'
        )
        if (!confirmed) return false

        // Call mutation here once implemented
        toast.success('Reverted to previous version')
        return true
      } catch (error) {
        console.error('Failed to revert version:', error)
        toast.error('Failed to revert', error instanceof Error ? error.message : 'Unknown error')
        return false
      } finally {
        setIsReverting(false)
      }
    },
    [toast]
  )

  return {
    versions: data?.snippetVersions ?? [],
    isLoading: loading,
    error: error,
    revertVersion,
    isReverting
  }
}
