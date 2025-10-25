import { useCallback, useState } from 'react'
import { CREATE_CONNECTION, DELETE_CONNECTION } from '../../../graphql/mutations'
import { useGraphQLMutation } from '../../../hooks/useGraphQLMutation'
import { useToast } from '../../../shared/store/toastStore'
import type { Connection } from '../../../types'

interface CreateConnectionInput {
  projectId: string
  sourceSnippetId: string
  targetSnippetId: string
  label?: string | null
}

export interface UseConnectionManagementReturn {
  createConnection: (input: CreateConnectionInput) => Promise<Connection | null>
  deleteConnection: (projectId: string, connectionId: string) => Promise<boolean>
  isCreating: boolean
  isDeleting: boolean
}

/**
 * useConnectionManagement - Manage connection CRUD operations
 * Handles: creating, deleting connections with validation and error handling
 */
export const useConnectionManagement = (): UseConnectionManagementReturn => {
  const toast = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { mutate: createMutation } = useGraphQLMutation(CREATE_CONNECTION)
  const { mutate: deleteMutation } = useGraphQLMutation(DELETE_CONNECTION)

  const createConnection = useCallback(
    async (input: CreateConnectionInput) => {
      if (!input.targetSnippetId.trim()) {
        toast.warning('Please enter a target snippet ID')
        return null
      }

      if (input.sourceSnippetId === input.targetSnippetId) {
        toast.warning('Cannot create connection to the same snippet')
        return null
      }

      setIsCreating(true)
      try {
        const trimmedLabel = input.label?.trim() || null
        const result = await createMutation({
          variables: {
            input: {
              projectId: input.projectId,
              sourceSnippetId: input.sourceSnippetId,
              targetSnippetId: input.targetSnippetId,
              label: trimmedLabel
            }
          }
        })

        toast.success('Connection created successfully')
        return (result as any)?.createConnection || null
      } catch (error) {
        console.error('Failed to create connection:', error)
        toast.error('Failed to create connection', error instanceof Error ? error.message : 'Unknown error')
        throw error
      } finally {
        setIsCreating(false)
      }
    },
    [createMutation, toast]
  )

  const deleteConnection = useCallback(
    async (projectId: string, connectionId: string) => {
      const shouldDelete = window.confirm('Are you sure you want to delete this connection?')
      if (!shouldDelete) return false

      setIsDeleting(true)
      try {
        const result = await deleteMutation({
          variables: {
            projectId,
            connectionId
          }
        })

        toast.success('Connection deleted successfully')
        return (result as any)?.deleteConnection || false
      } catch (error) {
        console.error('Failed to delete connection:', error)
        toast.error('Failed to delete connection', error instanceof Error ? error.message : 'Unknown error')
        throw error
      } finally {
        setIsDeleting(false)
      }
    },
    [deleteMutation, toast]
  )

  return {
    createConnection,
    deleteConnection,
    isCreating,
    isDeleting
  }
}
