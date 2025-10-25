/**
 * Canvas Handlers Hook
 * Manages all event handlers, mutations, and canvas operations
 */

import { useCallback, useRef } from 'react'

import {
  CREATE_SNIPPET,
  UPDATE_SNIPPET,
  CREATE_CONNECTION,
  DELETE_CONNECTION,
  COMBINE_SNIPPET_CONNECTIONS,
  GENERATE_SNIPPET_IMAGE
} from '../../../graphql/mutations'
import { useGraphQLMutation } from '../../../hooks/useGraphQLMutation'
import { CANVAS_CONSTANTS } from '../../../shared/constants'
import { useModalStore } from '../../../shared/store/modalStore'
import { useToast } from '../../../shared/store/toastStore'
import { useCanvasStore } from '../store/canvasStore'
import { useOptimisticUpdatesStore } from '../store/optimisticUpdatesStore'

import type {
  Snippet,
  CreateSnippetVariables,
  UpdateSnippetVariables,
  CreateConnectionVariables,
  DeleteConnectionVariables,
  CombineSnippetConnectionsVariables,
  GenerateSnippetImageVariables,
  CombineSnippetConnectionsMutationData
} from '../../../types'

type SnippetContentChanges = Partial<Pick<Snippet, 'textField1' | 'textField2'>>

export interface UseCanvasHandlersProps {
  projectId: string | undefined
  snippets: Snippet[]
  setNodes: (nodes: any) => void
  refetch: () => Promise<void>
}

export interface UseCanvasHandlersResult {
  // Snippet Handlers
  handleEditSnippet: (snippetId: string) => void
  handleDeleteSnippet: (snippetId: string) => void
  handleManageConnections: (snippetId: string) => void
  handleViewVersions: (snippetId: string) => void
  handleUpdateSnippetContent: (snippetId: string, changes: SnippetContentChanges) => Promise<void>
  handleCombineSnippetContent: (snippetId: string) => Promise<void>
  handleGenerateImage: (snippetId: string, modelId?: string) => void

  // Canvas Operations
  handleCreateSnippet: (position: { x: number; y: number }) => void
  handleSaveCanvas: () => void

  // Mutations
  updateSnippetMutation: (options: { variables: any }) => Promise<any>
  createConnectionMutation: ReturnType<typeof useGraphQLMutation<any, CreateConnectionVariables>>['mutate']
  deleteConnectionMutation: ReturnType<typeof useGraphQLMutation<any, DeleteConnectionVariables>>['mutate']

  // Generated Snippet Handlers
  handlePreviewGeneratedSnippet: (payload: { sourceSnippetId: string; generatedText: string }) => void
  handleCancelGeneratedSnippet: () => void
  handleCreateGeneratedSnippet: () => Promise<void>
}

