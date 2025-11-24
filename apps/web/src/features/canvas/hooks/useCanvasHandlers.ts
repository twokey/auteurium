/**
 * Canvas Handlers Hook
 * Manages all event handlers, mutations, and canvas operations
 */

import { useCallback, useRef } from 'react'

import { CANVAS_CONSTANTS } from '../../../constants'
import {
  COMBINE_SNIPPET_CONNECTIONS,
  CREATE_CONNECTION,
  CREATE_SNIPPET,
  DELETE_CONNECTION,
  GENERATE_SNIPPET_IMAGE,
  GENERATE_SNIPPET_VIDEO,
  UPDATE_SNIPPET
} from '../../../graphql/mutations'
import { useGraphQLMutation } from '../../../hooks/useGraphQLMutation'
import { useModalStore } from '../../../store/modalStore'
import { useToast } from '../../../store/toastStore'
import { mutateWithInvalidate, mutateOptimisticOnly } from '../../../utils/cacheHelpers'
import { getColumnIndex, getRelativeColumnX, snapToColumn } from '../../../utils/columnLayout'
import { getPrimaryTextValue } from '../../../utils/snippetContent'
import { buildDefaultVideoContent } from '../../../utils/videoSnippetContent'
import { buildDefaultImageContent } from '../../../utils/imageSnippetContent'
import { useCanvasStore } from '../store/canvasStore'
import { useOptimisticUpdatesStore } from '../store/optimisticUpdatesStore'

import type {
  CombineSnippetConnectionsMutationData,
  CombineSnippetConnectionsVariables,
  CreateConnectionMutationData,
  CreateConnectionVariables,
  CreateSnippetMutationData,
  CreateSnippetVariables,
  DeleteConnectionMutationData,
  DeleteConnectionVariables,
  GenerateSnippetImageMutationData,
  GenerateSnippetImageVariables,
  GenerateSnippetVideoMutationData,
  GenerateSnippetVideoVariables,
  Snippet,
  SnippetField,
  UpdateSnippetMutationData,
  UpdateSnippetVariables,
  GeneratedVideoSnippetData,
  VideoGenerationInput
} from '../../../types'
import type { MutableRefObject } from 'react'
import type { Node, ReactFlowInstance } from 'reactflow'

// Custom ReactFlow node data type
interface SnippetNodeData {
  snippet: Snippet
}

type SnippetContentChanges = Partial<{
  title: string
  content: Record<string, SnippetField | null>
}>

type SnippetGenerationMeta = {
  prompt?: string
  generationId?: string | null
  generationCreatedAt?: string | null
}

const buildPromptOnlyContent = (prompt: string): Record<string, SnippetField> => ({
  prompt: {
    label: 'Prompt',
    value: prompt,
    type: 'longText',
    isSystem: true,
    order: 0
  }
})

const buildDefaultContent = (text = '', options?: { prompt?: string }): Record<string, SnippetField> => {
  const hasText = typeof text === 'string' && text.trim() !== ''
  const content: Record<string, SnippetField> = {}

  if (options?.prompt) {
    content.prompt = {
      label: 'Prompt',
      value: options.prompt,
      type: 'longText',
      isSystem: true,
      order: 0
    }
  }

  if (hasText) {
    content.mainText = {
      label: 'mainText',
      value: text,
      type: 'longText',
      isSystem: true,
      order: 1
    }
  }

  return content
}

const applyContentUpdates = (
  currentContent: Record<string, SnippetField>,
  updates: Record<string, SnippetField | null>
): Record<string, SnippetField> => {
  const nextContent = { ...currentContent }

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null) {
      delete nextContent[key]
      return
    }

    nextContent[key] = {
      ...(currentContent[key] ?? {}),
      ...value
    }
  })

  return nextContent
}

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

export interface UseCanvasHandlersProps {
  projectId: string | undefined
  snippets: Snippet[]
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void
  reactFlowInstance?: MutableRefObject<ReactFlowInstance | null>
}

