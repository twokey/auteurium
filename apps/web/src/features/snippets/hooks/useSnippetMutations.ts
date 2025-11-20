import { useCallback } from 'react'

import { UPDATE_SNIPPET, DELETE_SNIPPET, COMBINE_SNIPPET_CONNECTIONS, GENERATE_SNIPPET_IMAGE } from '../../../graphql/mutations'
import { useGraphQLMutation } from '../../../hooks/useGraphQLMutation'
import { useToast } from '../../../store/toastStore'

import type {
  Snippet,
  UpdateSnippetInput,
  UpdateSnippetVariables,
  UpdateSnippetMutationData,
  DeleteSnippetVariables,
  DeleteSnippetMutationData,
  CombineSnippetConnectionsVariables,
  CombineSnippetConnectionsMutationData,
  GenerateSnippetImageVariables,
  GenerateSnippetImageMutationData
} from '../../../types'

export interface UseSnippetMutationsReturn {
  // Update
  updateSnippet: (projectId: string, snippetId: string, input: UpdateSnippetInput) => Promise<Snippet | null>

  // Delete
  deleteSnippet: (projectId: string, snippetId: string) => Promise<boolean>

  // Combine
  combineSnippets: (projectId: string, snippetId: string) => Promise<Snippet | null>

  // Image generation
  generateImage: (projectId: string, snippetId: string) => Promise<Snippet | null>

  // Batch save (title + fields)
  saveSnippet: (projectId: string, snippetId: string, input: UpdateSnippetInput) => Promise<Snippet | null>
}

/**
 * useSnippetMutations - Consolidate all snippet mutations
 * Handles: GraphQL mutations with error handling and toast notifications
 */
export const useSnippetMutations = (): UseSnippetMutationsReturn => {
  const toast = useToast()

  const { mutate: updateMutation } = useGraphQLMutation<UpdateSnippetMutationData, UpdateSnippetVariables>(UPDATE_SNIPPET)
  const { mutate: deleteMutation } = useGraphQLMutation<DeleteSnippetMutationData, DeleteSnippetVariables>(DELETE_SNIPPET)
  const { mutate: combineMutation } = useGraphQLMutation<CombineSnippetConnectionsMutationData, CombineSnippetConnectionsVariables>(COMBINE_SNIPPET_CONNECTIONS)
  const { mutate: generateImageMutation } = useGraphQLMutation<GenerateSnippetImageMutationData, GenerateSnippetImageVariables>(GENERATE_SNIPPET_IMAGE)

  // Update snippet
  const updateSnippet = useCallback(
    async (projectId: string, snippetId: string, input: UpdateSnippetInput) => {
      try {
        const result = await updateMutation({
          variables: {
            projectId,
            id: snippetId,
            input
          }
        })
        return result?.updateSnippet ?? null
      } catch (error) {
        console.error('Failed to update snippet:', error)
        toast.error('Failed to save snippet', error instanceof Error ? error.message : 'Unknown error')
        throw error
      }
    },
    [updateMutation, toast]
  )

  // Delete snippet
  const deleteSnippet = useCallback(
    async (projectId: string, snippetId: string) => {
      try {
        const result = await deleteMutation({
          variables: {
            projectId,
            id: snippetId
          }
        })
        toast.success('Snippet deleted successfully')
        return result?.deleteSnippet ?? false
      } catch (error) {
        console.error('Failed to delete snippet:', error)
        toast.error('Failed to delete snippet', error instanceof Error ? error.message : 'Unknown error')
        throw error
      }
    },
    [deleteMutation, toast]
  )

  // Combine snippets
  const combineSnippets = useCallback(
    async (projectId: string, snippetId: string) => {
      try {
        const result = await combineMutation({
          variables: {
            projectId,
            snippetId
          }
        })
        toast.success('Successfully combined connected snippets!')
        return result?.combineSnippetConnections ?? null
      } catch (error) {
        console.error('Failed to combine snippets:', error)
        toast.error('Failed to combine', error instanceof Error ? error.message : 'Unknown error')
        throw error
      }
    },
    [combineMutation, toast]
  )

  // Generate image
  const generateImage = useCallback(
    async (projectId: string, snippetId: string) => {
      try {
        const result = await generateImageMutation({
          variables: {
            projectId,
            snippetId
          }
        })
        toast.success('Image generated successfully!')
        return result?.generateSnippetImage ?? null
      } catch (error) {
        console.error('Failed to generate image:', error)
        toast.error('Failed to generate image', error instanceof Error ? error.message : 'Unknown error')
        throw error
      }
    },
    [generateImageMutation, toast]
  )

  // Batch save (shorthand for update + toast)
  const saveSnippet = useCallback(
    async (projectId: string, snippetId: string, input: UpdateSnippetInput) => {
      const result = await updateSnippet(projectId, snippetId, input)
      if (result) {
        toast.success('Changes saved successfully')
      }
      return result
    },
    [updateSnippet, toast]
  )

  return {
    updateSnippet,
    deleteSnippet,
    combineSnippets,
    generateImage,
    saveSnippet
  }
}
