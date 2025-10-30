/**
 * Canvas Handlers Hook
 * Manages all event handlers, mutations, and canvas operations
 */

import { useCallback, useRef, type MutableRefObject } from 'react'
import type { ReactFlowInstance, Node } from 'reactflow'

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
import { mutateWithInvalidate, mutateOptimisticOnly } from '../../../shared/utils/cacheHelpers'
import { useModalStore } from '../../../shared/store/modalStore'
import { useToast } from '../../../shared/store/toastStore'
import { useCanvasStore } from '../store/canvasStore'
import { useOptimisticUpdatesStore } from '../store/optimisticUpdatesStore'

import type {
  Snippet,
  CreateSnippetVariables,
  CreateSnippetMutationData,
  UpdateSnippetVariables,
  UpdateSnippetMutationData,
  CreateConnectionVariables,
  DeleteConnectionVariables,
  CombineSnippetConnectionsVariables,
  GenerateSnippetImageVariables,
  CombineSnippetConnectionsMutationData,
  GenerateSnippetImageMutationData
} from '../../../types'

type SnippetContentChanges = Partial<Pick<Snippet, 'textField1' | 'title'>>

type MeasuredReactFlowNode = Node & {
  measured?: {
    width?: number
    height?: number
  }
  width?: number
  height?: number
}

const getNodeMeasurements = (node: Node | undefined) => {
  if (!node) {
    return { width: undefined as number | undefined, height: undefined as number | undefined }
  }

  const measuredNode = node as MeasuredReactFlowNode

  const height =
    typeof measuredNode.measured?.height === 'number'
      ? measuredNode.measured.height
      : typeof measuredNode.height === 'number'
        ? measuredNode.height
        : undefined

  const width =
    typeof measuredNode.measured?.width === 'number'
      ? measuredNode.measured.width
      : typeof measuredNode.width === 'number'
        ? measuredNode.width
        : undefined

  return { width, height }
}

/**
 * NOTE: findDownstreamSnippets() was removed to fix build errors
 * If you need immediate downstream propagation for textField1 updates,
 * uncomment the code in handleUpdateSnippetContent at lines 355-360
 * and re-implement findDownstreamSnippets with this logic:
 *
 * function findDownstreamSnippets(sourceSnippetId: string, snippets: Snippet[]): Set<string> {
 *   const downstreamIds = new Set<string>()
 *   const visited = new Set<string>()
 *   const queue: string[] = [sourceSnippetId]
 *
 *   while (queue.length > 0) {
 *     const currentId = queue.shift()!
 *     if (visited.has(currentId)) continue
 *     visited.add(currentId)
 *
 *     const currentSnippet = snippets.find(s => s.id === currentId)
 *     if (!currentSnippet) continue
 *
 *     const outgoingConnections = currentSnippet.connections ?? []
 *     for (const connection of outgoingConnections) {
 *       const targetId = connection.targetSnippetId
 *       if (targetId && !visited.has(targetId)) {
 *         downstreamIds.add(targetId)
 *         queue.push(targetId)
 *       }
 *     }
 *   }
 *   return downstreamIds
 * }
 */

export interface UseCanvasHandlersProps {
  projectId: string | undefined
  snippets: Snippet[]
  setNodes: (nodes: any) => void
  reactFlowInstance?: MutableRefObject<ReactFlowInstance | null>
}

export interface UseCanvasHandlersResult {
  // Snippet Handlers
  handleEditSnippet: (snippetId: string) => void
  handleDeleteSnippet: (snippetId: string) => void
  handleManageConnections: (snippetId: string) => void
  handleViewVersions: (snippetId: string) => void
  handleUpdateSnippetContent: (snippetId: string, changes: SnippetContentChanges) => Promise<void>
  handleCombineSnippetContent: (snippetId: string) => Promise<void>
  handleGenerateImage: (snippetId: string, modelId?: string, promptOverride?: string) => void
  handleFocusSnippet: (snippetId: string) => void
  handleCreateUpstreamSnippet: (targetSnippetId: string) => Promise<void>