export interface UseCanvasHandlersResult {
  // Snippet Handlers
  handleEditSnippet: (snippetId: string) => void
  handleDeleteSnippet: (snippetId: string) => void
  handleDeleteMultiple: (snippetIds: string[]) => void
  handleConnectMultiple: (snippetIds: string[]) => Promise<void>
  handleManageConnections: (snippetId: string) => void
  handleViewVersions: (snippetId: string) => void
  handleUpdateSnippetContent: (snippetId: string, changes: SnippetContentChanges) => Promise<void>
  handleCombineSnippetContent: (snippetId: string) => Promise<void>
  handleGenerateImage: (
    snippetId: string,
    modelId?: string,
    promptOverride?: string,
    meta?: SnippetGenerationMeta
  ) => void
  handleGenerateVideo: (snippetId: string, options: VideoGenerationInput) => Promise<void>
  handleFocusSnippet: (snippetId: string) => void
  handleCreateUpstreamSnippet: (targetSnippetId: string) => Promise<void>
  handleNumberKeyNavigation: (key: string) => void

  // Canvas Operations
  handleCreateSnippet: (position: { x: number; y: number }) => void
  handleCreateVideoSnippet: (position: { x: number; y: number }) => void
  handleCreateImageSnippet: (position: { x: number; y: number }) => void
  handleSaveCanvas: () => void

  // Mutations
  updateSnippetMutation: (options: { variables: UpdateSnippetVariables }) => Promise<UpdateSnippetMutationData | null>
  createConnectionMutation: ReturnType<typeof useGraphQLMutation<CreateConnectionMutationData, CreateConnectionVariables>>['mutate']
  deleteConnectionMutation: ReturnType<typeof useGraphQLMutation<DeleteConnectionMutationData, DeleteConnectionVariables>>['mutate']

