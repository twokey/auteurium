import { useCallback, useRef, useState } from 'react'

import { useGraphQLMutation } from './useGraphQLMutation'
import { useModels } from './useModels'
import {
  GENERATE_CONTENT,
  GENERATE_CONTENT_STREAM,
  GENERATION_STREAM_SUBSCRIPTION,
  CREATE_SCENES
} from '../graphql/genai'
import { getClient } from '../services/graphql'

import type { Snippet } from '../types'

interface GenerateContentResult {
  content: string
  tokensUsed: number
  cost: number
  modelUsed: string
  generationTimeMs: number
}

interface CreateScenesResult {
  scenes: Snippet[]
  tokensUsed: number
  cost: number
  modelUsed: string
  generationTimeMs: number
}

interface GenerateContentVariables {
  projectId: string
  snippetId: string
  input: {
    modelId: string
    prompt: string
  }
}

interface GenerateContentData {
  generateContent: GenerateContentResult
}

interface GenerateContentStreamData {
  generateContentStream: GenerateContentResult
}

interface CreateScenesVariables {
  projectId: string
  snippetId: string
  input: {
    modelId: string
    prompt: string
    temperature?: number
    maxTokens?: number
  }
}

interface CreateScenesData {
  createScenes: CreateScenesResult
}

interface GenerationStreamSubscriptionData {
  onGenerationStream: {
    snippetId: string
    content: string | null
    isComplete: boolean
    tokensUsed?: number | null
  } | null
}

interface UseGenAIOptions {
  enabled?: boolean
}

interface StreamHandlers {
  onNext: (event: GenerationStreamSubscriptionData['onGenerationStream']) => void
  onError?: (error: unknown) => void
  onComplete?: () => void
}

interface GenerateStreamResponse {
  result: GenerateContentResult | null
  usedStreaming: boolean
  fallbackReason: string | null
}

const STREAMING_ERROR_TOKENS = [
  'generatecontentstream',
  'ongenerationstream',
  'publishgenerationstreamevent',
  'subscription handshake',
  'unknown subscription',
  'resolver not found',
  'unknown resolver',
  'not authorized',
  'unauthorized',
  'permission denied',
  'schema is not configured for subscriptions',
  'schema is not configured'
]

const DEFAULT_FALLBACK_MESSAGE = 'Streaming is not available in this environment. Returning the full response once it is ready.'

const collectErrorMessages = (error: unknown): string[] => {
  const messages: string[] = []

  if (!error) {
    return messages
  }

  if (error instanceof Error) {
    if (typeof error.message === 'string' && error.message.trim() !== '') {
      messages.push(error.message)
    }
  } else if (typeof error === 'object') {
    const candidate = error as { message?: unknown; errors?: { message?: unknown }[] }
    if (typeof candidate.message === 'string' && candidate.message.trim() !== '') {
      messages.push(candidate.message)
    }

    if (Array.isArray(candidate.errors)) {
      for (const entry of candidate.errors) {
        if (entry && typeof entry.message === 'string' && entry.message.trim() !== '') {
          messages.push(entry.message)
        }
      }
    }
  }

  return messages
}

const isStreamingUnsupportedError = (error: unknown): boolean => {
  const messages = collectErrorMessages(error).map(message => message.toLowerCase())

  if (messages.length === 0) {
    return false
  }

  return messages.some(message =>
    STREAMING_ERROR_TOKENS.some(token => message.includes(token))
  )
}

const extractStreamingFallbackReason = (error: unknown): string | null => {
  const messages = collectErrorMessages(error)
  if (messages.length === 0) {
    return null
  }

  const prioritised = messages.find(message =>
    STREAMING_ERROR_TOKENS.some(token => message.toLowerCase().includes(token))
  )

  return prioritised ?? messages[0] ?? null
}