  // Canvas Operations
  handleCreateSnippet: (position: { x: number; y: number }) => void
  handleSaveCanvas: () => void

  // Mutations
  updateSnippetMutation: (options: { variables: any }) => Promise<any>
  createConnectionMutation: ReturnType<typeof useGraphQLMutation<any, CreateConnectionVariables>>['mutate']
  deleteConnectionMutation: ReturnType<typeof useGraphQLMutation<any, DeleteConnectionVariables>>['mutate']

  // Generated Snippet Handlers
  handleCreateGeneratedSnippet: () => Promise<void>
  handleGenerateTextSnippet: (sourceSnippetId: string, generatedContent: string) => Promise<void>
}

export function useCanvasHandlers({
  projectId,
  snippets,
  setNodes,
  reactFlowInstance
}: UseCanvasHandlersProps): UseCanvasHandlersResult {
  const toast = useToast()
  const {
    openEditSnippet,
  openDeleteSnippet,
  openManageConnections,
  openVersionHistory,
  closeGeneratedSnippetPreview,
  closeEditSnippet,
  generatedSnippetPreview,
  setGeneratedSnippetCreating
} = useModalStore()

  const { setLoading, setGeneratingImage } = useCanvasStore()
  const {
    addOptimisticSnippet,
    replaceOptimisticSnippet,
    removeOptimisticSnippet,
    updateRealSnippet,
    addOptimisticConnection,
    replaceOptimisticConnection,
    removeOptimisticConnection
  } = useOptimisticUpdatesStore()

  // Mutations
  const { mutate: createSnippetMutation } = useGraphQLMutation<CreateSnippetMutationData, CreateSnippetVariables>(CREATE_SNIPPET, {
    onCompleted: () => {
      toast.success('Snippet created successfully!')
      // No refetch needed - optimistic update already shows the snippet
    },
    onError: (error: Error) => {
      console.error('Error creating snippet:', error)
      toast.error('Failed to create snippet', error.message)
    }
  })

  const { mutate: updateSnippetMutation } = useGraphQLMutation<UpdateSnippetMutationData, UpdateSnippetVariables>(UPDATE_SNIPPET, {
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

  const { mutate: generateSnippetImageMutation } = useGraphQLMutation<GenerateSnippetImageMutationData, GenerateSnippetImageVariables>(GENERATE_SNIPPET_IMAGE, {
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
    console.log('[useCanvasHandlers] handleUpdateSnippetContent called:', {
      snippetId,
      changes,
      projectId
    })

    if (!projectId) {
      console.error('Cannot update snippet content: no project ID')
      return
    }

    const snippetBeforeUpdate = snippetsRef.current.find(s => s.id === snippetId)
    if (!snippetBeforeUpdate) {
      console.error('Cannot update snippet content: snippet not found')
      return
    }

    console.log('[useCanvasHandlers] Current snippet state:', {
      id: snippetBeforeUpdate.id,
      textField1: snippetBeforeUpdate.textField1
    })

    const updateInput: SnippetContentChanges = {}
    const previousValues: SnippetContentChanges = {}

    if (Object.prototype.hasOwnProperty.call(changes, 'textField1')) {
      updateInput.textField1 = changes.textField1 ?? ''
      previousValues.textField1 = snippetBeforeUpdate.textField1
      console.log('[useCanvasHandlers] textField1 update prepared:', {
        newValue: updateInput.textField1,
        oldValue: previousValues.textField1
      })
    }

    if (Object.prototype.hasOwnProperty.call(changes, 'title')) {
      updateInput.title = changes.title ?? ''
      previousValues.title = snippetBeforeUpdate.title
      console.log('[useCanvasHandlers] title update prepared:', {
        newValue: updateInput.title,
        oldValue: previousValues.title
      })
    }

    if (Object.keys(updateInput).length === 0) {
      console.log('[useCanvasHandlers] No fields to update, returning early')
      return
    }

    console.log('[useCanvasHandlers] Applying optimistic update and calling mutation')

    const previousSnippetSnapshot: Snippet = { ...snippetBeforeUpdate }
    const updatedSnippet: Snippet = {
      ...snippetBeforeUpdate,
      ...updateInput
    }
    updateRealSnippet(updatedSnippet)

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
      const mutationVariables = {
        projectId,
        id: snippetId,
        input: updateInput
      } as Record<string, unknown> & UpdateSnippetVariables

      console.log('[useCanvasHandlers] Calling updateSnippetMutation with variables:', mutationVariables)

      // Use optimistic-only pattern: mutation already shows changes via optimistic update
      // No cache invalidation needed - we only changed existing fields
      // The stale-while-revalidate cache will refresh in background if needed
      const result = await mutateOptimisticOnly(() =>
        updateSnippetMutation({
          variables: mutationVariables
        })
      )

      console.log('[useCanvasHandlers] Mutation completed, result:', result)
    } catch (error) {
      console.error('Failed to update snippet content:', error)
      updateRealSnippet(previousSnippetSnapshot)
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
  }, [projectId, setNodes, updateSnippetMutation, updateRealSnippet])

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

  const handleGenerateImage = useCallback((snippetId: string, modelId?: string, promptOverride?: string) => {
    void (async () => {
      const snippet = snippetsRef.current.find(s => s.id === snippetId)
      if (!snippet) {
        return
      }

      if (!projectId) {
        console.error('Cannot generate snippet image: no project ID')
        return
      }

      const prompt = (promptOverride ?? snippet.textField1 ?? '').trim()
      if (prompt === '') {
        toast.warning('Please provide prompt content for image generation')
        return
      }

      setGeneratingImage(snippetId, true)

      const baseX = snippet.position?.x ?? 0
      const baseY = snippet.position?.y ?? 0

      let sourceNodeHeight: number = CANVAS_CONSTANTS.ESTIMATED_SNIPPET_HEIGHT
      if (reactFlowInstance?.current && typeof reactFlowInstance.current.getNode === 'function') {
        try {
          const sourceNode = reactFlowInstance.current.getNode(snippetId)
          const { height } = getNodeMeasurements(sourceNode)
          if (typeof height === 'number') {
            sourceNodeHeight = height
          }
        } catch (error) {
          console.error('Failed to get node dimensions:', error)
        }
      }

      const targetPosition = {
        x: baseX,
        y: baseY + sourceNodeHeight + CANVAS_CONSTANTS.GENERATED_SNIPPET_SPACING
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      const now = new Date().toISOString()

      addOptimisticSnippet({
        id: tempId,
        projectId,
        title: 'Generated image snippet',
        textField1: '',
        position: targetPosition,
        tags: [],
        categories: [],
        connections: [],
        createdAt: now,
        updatedAt: now,
        version: 1,
        isOptimistic: true
      })

      setGeneratingImage(tempId, true)

      let createdSnippet: Snippet | null = null
      try {
        // Create snippet - changes list shape, so invalidate
        const creationResult = await mutateWithInvalidate(
          () =>
            createSnippetMutation({
              variables: {
                input: {
                  projectId,
                  title: 'Generated image snippet',
                  textField1: prompt,
                  position: targetPosition,
                  tags: [],
                  categories: []
                }
              }
            }),
          ['ProjectWithSnippets']
        )

        const newSnippet = creationResult?.createSnippet
        if (!newSnippet) {
          throw new Error('Failed to create snippet for image generation')
        }

        createdSnippet = newSnippet

        replaceOptimisticSnippet(tempId, {
          ...newSnippet,
          textField1: ''
        })
        setGeneratingImage(tempId, false)
        setGeneratingImage(newSnippet.id, true)

        const optimisticConnectionId = `temp-conn-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const connectionTimestamp = new Date().toISOString()

        addOptimisticConnection({
          id: optimisticConnectionId,
          projectId,
          sourceSnippetId: snippetId,
          targetSnippetId: newSnippet.id,
          label: '',
          createdAt: connectionTimestamp,
          updatedAt: connectionTimestamp,
          isOptimistic: true
        })

        try {
          // Create connection - changes list shape, so invalidate
          const connectionResult = await mutateWithInvalidate(
            () =>
              createConnectionMutation({
                variables: {
                  input: {
                    projectId,
                    sourceSnippetId: snippetId,
                    targetSnippetId: newSnippet.id,
                    label: ''
                  }
                }
              }),
            ['ProjectConnections']
          )

          const createdConnection = connectionResult?.createConnection
          if (createdConnection) {
            replaceOptimisticConnection(optimisticConnectionId, createdConnection)
          } else {
            console.warn('createConnection mutation returned no data; optimistic connection will remain until refresh')
          }
        } catch (connectionError) {
          console.error('Failed to connect generated image snippet:', connectionError)
          removeOptimisticConnection(optimisticConnectionId)
          toast.error('Failed to connect new image snippet', connectionError instanceof Error ? connectionError.message : 'Unknown error')
        }

        const generationResult = await generateSnippetImageMutation({
          variables: {
            projectId,
            snippetId: newSnippet.id,
            modelId
          }
        })

        const generatedSnippet = generationResult?.generateSnippetImage
        if (!generatedSnippet) {
          throw new Error('Image generation request failed')
        }

        const sanitizedSnippet: Snippet = {
          ...generatedSnippet,
          textField1: ''
        }

        updateRealSnippet(sanitizedSnippet)

        try {
          await updateSnippetMutation({
            variables: {
              projectId,
              id: generatedSnippet.id,
              input: {
                textField1: ''
              }
            }
          })
        } catch (clearError) {
          console.error('Failed to clear generated image prompt:', clearError)
        }

        toast.success('Image generated successfully!')
      } catch (error) {
        console.error('Failed to generate image snippet:', error)

        if (!createdSnippet) {
          removeOptimisticSnippet(tempId)
        }

        const message = error instanceof Error ? error.message : 'Unknown error'
        toast.error('Failed to generate image snippet', message)
      } finally {
        setGeneratingImage(snippetId, false)
        if (createdSnippet) {
          setGeneratingImage(createdSnippet.id, false)
        } else {
          setGeneratingImage(tempId, false)
        }
      }
    })()
  }, [
    addOptimisticSnippet,
    createConnectionMutation,
    createSnippetMutation,
    generateSnippetImageMutation,
    projectId,
    reactFlowInstance,
    replaceOptimisticSnippet,
    setGeneratingImage,
    toast,
    updateSnippetMutation,
    updateRealSnippet,
    removeOptimisticSnippet,
    addOptimisticConnection,
    replaceOptimisticConnection,
    removeOptimisticConnection
  ])

  const handleCreateUpstreamSnippet = useCallback(async (targetSnippetId: string) => {
    if (!projectId) {
      console.error('Cannot create snippet: no project ID')
      return
    }

    const targetSnippet = snippetsRef.current.find(s => s.id === targetSnippetId)
    if (!targetSnippet) {
      console.error('Cannot create snippet: target snippet not found')
      return
    }

    const baseX = targetSnippet.position?.x ?? CANVAS_CONSTANTS.DEFAULT_NODE_POSITION.x
    const baseY = targetSnippet.position?.y ?? CANVAS_CONSTANTS.DEFAULT_NODE_POSITION.y

    let targetWidth: number = CANVAS_CONSTANTS.MIN_NODE_WIDTH
    if (reactFlowInstance?.current && typeof reactFlowInstance.current.getNode === 'function') {
      try {
        const node = reactFlowInstance.current.getNode(targetSnippetId)
        const { width } = getNodeMeasurements(node)
        if (typeof width === 'number' && !Number.isNaN(width)) {
          targetWidth = width
        }
      } catch (error) {
        console.error('Failed to measure target snippet width:', error)
      }
    }

    const horizontalOffset = targetWidth + CANVAS_CONSTANTS.MIN_NODE_WIDTH + CANVAS_CONSTANTS.RELATED_SNIPPET_HORIZONTAL_GAP
    const targetPosition = {
      x: Math.max(0, baseX - horizontalOffset),
      y: baseY
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: 'New snippet',
      textField1: '',
      position: targetPosition,
      tags: [],
      categories: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true
    })

    try {
      // Create snippet - changes list shape, so invalidate
      const creationResult = await mutateWithInvalidate(
        () =>
          createSnippetMutation({
            variables: {
              input: {
                projectId,
                title: 'New snippet',
                textField1: '',
                position: targetPosition,
                tags: [],
                categories: []
              }
            }
          }),
        ['ProjectWithSnippets']
      )

      const createdSnippet = creationResult?.createSnippet
      if (!createdSnippet) {
        throw new Error('Failed to create snippet: missing response data')
      }

      replaceOptimisticSnippet(tempId, createdSnippet)

      const optimisticConnectionId = `temp-conn-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      const connectionTimestamp = new Date().toISOString()

      addOptimisticConnection({
        id: optimisticConnectionId,
        projectId,
        sourceSnippetId: createdSnippet.id,
        targetSnippetId,
        label: '',
        createdAt: connectionTimestamp,
        updatedAt: connectionTimestamp,
        isOptimistic: true
      })

      try {
        // Create connection - changes list shape, so invalidate
        const connectionResult = await mutateWithInvalidate(
          () =>
            createConnectionMutation({
              variables: {
                input: {
                  projectId,
                  sourceSnippetId: createdSnippet.id,
                  targetSnippetId,
                  label: ''
                }
              }
            }),
          ['ProjectConnections']
        )

        const createdConnection = connectionResult?.createConnection
        if (createdConnection) {
          replaceOptimisticConnection(optimisticConnectionId, createdConnection)
        } else {
          console.warn('createConnection mutation returned no data; optimistic connection will remain until refresh')
        }
      } catch (connectionError) {
        console.error('Failed to connect new snippet:', connectionError)
        removeOptimisticConnection(optimisticConnectionId)
        toast.error(
          'Failed to connect new snippet',
          connectionError instanceof Error ? connectionError.message : 'Unknown error'
        )
        return
      }

      toast.success('Snippet created and connected')
    } catch (error) {
      console.error('Failed to create upstream snippet:', error)
      removeOptimisticSnippet(tempId)
      toast.error('Failed to create snippet', error instanceof Error ? error.message : 'Unknown error')
    }
  }, [
    projectId,
    reactFlowInstance,
    addOptimisticSnippet,
    createSnippetMutation,
    replaceOptimisticSnippet,
    createConnectionMutation,
    addOptimisticConnection,
    replaceOptimisticConnection,
    removeOptimisticConnection,
    toast,
    removeOptimisticSnippet
  ])

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
        position,
        tags: [],
        categories: []
      }
    } as Record<string, unknown> & CreateSnippetVariables

    mutateWithInvalidate(
      () => createSnippetMutation({ variables }),
      ['ProjectWithSnippets']
    )
      .then(async (result) => {
        if (result) {
          const createdSnippet = (result as any).createSnippet as Snippet
          // Replace optimistic snippet with real one from server
          replaceOptimisticSnippet(tempId, createdSnippet)
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
  const handleCreateGeneratedSnippet = useCallback(async () => {
    const { isOpen, sourceSnippetId } = generatedSnippetPreview
    if (!isOpen || !sourceSnippetId) {
      return
    }

    if (!projectId) {
      console.error('Cannot create generated snippet: no project ID')
      return
    }

    const sourceSnippet = snippetsRef.current.find(s => s.id === sourceSnippetId)
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
      // Create snippet - changes list shape, so invalidate
      const creationResult = await mutateWithInvalidate(
        () =>
          createSnippetMutation({
            variables: {
              input: {
                projectId,
                title: 'Generated snippet',
                textField1: generatedSnippetPreview.content,
                position: targetPosition,
                tags: [],
                categories: []
              }
            }
          }),
        ['ProjectWithSnippets']
      )

      const createdSnippet = creationResult?.createSnippet
      if (!createdSnippet) {
        throw new Error('Failed to create snippet: missing snippet ID in response')
      }

      const newSnippetId = createdSnippet.id
      // Replace optimistic snippet with real one from server
      replaceOptimisticSnippet(tempId, createdSnippet)

      const optimisticConnectionId = `temp-conn-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      const connectionTimestamp = new Date().toISOString()

      addOptimisticConnection({
        id: optimisticConnectionId,
        projectId,
        sourceSnippetId,
        targetSnippetId: newSnippetId,
        label: '',
        createdAt: connectionTimestamp,
        updatedAt: connectionTimestamp,
        isOptimistic: true
      })

      try {
        // Create connection - changes list shape, so invalidate
        const connectionResult = await mutateWithInvalidate(
          () =>
            createConnectionMutation({
              variables: {
                input: {
                  projectId,
                  sourceSnippetId,
                  targetSnippetId: newSnippetId,
                  label: ''
                }
              }
            }),
          ['ProjectConnections']
        )

        const createdConnection = connectionResult?.createConnection
        if (createdConnection) {
          replaceOptimisticConnection(optimisticConnectionId, createdConnection)
        } else {
          console.warn('createConnection mutation returned no data; optimistic connection will remain until refresh')
        }
      } catch (connectionError) {
        removeOptimisticConnection(optimisticConnectionId)
        throw connectionError
      }

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
    addOptimisticConnection,
    replaceOptimisticConnection,
    removeOptimisticConnection
  ])

  // Handler for creating snippet from text generation
  const handleGenerateTextSnippet = useCallback(async (sourceSnippetId: string, generatedContent: string) => {
    if (!projectId) {
      console.error('Cannot create generated text snippet: no project ID')
      return
    }

    const sourceSnippet = snippetsRef.current.find(s => s.id === sourceSnippetId)
    const baseX = sourceSnippet?.position?.x ?? 0
    const baseY = sourceSnippet?.position?.y ?? 0

    // Try to get actual node height from React Flow, fallback to estimated height
    let sourceNodeHeight: number = CANVAS_CONSTANTS.ESTIMATED_SNIPPET_HEIGHT
    if (reactFlowInstance?.current && typeof reactFlowInstance.current.getNode === 'function') {
      try {
        const sourceNode = reactFlowInstance.current.getNode(sourceSnippetId)
        const { height } = getNodeMeasurements(sourceNode)
        if (typeof height === 'number') {
          sourceNodeHeight = height
        }
      } catch (error) {
        // If getting node fails, use estimated height
        console.error('Failed to get node dimensions:', error)
      }
    }

    // Position new snippet below source with 20px spacing
    const targetPosition = {
      x: baseX,
      y: baseY + sourceNodeHeight + CANVAS_CONSTANTS.GENERATED_SNIPPET_SPACING
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    // Add optimistic snippet immediately
    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: 'Generated text snippet',
      textField1: generatedContent,
      position: targetPosition,
      tags: [],
      categories: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true
    })

    try {
      // Create snippet - changes list shape, so invalidate
      const creationResult = await mutateWithInvalidate(
        () =>
          createSnippetMutation({
            variables: {
              input: {
                projectId,
                title: 'Generated text snippet',
                textField1: generatedContent,
                position: targetPosition,
                tags: [],
                categories: []
              }
            }
          }),
        ['ProjectWithSnippets']
      )

      const createdSnippet = creationResult?.createSnippet
      if (!createdSnippet) {
        throw new Error('Failed to create snippet: missing snippet ID in response')
      }

      const newSnippetId = createdSnippet.id
      // Replace optimistic snippet with real one from server
      replaceOptimisticSnippet(tempId, createdSnippet)

      const optimisticConnectionId = `temp-conn-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      const connectionTimestamp = new Date().toISOString()

      addOptimisticConnection({
        id: optimisticConnectionId,
        projectId,
        sourceSnippetId,
        targetSnippetId: newSnippetId,
        label: '',
        createdAt: connectionTimestamp,
        updatedAt: connectionTimestamp,
        isOptimistic: true
      })

      try {
        // Create connection - changes list shape, so invalidate
        const connectionResult = await mutateWithInvalidate(
          () =>
            createConnectionMutation({
              variables: {
                input: {
                  projectId,
                  sourceSnippetId,
                  targetSnippetId: newSnippetId,
                  label: ''
                }
              }
            }),
          ['ProjectConnections']
        )

        const createdConnection = connectionResult?.createConnection
        if (createdConnection) {
          replaceOptimisticConnection(optimisticConnectionId, createdConnection)
        } else {
          console.warn('createConnection mutation returned no data; optimistic connection will remain until refresh')
        }
      } catch (connectionError) {
        console.error('Failed to connect generated text snippet:', connectionError)
        removeOptimisticConnection(optimisticConnectionId)
        toast.error('Failed to connect new text snippet', connectionError instanceof Error ? connectionError.message : 'Unknown error')
      }

      toast.success('Generated text snippet created successfully!')
    } catch (error) {
      console.error('Failed to create generated text snippet:', error)
      // Remove optimistic snippet on failure
      removeOptimisticSnippet(tempId)
      toast.error('Failed to create snippet', error instanceof Error ? error.message : 'Unknown error')
    }
  }, [
    projectId,
    createSnippetMutation,
    createConnectionMutation,
    addOptimisticSnippet,
    replaceOptimisticSnippet,
    removeOptimisticSnippet,
    addOptimisticConnection,
    replaceOptimisticConnection,
    removeOptimisticConnection,
    toast,
    reactFlowInstance
  ])

  // Focus on a snippet: center and zoom to make it take ~80% of viewport height
  const handleFocusSnippet = useCallback((snippetId: string) => {
    if (!reactFlowInstance?.current || typeof reactFlowInstance.current.getNode !== 'function') {
      console.error('Cannot focus snippet: ReactFlow instance not available')
      return
    }

    try {
      const node = reactFlowInstance.current.getNode(snippetId)
      if (!node) {
        console.error('Cannot focus snippet: node not found')
        return
      }

      // Get viewport dimensions
      const viewportElement = document.querySelector('.react-flow__viewport')
      if (!viewportElement) {
        console.error('Cannot focus snippet: viewport element not found')
        return
      }

      const viewportHeight = viewportElement.parentElement?.clientHeight ?? 600

      // Get node dimensions (measured or estimated)
      const { height, width } = getNodeMeasurements(node)
      const nodeHeight = height ?? CANVAS_CONSTANTS.ESTIMATED_SNIPPET_HEIGHT
      const nodeWidth = width ?? 250

      // Calculate zoom level to make snippet take 80% of viewport height
      const targetZoom = (viewportHeight * 0.8) / nodeHeight

      // Clamp zoom between reasonable bounds (0.5x to 2x)
      const clampedZoom = Math.max(0.5, Math.min(2, targetZoom))

      // Get node center coordinates
      const nodeCenterX = node.position.x + nodeWidth / 2
      const nodeCenterY = node.position.y + nodeHeight / 2

      // Animate to center and zoom
      reactFlowInstance.current.setCenter(nodeCenterX, nodeCenterY, {
        zoom: clampedZoom,
        duration: 400
      })
    } catch (error) {
      console.error('Failed to focus on snippet:', error)
    }
  }, [reactFlowInstance])

  return {
    // Snippet Handlers
    handleEditSnippet,
    handleDeleteSnippet,
    handleManageConnections,
    handleViewVersions,
    handleUpdateSnippetContent,
    handleCombineSnippetContent,
    handleGenerateImage,
    handleCreateUpstreamSnippet,
    handleFocusSnippet,

    // Canvas Operations
    handleCreateSnippet,
    handleSaveCanvas,

    // Mutations
    updateSnippetMutation,
    createConnectionMutation,
    deleteConnectionMutation,

    // Generated Snippet Handlers
    handleCreateGeneratedSnippet,
    handleGenerateTextSnippet
  }
}