export function useCanvasHandlers({
  projectId,
  snippets,
  setNodes,
  refetch
}: UseCanvasHandlersProps): UseCanvasHandlersResult {
  const toast = useToast()
  const {
    openEditSnippet,
    openDeleteSnippet,
    openManageConnections,
    openVersionHistory,
    openGeneratedSnippetPreview,
    closeGeneratedSnippetPreview,
    closeEditSnippet,
    generatedSnippetPreview,
    setGeneratedSnippetCreating
  } = useModalStore()

  const { setLoading, setGeneratingImage } = useCanvasStore()
  const {
    addOptimisticSnippet,
    replaceOptimisticSnippet,
    removeOptimisticSnippet
  } = useOptimisticUpdatesStore()

  // Mutations
  const { mutate: createSnippetMutation } = useGraphQLMutation(CREATE_SNIPPET, {
    onCompleted: () => {
      toast.success('Snippet created successfully!')
      // No refetch needed - optimistic update already shows the snippet
    },
    onError: (error: Error) => {
      console.error('Error creating snippet:', error)
      toast.error('Failed to create snippet', error.message)
    }
  })

  const { mutate: updateSnippetMutation } = useGraphQLMutation(UPDATE_SNIPPET, {
    onError: (error: Error) => {
      console.error('Error updating snippet:', error)
    }
  })

  const { mutate: createConnectionMutation } = useGraphQLMutation<any, CreateConnectionVariables>(CREATE_CONNECTION, {
    onCompleted: () => {
      toast.success('Connection created successfully!')
    },
    onError: (error: Error) => {
      console.error('Error creating connection:', error)
      toast.error('Failed to create connection', error.message)
    }
  })

  const { mutate: deleteConnectionMutation } = useGraphQLMutation<any, DeleteConnectionVariables>(DELETE_CONNECTION, {
    onCompleted: () => {
      toast.success('Connection deleted successfully!')
    },
    onError: (error: Error) => {
      console.error('Error deleting connection:', error)
      toast.error('Failed to delete connection', error.message)
    }
  })

  const { mutate: combineConnectionsMutation } = useGraphQLMutation<
    CombineSnippetConnectionsMutationData,
    CombineSnippetConnectionsVariables
  >(COMBINE_SNIPPET_CONNECTIONS, {
    onError: (error: Error) => {
      console.error('Error combining snippets:', error)
    }
  })

  const { mutate: generateSnippetImageMutation } = useGraphQLMutation<any, GenerateSnippetImageVariables>(GENERATE_SNIPPET_IMAGE, {
    onError: (error: Error) => {
      console.error('Error generating snippet image:', error)
    }
  })

  // Snippet Handlers - Using useRef to avoid recreating functions when snippets array changes
  const snippetsRef = useRef<Snippet[]>(snippets)
  snippetsRef.current = snippets

  const handleEditSnippet = useCallback((snippetId: string) => {
    const snippet = snippetsRef.current.find(s => s.id === snippetId)
    if (snippet) openEditSnippet(snippet)
  }, [openEditSnippet])

  const handleDeleteSnippet = useCallback((snippetId: string) => {
    const snippet = snippetsRef.current.find(s => s.id === snippetId)
    if (snippet) openDeleteSnippet(snippet)
  }, [openDeleteSnippet])

  const handleManageConnections = useCallback((snippetId: string) => {
    const snippet = snippetsRef.current.find(s => s.id === snippetId)
    if (snippet) openManageConnections(snippet)
  }, [openManageConnections])

  const handleViewVersions = useCallback((snippetId: string) => {
    const snippet = snippetsRef.current.find(s => s.id === snippetId)
    if (snippet) openVersionHistory(snippet)
  }, [openVersionHistory])

  const handleUpdateSnippetContent = useCallback(async (
    snippetId: string,
    changes: SnippetContentChanges
  ) => {
    if (!projectId) {
      console.error('Cannot update snippet content: no project ID')
      return
    }

    const snippetBeforeUpdate = snippetsRef.current.find(s => s.id === snippetId)
    if (!snippetBeforeUpdate) {
      console.error('Cannot update snippet content: snippet not found')
      return
    }

    const updateInput: SnippetContentChanges = {}
    const previousValues: SnippetContentChanges = {}

    if (Object.prototype.hasOwnProperty.call(changes, 'textField1')) {
      updateInput.textField1 = changes.textField1 ?? ''
      previousValues.textField1 = snippetBeforeUpdate.textField1
    }

    if (Object.prototype.hasOwnProperty.call(changes, 'textField2')) {
      updateInput.textField2 = changes.textField2 ?? ''
      previousValues.textField2 = snippetBeforeUpdate.textField2
    }

    if (Object.keys(updateInput).length === 0) {
      return
    }

    // Optimistic update
    setNodes((currentNodes: any) =>
      currentNodes.map((node: any) =>
        node.id === snippetId
          ? {
              ...node,
              data: {
                ...node.data,
                snippet: {
                  ...node.data.snippet,
                  ...updateInput
                }
              }
            }
          : node
      )
    )

    try {
      await updateSnippetMutation({
        variables: {
          projectId,
          id: snippetId,
          input: updateInput
        } as Record<string, unknown> & UpdateSnippetVariables
      })
      // Refetch to ensure snippets array is updated with latest data
      await refetch()
    } catch (error) {
      console.error('Failed to update snippet content:', error)
      // Rollback optimistic update
      setNodes((currentNodes: any) =>
        currentNodes.map((node: any) =>
          node.id === snippetId
            ? {
                ...node,
                data: {
                  ...node.data,
                  snippet: {
                    ...node.data.snippet,
                    ...previousValues
                  }
                }
              }
            : node
        )
      )
      throw error
    }
  }, [projectId, setNodes, updateSnippetMutation, refetch])

  const handleCombineSnippetContent = useCallback(async (snippetId: string) => {
    if (!projectId) {
      console.error('Cannot combine snippet content: no project ID')
      return
    }

    const snippetBeforeCombine = snippetsRef.current.find(s => s.id === snippetId)
    if (!snippetBeforeCombine) {
      console.error('Cannot combine snippet content: snippet not found')
      return
    }

    try {
      const result = await combineConnectionsMutation({
        variables: {
          projectId,
          snippetId
        }
      })

      const updatedSnippet = result?.combineSnippetConnections
      if (!updatedSnippet) {
        throw new Error('No data returned from combine operation')
      }

      // Update node with combined data
      setNodes((currentNodes: any) =>
        currentNodes.map((node: any) =>
          node.id === snippetId
            ? {
                ...node,
                data: {
                  ...node.data,
                  snippet: {
                    ...node.data.snippet,
                    textField1: updatedSnippet.textField1,
                    textField2: updatedSnippet.textField2,
                    connectionCount: node.data.snippet.connectionCount
                  }
                }
              }
            : node
        )
      )
    } catch (error) {
      console.error('Failed to combine snippet content:', error)
      throw error
    }
  }, [combineConnectionsMutation, projectId, setNodes])

  const handleGenerateImage = useCallback((snippetId: string, modelId?: string) => {
    const snippet = snippetsRef.current.find(s => s.id === snippetId)
    if (!snippet) return

    if (!projectId) {
      console.error('Cannot generate snippet image: no project ID')
      return
    }

    const prompt = snippet.textField1?.trim() ?? ''
    if (prompt === '') {
      toast.warning('Please provide input in Text Field 1 for image generation')
      return
    }

    setGeneratingImage(snippetId, true)

    generateSnippetImageMutation({
      variables: {
        projectId,
        snippetId,
        modelId
      }
    })
      .then(() => {
        toast.success('Image generated successfully!')
      })
      .catch((error: Error) => {
        console.error('Error generating snippet image:', error)
        toast.error('Failed to generate image', error.message)
      })
      .finally(() => {
        setGeneratingImage(snippetId, false)
      })
  }, [generateSnippetImageMutation, projectId, toast, setGeneratingImage])

  // Canvas Operations
  const handleCreateSnippet = useCallback((position: { x: number; y: number }) => {
    if (!projectId) {
      console.error('Cannot create snippet: no project ID')
      return
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    // Add optimistic snippet immediately
    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: 'New snippet',
      textField1: '',
      textField2: '',
      position,
      tags: [],
      categories: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true
    })

    const variables = {
      input: {
        projectId,
        title: 'New snippet',
        textField1: '',
        textField2: '',
        position,
        tags: [],
        categories: []
      }
    } as Record<string, unknown> & CreateSnippetVariables

    createSnippetMutation({ variables })
      .then((result) => {
        if (result) {
          const createdSnippet = (result as any).createSnippet as Snippet
          // Replace optimistic snippet with real one from server
          replaceOptimisticSnippet(tempId, createdSnippet)
          // No refetch needed - the real snippet is now in the store
        }
      })
      .catch((error) => {
        console.error('Failed to create snippet:', error)
        // Remove optimistic snippet on failure
        removeOptimisticSnippet(tempId)
      })
  }, [projectId, createSnippetMutation, addOptimisticSnippet, replaceOptimisticSnippet, removeOptimisticSnippet])

  const handleSaveCanvas = useCallback(() => {
    setLoading(true)
    // For now, just simulate saving
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }, [setLoading])

  // Generated Snippet Handlers
  const handlePreviewGeneratedSnippet = useCallback((payload: { sourceSnippetId: string; generatedText: string }) => {
    openGeneratedSnippetPreview(payload.sourceSnippetId, payload.generatedText)
  }, [openGeneratedSnippetPreview])

  const handleCancelGeneratedSnippet = useCallback(() => {
    closeGeneratedSnippetPreview()
  }, [closeGeneratedSnippetPreview])

  const handleCreateGeneratedSnippet = useCallback(async () => {
    if (!generatedSnippetPreview.isOpen || !generatedSnippetPreview.sourceSnippetId) {
      return
    }

    if (!projectId) {
      console.error('Cannot create generated snippet: no project ID')
      return
    }

    const sourceSnippet = snippetsRef.current.find(s => s.id === generatedSnippetPreview.sourceSnippetId)
    const baseX = sourceSnippet?.position?.x ?? 0
    const baseY = sourceSnippet?.position?.y ?? 0
    const targetPosition = {
      x: baseX,
      y: baseY + CANVAS_CONSTANTS.GENERATED_SNIPPET_VERTICAL_OFFSET
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    // Add optimistic snippet immediately
    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: 'Generated snippet',
      textField1: generatedSnippetPreview.content,
      textField2: '',
      position: targetPosition,
      tags: [],
      categories: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true
    })

    // Close modals immediately for better UX
    closeGeneratedSnippetPreview()
    closeEditSnippet()

    setGeneratedSnippetCreating(true)
    try {
      const creationResult = await createSnippetMutation({
        variables: {
          input: {
            projectId,
            title: 'Generated snippet',
            textField1: generatedSnippetPreview.content,
            textField2: '',
            position: targetPosition,
            tags: [],
            categories: []
          }
        }
      })

      const newSnippetId = creationResult ? (creationResult as any).createSnippet.id : null
      if (!newSnippetId) {
        throw new Error('Failed to create snippet: missing snippet ID in response')
      }

      const createdSnippet = (creationResult as any).createSnippet as Snippet
      // Replace optimistic snippet with real one from server
      replaceOptimisticSnippet(tempId, createdSnippet)

      await createConnectionMutation({
        variables: {
          input: {
            projectId,
            sourceSnippetId: generatedSnippetPreview.sourceSnippetId,
            targetSnippetId: newSnippetId,
            label: ''
          }
        }
      })

      // Refetch only connections to update the edges
      await refetch()
      toast.success('Generated snippet created successfully!')
    } catch (error) {
      console.error('Failed to create generated snippet:', error)
      // Remove optimistic snippet on failure
      removeOptimisticSnippet(tempId)
      toast.error('Failed to create snippet or connection', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setGeneratedSnippetCreating(false)
    }
  }, [
    createSnippetMutation,
    createConnectionMutation,
    generatedSnippetPreview,
    projectId,
    toast,
    setGeneratedSnippetCreating,
    closeGeneratedSnippetPreview,
    closeEditSnippet,
    addOptimisticSnippet,
    replaceOptimisticSnippet,
    removeOptimisticSnippet,
    refetch
  ])

  return {
    // Snippet Handlers
    handleEditSnippet,
    handleDeleteSnippet,
    handleManageConnections,
    handleViewVersions,
    handleUpdateSnippetContent,
    handleCombineSnippetContent,
    handleGenerateImage,

    // Canvas Operations
    handleCreateSnippet,
    handleSaveCanvas,

    // Mutations
    updateSnippetMutation,
    createConnectionMutation,
    deleteConnectionMutation,

    // Generated Snippet Handlers
    handlePreviewGeneratedSnippet,
    handleCancelGeneratedSnippet,
    handleCreateGeneratedSnippet
  }
}