export const useGenAI = (options: UseGenAIOptions = {}) => {
  const { enabled = true } = options
  const streamingSupportedRef = useRef(true)
  const [isStreamingSupported, setIsStreamingSupported] = useState(true)
  const streamingFallbackReasonRef = useRef<string | null>(null)
  const [streamingFallbackReason, setStreamingFallbackReason] = useState<string | null>(null)

  // Get models from global Context instead of querying directly
  const {
    textModels,
    isLoadingTextModels: isLoadingModels,
    textModelsError: modelsError,
    refetchTextModels: refetchModels
  } = useModels()

  const { mutate: generateContentMutation, loading: isGeneratingMutation } = useGraphQLMutation<
    GenerateContentData,
    GenerateContentVariables
  >(GENERATE_CONTENT)

  const { mutate: generateContentStreamMutation, loading: isStreamingMutation } = useGraphQLMutation<
    GenerateContentStreamData,
    GenerateContentVariables
  >(GENERATE_CONTENT_STREAM)

  const { mutate: createScenesMutation, loading: isCreatingScenes } = useGraphQLMutation<
    CreateScenesData,
    CreateScenesVariables
  >(CREATE_SCENES)

  const generate = useCallback(
    async (projectId: string, snippetId: string, modelId: string, prompt: string) => {
      const result = await generateContentMutation({
        variables: {
          projectId,
          snippetId,
          input: {
            modelId,
            prompt
          }
        }
      })

      return result?.generateContent
    },
    [generateContentMutation]
  )

  const markStreamingUnsupported = useCallback((reason: string | null) => {
    if (!streamingSupportedRef.current) {
      return
    }

    streamingSupportedRef.current = false
    setIsStreamingSupported(false)

    const fallbackMessage = DEFAULT_FALLBACK_MESSAGE

    if (reason && reason.trim() !== '') {
      console.warn('[GenAI] Streaming disabled; falling back to non-streaming mode.', { reason })
    }

    streamingFallbackReasonRef.current = fallbackMessage
    setStreamingFallbackReason(fallbackMessage)
  }, [])

  const runFallbackGeneration = useCallback(async (
    projectId: string,
    snippetId: string,
    modelId: string,
    prompt: string,
    reason: string | null
  ): Promise<GenerateStreamResponse> => {
    markStreamingUnsupported(reason)

    const result = await generate(projectId, snippetId, modelId, prompt)

    return {
      result: result ?? null,
      usedStreaming: false,
      fallbackReason: streamingFallbackReasonRef.current ?? DEFAULT_FALLBACK_MESSAGE
    }
  }, [generate, markStreamingUnsupported])

  const generateStream = useCallback(
    async (projectId: string, snippetId: string, modelId: string, prompt: string): Promise<GenerateStreamResponse> => {
      if (!streamingSupportedRef.current) {
        return runFallbackGeneration(projectId, snippetId, modelId, prompt, streamingFallbackReasonRef.current)
      }

      try {
        const result = await generateContentStreamMutation({
          variables: {
            projectId,
            snippetId,
            input: {
              modelId,
              prompt
            }
          }
        })

        return {
          result: result?.generateContentStream ?? null,
          usedStreaming: true,
          fallbackReason: null
        }
      } catch (error) {
        if (!isStreamingUnsupportedError(error)) {
          throw error
        }

        const reason = extractStreamingFallbackReason(error)
        return runFallbackGeneration(projectId, snippetId, modelId, prompt, reason)
      }
    },
    [generateContentStreamMutation, runFallbackGeneration]
  )

  const subscribeToGenerationStream = useCallback(
    (snippetId: string, handlers: StreamHandlers) => {
      if (!streamingSupportedRef.current) {
        return {
          unsubscribe: () => {}
        }
      }

      // Using Amplify client for subscriptions
      const subscription = getClient().graphql({
        query: GENERATION_STREAM_SUBSCRIPTION,
        variables: { snippetId }
      })

      // Check if this is a subscription (has subscribe method)
      if ('subscribe' in subscription && typeof subscription.subscribe === 'function') {
        return subscription.subscribe({
          next: (value: { data?: GenerationStreamSubscriptionData }) => {
            if (value.data?.onGenerationStream) {
              handlers.onNext(value.data.onGenerationStream)
            }
          },
          error: (error: Error) => {
            if (isStreamingUnsupportedError(error)) {
              const reason = extractStreamingFallbackReason(error)
              markStreamingUnsupported(reason)
              handlers.onError?.(streamingFallbackReasonRef.current ?? DEFAULT_FALLBACK_MESSAGE)
              return
            }

            handlers.onError?.(error)
          },
          complete: handlers.onComplete
        })
      }

      // Fallback if not a subscription
      return {
        unsubscribe: () => {}
      }
    },
    [markStreamingUnsupported]
  )

  const createScenes = useCallback(
    async (projectId: string, snippetId: string, modelId: string, prompt: string) => {
      const result = await createScenesMutation({
        variables: {
          projectId,
          snippetId,
          input: {
            modelId,
            prompt
          }
        }
      })

      return result?.createScenes
    },
    [createScenesMutation]
  )

  return {
    models: textModels,
    isLoadingModels: enabled ? isLoadingModels : false,
    modelsError: enabled ? modelsError : null,
    refetchModels,
    generate,
    generateStream,
    subscribeToGenerationStream,
    createScenes,
    isGenerating: isGeneratingMutation || isStreamingMutation,
    isCreatingScenes,
    isStreamingSupported,
    streamingFallbackReason
  }
}