  // Generated Snippet Handlers
  handleCreateGeneratedSnippet: () => Promise<void>
  handleGenerateTextSnippet: (
    sourceSnippetId: string,
    generatedContent: string,
    meta?: SnippetGenerationMeta
  ) => Promise<void>
  handleGenerateVideoSnippetFromJson: (
    sourceSnippetId: string,
    data: GeneratedVideoSnippetData,
    meta?: SnippetGenerationMeta
  ) => Promise<void>
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
    openDeleteMultipleSnippets,
    openManageConnections,
    openVersionHistory,
    closeGeneratedSnippetPreview,
    closeEditSnippet,
    generatedSnippetPreview,
    setGeneratedSnippetCreating
  } = useModalStore()

  const { setLoading, setGeneratingImage, setGeneratingVideo } = useCanvasStore()
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

  const { mutate: createConnectionMutation } = useGraphQLMutation<CreateConnectionMutationData, CreateConnectionVariables>(CREATE_CONNECTION, {
    onCompleted: () => {
      toast.success('Connection created successfully!')
    },
    onError: (error: Error) => {
      console.error('Error creating connection:', error)
      toast.error('Failed to create connection', error.message)
    }
  })

  const { mutate: deleteConnectionMutation } = useGraphQLMutation<DeleteConnectionMutationData, DeleteConnectionVariables>(DELETE_CONNECTION, {
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

  const { mutate: generateSnippetVideoMutation } = useGraphQLMutation<GenerateSnippetVideoMutationData, GenerateSnippetVideoVariables>(GENERATE_SNIPPET_VIDEO, {
    onError: (error: Error) => {
      console.error('Error generating snippet video:', error)
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

  const handleDeleteMultiple = useCallback((snippetIds: string[]) => {
    if (!projectId || snippetIds.length === 0) return

    const snippetsToDelete = snippetsRef.current.filter(s => snippetIds.includes(s.id))
    if (snippetsToDelete.length > 0) {
      openDeleteMultipleSnippets(snippetsToDelete, projectId)
    }
  }, [projectId, openDeleteMultipleSnippets])

  const handleConnectMultiple = useCallback(async (snippetIds: string[]) => {
    if (!projectId || snippetIds.length === 0) {
      console.error('Cannot connect snippets: no project ID or empty selection')
      return
    }

    const selectedSnippets = snippetsRef.current.filter(s => snippetIds.includes(s.id))
    if (selectedSnippets.length === 0) {
      console.error('Cannot connect snippets: no snippets found')
      return
    }

    // Calculate position for new snippet
    // X: Rightmost column + 1
    const columnIndices = selectedSnippets.map(s =>
      getColumnIndex(s.position?.x ?? CANVAS_CONSTANTS.DEFAULT_NODE_POSITION.x)
    )
    const rightmostColumn = Math.max(...columnIndices)
    const newX = getRelativeColumnX(rightmostColumn, 1)

    // Y: Average Y position of selected snippets
    const avgY = selectedSnippets.reduce((sum, s) =>
      sum + (s.position?.y ?? CANVAS_CONSTANTS.DEFAULT_NODE_POSITION.y), 0
    ) / selectedSnippets.length

    const targetPosition = {
      x: newX,
      y: avgY
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    // Add optimistic snippet
    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: 'New snippet',
      content: buildDefaultContent(''),
      position: targetPosition,
      tags: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true,
      generated: false
    })

    try {
      // Create snippet
      const creationResult = await mutateWithInvalidate(
        () =>
          createSnippetMutation({
            variables: {
              input: {
                projectId,
                title: 'New snippet',
                content: buildDefaultContent(''),
                position: targetPosition,
                tags: [],
                generated: false
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

      // Create connections FROM each selected snippet TO the new snippet
      let successCount = 0
      let failCount = 0

      for (const sourceSnippet of selectedSnippets) {
        const optimisticConnectionId = `temp-conn-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const connectionTimestamp = new Date().toISOString()

        addOptimisticConnection({
          id: optimisticConnectionId,
          projectId,
          sourceSnippetId: sourceSnippet.id,
          targetSnippetId: createdSnippet.id,
          label: '',
          createdAt: connectionTimestamp,
          updatedAt: connectionTimestamp,
          isOptimistic: true
        })

        try {
          const connectionResult = await mutateWithInvalidate(
            () =>
              createConnectionMutation({
                variables: {
                  input: {
                    projectId,
                    sourceSnippetId: sourceSnippet.id,
                    targetSnippetId: createdSnippet.id,
                    label: ''
                  }
                }
              }),
            ['ProjectConnections']
          )

          const createdConnection = connectionResult?.createConnection
          if (createdConnection) {
            replaceOptimisticConnection(optimisticConnectionId, createdConnection)
            successCount++
          } else {
            console.warn('createConnection mutation returned no data; optimistic connection will remain until refresh')
            successCount++
          }
        } catch (connectionError) {
          console.error('Failed to create connection:', connectionError)
          removeOptimisticConnection(optimisticConnectionId)
          failCount++
        }
      }

      // Show result toast
      if (failCount === 0) {
        toast.success(`Connected ${successCount} snippet${successCount !== 1 ? 's' : ''} to new snippet`)
      } else if (successCount > 0) {
        toast.warning(
          `Partially connected: ${successCount} succeeded, ${failCount} failed`,
          'Some connections could not be created'
        )
      } else {
        toast.error('Failed to create connections', 'All connection attempts failed')
      }
    } catch (error) {
      console.error('Failed to create snippet for connections:', error)
      removeOptimisticSnippet(tempId)
      toast.error('Failed to create snippet', error instanceof Error ? error.message : 'Unknown error')
    }
  }, [
    projectId,
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

    if (Object.prototype.hasOwnProperty.call(changes, 'title')) {
      updateInput.title = changes.title ?? ''
      previousValues.title = snippetBeforeUpdate.title
    }

    if (changes.content) {
      updateInput.content = changes.content
      previousValues.content = snippetBeforeUpdate.content
    }

    if (Object.keys(updateInput).length === 0) {
      return
    }

    const previousSnippetSnapshot: Snippet = { ...snippetBeforeUpdate }
    const mergedContent = updateInput.content
      ? applyContentUpdates(snippetBeforeUpdate.content, updateInput.content)
      : snippetBeforeUpdate.content
    const updatedSnippet: Snippet = {
      ...snippetBeforeUpdate,
      ...(updateInput.title !== undefined ? { title: updateInput.title } : {}),
      ...(updateInput.content ? { content: mergedContent } : {})
    }
    updateRealSnippet(updatedSnippet)

    // Optimistic update
    setNodes((currentNodes: Node[]) =>
      currentNodes.map((node: Node) => {
        if (node.id === snippetId) {
          const snippetNode = node as Node<SnippetNodeData>
          return {
            ...node,
            data: {
              ...snippetNode.data,
              snippet: {
                ...snippetNode.data.snippet,
                ...(updateInput.title !== undefined ? { title: updateInput.title } : {}),
                ...(updateInput.content ? { content: mergedContent } : {})
              }
            }
          }
        }
        return node
      })
    )

    try {
      const mutationVariables = {
        projectId,
        id: snippetId,
        input: updateInput
      } as Record<string, unknown> & UpdateSnippetVariables

      // Use optimistic-only pattern: mutation already shows changes via optimistic update
      // No cache invalidation needed - we only changed existing fields
      // The stale-while-revalidate cache will refresh in background if needed
      await mutateOptimisticOnly(() =>
        updateSnippetMutation({
          variables: mutationVariables
        })
      )
    } catch (error) {
      console.error('Failed to update snippet content:', error)
      updateRealSnippet(previousSnippetSnapshot)
      // Rollback optimistic update
      setNodes((currentNodes: Node[]) =>
        currentNodes.map((node: Node) => {
          if (node.id === snippetId) {
            const snippetNode = node as Node<SnippetNodeData>
            return {
              ...node,
              data: {
                ...snippetNode.data,
                snippet: {
                  ...snippetNode.data.snippet,
                  ...previousSnippetSnapshot
                }
              }
            }
          }
          return node
        })
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
      setNodes((currentNodes: Node[]) =>
        currentNodes.map((node: Node) => {
          if (node.id === snippetId) {
            const snippetNode = node as Node<SnippetNodeData>
            return {
              ...node,
              data: {
                ...snippetNode.data,
                snippet: {
                  ...snippetNode.data.snippet,
                  content: updatedSnippet.content,
                  connections: snippetNode.data.snippet.connections
                }
              }
            }
          }
          return node
        })
      )
    } catch (error) {
      console.error('Failed to combine snippet content:', error)
      throw error
    }
  }, [combineConnectionsMutation, projectId, setNodes])

  const handleGenerateImage = useCallback((
    snippetId: string,
    modelId?: string,
    promptOverride?: string,
    meta: SnippetGenerationMeta = {}
  ) => {
    void (async () => {
      const snippet = snippetsRef.current.find(s => s.id === snippetId)
      if (!snippet) {
        return
      }

      if (!projectId) {
        console.error('Cannot generate snippet image: no project ID')
        return
      }

      const prompt = (promptOverride ?? getPrimaryTextValue(snippet) ?? '').trim()
      if (prompt === '') {
        toast.warning('Please provide prompt content for image generation')
        return
      }

      setGeneratingImage(snippetId, true)

      const baseX = snippet.position?.x ?? 0
      const baseY = snippet.position?.y ?? 0

      // Calculate target column (one to the right)
      const sourceColumnIndex = getColumnIndex(baseX)
      const targetX = getRelativeColumnX(sourceColumnIndex, 1)

      const targetPosition = {
        x: targetX,
        y: baseY
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      const now = new Date().toISOString()

      addOptimisticSnippet({
        id: tempId,
        projectId,
        title: 'Generated image snippet',
        content: buildPromptOnlyContent(meta.prompt ?? prompt),
        position: targetPosition,
        tags: [],
        connections: [],
        createdAt: now,
        updatedAt: now,
        version: 1,
        isOptimistic: true,
        createdFrom: snippetId,
        snippetType: 'content',
        generated: true,
        ...(meta.generationId ? { generationId: meta.generationId } : {}),
        ...(meta.generationCreatedAt ? { generationCreatedAt: meta.generationCreatedAt } : {})
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
                  content: buildPromptOnlyContent(meta.prompt ?? prompt),
                  position: targetPosition,
                  tags: [],
                  snippetType: 'content',
                  createdFrom: snippetId,
                  generated: true,
                  ...(meta.generationId ? { generationId: meta.generationId } : {}),
                  ...(meta.generationCreatedAt ? { generationCreatedAt: meta.generationCreatedAt } : {})
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
          content: buildDefaultContent('', { prompt: meta.prompt ?? prompt })
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
          content: buildPromptOnlyContent(meta.prompt ?? prompt)
        }

        updateRealSnippet(sanitizedSnippet)

        try {
          await updateSnippetMutation({
            variables: {
              projectId,
              id: generatedSnippet.id,
              input: {
                content: buildPromptOnlyContent(meta.prompt ?? prompt)
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

  const handleGenerateVideo = useCallback(async (snippetId: string, options: VideoGenerationInput) => {
    if (!projectId) {
      toast.error('Cannot generate snippet video: no project ID')
      const handledError = new Error('Missing project identifier')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    if (!options.modelId || options.modelId.trim() === '') {
      toast.warning('Please select a video model')
      const handledError = new Error('Missing video model selection')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    const isAlreadyGenerating = useCanvasStore.getState().generatingVideoSnippetIds[snippetId]
    if (isAlreadyGenerating) {
      toast.info('Video generation already in progress for this snippet')
      const handledError = new Error('Video generation already running')
      Object.assign(handledError, { handled: true })
      throw handledError
    }

    setGeneratingVideo(snippetId, true)

    try {
      // Build variables object, omitting undefined values for GraphQL
      const variables = {
        projectId,
        snippetId,
        modelId: options.modelId,
        ...(options.duration !== undefined && { duration: options.duration }),
        ...(options.aspectRatio !== undefined && { aspectRatio: options.aspectRatio }),
        ...(options.resolution !== undefined && { resolution: options.resolution }),
        ...(options.style !== undefined && { style: options.style }),
        ...(options.seed !== undefined && { seed: options.seed }),
        ...(options.movementAmplitude !== undefined && { movementAmplitude: options.movementAmplitude })
      }

      await mutateWithInvalidate(
        () => generateSnippetVideoMutation({ variables }),
        ['ProjectWithSnippets']
      )

      toast.success('Video generation started', 'We will update this snippet once the video is ready.')
    } catch (error) {
      console.error('Failed to generate snippet video:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'

      const isHandled = Boolean(error && typeof error === 'object' && 'handled' in (error as Record<string, unknown>))
      if (!isHandled) {
        toast.error('Failed to generate video', message)
      }

      throw error
    } finally {
      setGeneratingVideo(snippetId, false)
    }
  }, [generateSnippetVideoMutation, projectId, setGeneratingVideo, toast])

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

    // Calculate target column for new snippet (one column to the left)
    const targetColumnIndex = getColumnIndex(baseX)
    const newColumnX = getRelativeColumnX(targetColumnIndex, -1)

    // Find snippets in the target column to stack below
    const columnSnippets = snippetsRef.current.filter(s =>
      Math.abs((s.position?.x ?? 0) - newColumnX) < 10 // Allow small float diffs
    )

    let targetY = baseY

    if (columnSnippets.length > 0) {
      // Find the lowest point
      const lowestSnippet = columnSnippets.reduce((prev, current) => {
        const prevY = prev.position?.y ?? 0
        const currentY = current.position?.y ?? 0
        return prevY > currentY ? prev : current
      })

      // Get height from ReactFlow if available, otherwise use estimate
      let height: number = CANVAS_CONSTANTS.ESTIMATED_SNIPPET_HEIGHT
      if (reactFlowInstance?.current) {
        const node = reactFlowInstance.current.getNode(lowestSnippet.id)
        if (node && node.height) {
          height = node.height
        }
      }

      targetY = (lowestSnippet.position?.y ?? 0) + height + 5 // 5px gap
    }

    const targetPosition = {
      x: newColumnX,
      y: targetY
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: 'New snippet',
      content: buildDefaultContent(''),
      position: targetPosition,
      tags: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true,
      generated: false
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
                content: buildDefaultContent(''),
                position: targetPosition,
                tags: []
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

    // Snap position to column constraints
    const snappedX = snapToColumn(position.x)

    // Find snippets in this column to stack below
    const columnSnippets = snippetsRef.current.filter(s =>
      Math.abs((s.position?.x ?? 0) - snappedX) < 10 // Allow small float diffs
    )

    let targetY = position.y

    if (columnSnippets.length > 0) {
      // Find the lowest point
      const lowestSnippet = columnSnippets.reduce((prev, current) => {
        const prevY = prev.position?.y ?? 0
        const currentY = current.position?.y ?? 0
        return prevY > currentY ? prev : current
      })

      // Get height from ReactFlow if available, otherwise use estimate
      let height: number = CANVAS_CONSTANTS.ESTIMATED_SNIPPET_HEIGHT
      if (reactFlowInstance?.current) {
        const node = reactFlowInstance.current.getNode(lowestSnippet.id)
        if (node && node.height) {
          height = node.height
        }
      }

      targetY = (lowestSnippet.position?.y ?? 0) + height + 5 // 5px gap
    }

    const snappedPosition = {
      x: snappedX,
      y: targetY
    }

    // Add optimistic snippet immediately
    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: 'New snippet',
      content: buildDefaultContent(''),
      position: snappedPosition,
      tags: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true,
      generated: false
    })

    // Scroll to the new snippet to ensure visibility
    // Use a small timeout to allow ReactFlow to render the new node
    setTimeout(() => {
      handleFocusSnippet(tempId)
    }, 100)

    const variables = {
      input: {
        projectId,
        title: 'New snippet',
        content: buildDefaultContent(''),
        position: snappedPosition,
        tags: [],
        generated: false
      }
    } as Record<string, unknown> & CreateSnippetVariables

    mutateWithInvalidate(
      () => createSnippetMutation({ variables }),
      ['ProjectWithSnippets']
    )
      .then((result) => {
        if (result) {
          const createdSnippet = (result as CreateSnippetMutationData | null)?.createSnippet
          // Replace optimistic snippet with real one from server
          if (createdSnippet) {
            replaceOptimisticSnippet(tempId, createdSnippet)
          } else {
            // Snippet missing in response
            removeOptimisticSnippet(tempId)
          }
        } else {
          // Mutation returned null (error handled internally)
          removeOptimisticSnippet(tempId)
        }
      })
      .catch((error) => {
        console.error('Failed to create snippet:', error)
        // Remove optimistic snippet on failure
        removeOptimisticSnippet(tempId)
      })
  }, [projectId, createSnippetMutation, addOptimisticSnippet, replaceOptimisticSnippet, removeOptimisticSnippet])

  const handleCreateVideoSnippet = useCallback((position: { x: number; y: number }) => {
    if (!projectId) {
      console.error('Cannot create video snippet: no project ID')
      return
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    // Snap position to column constraints
    const snappedPosition = {
      x: snapToColumn(position.x),
      y: position.y
    }

    // Add optimistic video snippet immediately
    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: 'Video Snippet',
      content: buildDefaultVideoContent(),
      position: snappedPosition,
      tags: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true,
      generated: false,
      snippetType: 'video'
    })

    const variables = {
      input: {
        projectId,
        title: 'Video Snippet',
        content: buildDefaultVideoContent(),
        position: snappedPosition,
        tags: [],
        generated: false,
        snippetType: 'video'
      }
    } as Record<string, unknown> & CreateSnippetVariables

    mutateWithInvalidate(
      () => createSnippetMutation({ variables }),
      ['ProjectWithSnippets']
    )
      .then((result) => {
        if (result) {
          const createdSnippet = (result as CreateSnippetMutationData | null)?.createSnippet
          // Replace optimistic snippet with real one from server
          if (createdSnippet) {
            replaceOptimisticSnippet(tempId, createdSnippet)
          } else {
            removeOptimisticSnippet(tempId)
          }
        } else {
          removeOptimisticSnippet(tempId)
        }
      })
      .catch((error) => {
        console.error('Failed to create video snippet:', error)
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
    // Calculate target column (one to the right)
    const sourceColumnIndex = getColumnIndex(baseX)
    const targetX = getRelativeColumnX(sourceColumnIndex, 1)

    const targetPosition = {
      x: targetX,
      y: baseY
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    // Add optimistic snippet immediately
    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: 'Generated snippet',
      content: buildPromptOnlyContent(generatedSnippetPreview.content),
      position: targetPosition,
      tags: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true,
      snippetType: 'content',
      generated: true,
      ...(sourceSnippetId ? { createdFrom: sourceSnippetId } : {})
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
                content: buildPromptOnlyContent(generatedSnippetPreview.content),
                position: targetPosition,
                tags: [],
                snippetType: 'content',
                ...(sourceSnippetId ? { createdFrom: sourceSnippetId } : {}),
                generated: true
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
  const handleGenerateTextSnippet = useCallback(async (
    sourceSnippetId: string,
    generatedContent: string,
    meta: SnippetGenerationMeta = {}
  ) => {
    if (!projectId) {
      console.error('Cannot create generated text snippet: no project ID')
      return
    }

    const sourceSnippet = snippetsRef.current.find(s => s.id === sourceSnippetId)
    const baseX = sourceSnippet?.position?.x ?? 0
    const baseY = sourceSnippet?.position?.y ?? 0

    // Position new snippet to the right of source in the next column
    const sourceColumnIndex = getColumnIndex(baseX)
    const targetX = getRelativeColumnX(sourceColumnIndex, 1)

    const targetPosition = {
      x: targetX,
      y: baseY
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    const promptValue = meta.prompt ?? generatedContent

    // Add optimistic snippet immediately
    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: 'Generated text snippet',
      content: buildPromptOnlyContent(promptValue),
      position: targetPosition,
      tags: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true,
      snippetType: 'content',
      createdFrom: sourceSnippetId,
      generated: true,
      ...(meta.generationId ? { generationId: meta.generationId } : {}),
      ...(meta.generationCreatedAt ? { generationCreatedAt: meta.generationCreatedAt } : {})
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
                content: buildPromptOnlyContent(promptValue),
                position: targetPosition,
                tags: [],
                snippetType: 'content',
                createdFrom: sourceSnippetId,
                generated: true,
                ...(meta.generationId ? { generationId: meta.generationId } : {}),
                ...(meta.generationCreatedAt ? { generationCreatedAt: meta.generationCreatedAt } : {})
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

  const handleGenerateVideoSnippetFromJson = useCallback(async (
    sourceSnippetId: string,
    generatedData: GeneratedVideoSnippetData,
    meta: SnippetGenerationMeta = {}
  ) => {
    if (!projectId) {
      console.error('Cannot create generated video snippet: no project ID')
      return
    }

    const sourceSnippet = snippetsRef.current.find(s => s.id === sourceSnippetId)
    const baseX = sourceSnippet?.position?.x ?? 0
    const baseY = sourceSnippet?.position?.y ?? 0

    // Position new snippet to the right of source in the next column
    const sourceColumnIndex = getColumnIndex(baseX)
    const targetX = getRelativeColumnX(sourceColumnIndex, 1)

    const targetPosition = {
      x: targetX,
      y: baseY
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()
    const resolvedTitle = generatedData.title?.trim() || 'Generated video snippet'
    const resolvedText = generatedData.mainText?.trim() ?? ''
    const resolvedTags = generatedData.tags ?? []

    const buildTextFromFields = (): string | undefined => {
      const parts: string[] = []
      const push = (label: string, value?: string) => {
        if (value && value.trim() !== '') {
          parts.push(`${label}: ${value.trim()}`)
        }
      }
      push('Subject', generatedData.subject)
      push('Action', generatedData.action)
      push('Camera & Motion', generatedData.cameraMotion)
      push('Composition', generatedData.composition)
      push('Focus & Lens', generatedData.focusLens)
      push('Style', generatedData.style)
      push('Ambiance', generatedData.ambiance)
      push('Dialogue', generatedData.dialogue)
      push('Sound Effects', generatedData.soundEffects)
      push('Ambient Noise', generatedData.ambientNoise)
      if (parts.length === 0) {
        return undefined
      }
      return parts.join('\n')
    }

    const combinedText = resolvedText || buildTextFromFields() || ''
    const promptValue = meta.prompt ?? (combinedText || 'Generated video prompt')
    const content = buildPromptOnlyContent(promptValue)

    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: resolvedTitle,
      content,
      position: targetPosition,
      tags: resolvedTags,
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true,
      snippetType: 'content',
      createdFrom: sourceSnippetId,
      generated: true,
      ...(meta.generationId ? { generationId: meta.generationId } : {}),
      ...(meta.generationCreatedAt ? { generationCreatedAt: meta.generationCreatedAt } : {})
    })

    try {
      const creationResult = await mutateWithInvalidate(
        () =>
          createSnippetMutation({
            variables: {
              input: {
                projectId,
                title: resolvedTitle,
                content,
                position: targetPosition,
                tags: resolvedTags,
                snippetType: 'content',
                createdFrom: sourceSnippetId,
                generated: true,
                ...(meta.generationId ? { generationId: meta.generationId } : {}),
                ...(meta.generationCreatedAt ? { generationCreatedAt: meta.generationCreatedAt } : {})
              }
            }
          }),
        ['ProjectWithSnippets']
      )

      const createdSnippet = creationResult?.createSnippet
      if (!createdSnippet) {
        throw new Error('Failed to create video snippet: missing ID in response')
      }

      replaceOptimisticSnippet(tempId, createdSnippet)

      toast.success('Generated video snippet created successfully!')
    } catch (error) {
      console.error('Failed to create generated video snippet:', error)
      removeOptimisticSnippet(tempId)
      toast.error('Failed to create video snippet', error instanceof Error ? error.message : 'Unknown error')
    }
  }, [
    projectId,
    createSnippetMutation,
    addOptimisticSnippet,
    replaceOptimisticSnippet,
    removeOptimisticSnippet,
    toast
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

      // Update ReactFlow selection so downstream subscribers stay in sync
      setNodes((currentNodes: Node[]) =>
        currentNodes.map((currentNode: Node) => {
          const shouldSelect = currentNode.id === snippetId
          if (currentNode.selected === shouldSelect) {
            return currentNode
          }
          return {
            ...currentNode,
            selected: shouldSelect
          }
        })
      )

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

      // Clamp zoom between reasonable bounds (0.5x to 1x)
      // User requested not to zoom beyond 100%
      const clampedZoom = Math.max(0.5, Math.min(1, targetZoom))

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
  }, [reactFlowInstance, setNodes])

  // Navigate to connected snippet using number key
  const handleNumberKeyNavigation = useCallback((key: string) => {
    const { selectedSnippetIds } = useCanvasStore.getState()

    // Only navigate if exactly one snippet is selected
    if (selectedSnippetIds.size !== 1 || !reactFlowInstance?.current) {
      return
    }

    const selectedSnippetId = Array.from(selectedSnippetIds)[0]

    // Find the selected snippet
    const selectedSnippet = snippets.find(s => s.id === selectedSnippetId)
    if (!selectedSnippet) {
      return
    }

    // Parse key to index (1 -> 0, 2 -> 1, etc.)
    const keyNumber = parseInt(key, 10)
    if (isNaN(keyNumber) || keyNumber < 1) {
      return
    }
    const index = keyNumber - 1

    // Get connections from snippet
    const node = reactFlowInstance.current?.getNode(selectedSnippetId) as Node<SnippetNodeData> | undefined
    const connections = node?.data?.snippet?.connections

    if (!connections || connections.length === 0) {
      return
    }

    // Check if index is valid
    if (index >= connections.length) {
      return
    }

    // Get the target snippet ID
    const targetSnippetId = connections[index]?.targetSnippetId

    if (!targetSnippetId) {
      return
    }
    // Navigate to the target snippet (focus handler now updates selection state)
    handleFocusSnippet(targetSnippetId)
  }, [handleFocusSnippet])

  const handleCreateImageSnippet = useCallback((position: { x: number; y: number }) => {
    if (!projectId) {
      console.error('Cannot create image snippet: no project ID')
      return
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    // Optimistic update
    addOptimisticSnippet({
      id: tempId,
      projectId,
      title: 'New Image Snippet',
      content: buildDefaultImageContent(),
      position,
      tags: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isOptimistic: true,
      snippetType: 'image',
      generated: false
    })

    // Mutation
    void mutateWithInvalidate(
      () =>
        createSnippetMutation({
          variables: {
            input: {
              projectId,
              title: 'New Image Snippet',
              content: buildDefaultImageContent(),
              position,
              tags: [],
              snippetType: 'image',
              generated: false
            }
          }
        }),
      ['ProjectWithSnippets']
    ).then((result) => {
      if (result?.createSnippet) {
        replaceOptimisticSnippet(tempId, result.createSnippet)
      } else {
        removeOptimisticSnippet(tempId)
      }
    }).catch((error) => {
      console.error('Failed to create image snippet:', error)
      removeOptimisticSnippet(tempId)
    })
  }, [projectId, addOptimisticSnippet, createSnippetMutation, replaceOptimisticSnippet, removeOptimisticSnippet])

  return {
    // Snippet Handlers
    handleEditSnippet,
    handleDeleteSnippet,
    handleDeleteMultiple,
    handleConnectMultiple,
    handleManageConnections,
    handleViewVersions,
    handleUpdateSnippetContent,
    handleCombineSnippetContent,
    handleGenerateImage,
    handleGenerateVideo,
    handleFocusSnippet,
    handleCreateUpstreamSnippet,
    handleNumberKeyNavigation,

    // Canvas Operations
    handleCreateSnippet,
    handleCreateVideoSnippet,
    handleCreateImageSnippet,
    handleSaveCanvas,

    // Mutations
    updateSnippetMutation,
    createConnectionMutation,
    deleteConnectionMutation,

    // Generated Snippet Handlers
    handleCreateGeneratedSnippet,
    handleGenerateTextSnippet,
    handleGenerateVideoSnippetFromJson
  }
}
