import React, { useState, useRef, useCallback } from 'react'

import { useGenAI } from '../../../hooks/useGenAI'
import { useToast } from '../../../shared/store/toastStore'

export interface UseSnippetGenerationReturn {
  // Models
  models: { id: string; displayName: string; description?: string | null }[]
  isLoadingModels: boolean
  modelsError: Error | null
  
  // Generation state
  selectedModelPrimary: string
  selectedModelSecondary: string
  isGeneratingPrimary: boolean
  isGeneratingSecondary: boolean
  isStreaming: boolean
  streamError: string | null
  secondaryStreamError: string | null
  
  // Setters
  setSelectedModelPrimary: (modelId: string) => void
  setSelectedModelSecondary: (modelId: string) => void
  
  // Generation methods
  generateContent: (prompt: string) => Promise<{ content: string } | null>
  generateSnippetFromField2: (field2Content: string) => Promise<{ content: string } | null>
}

/**
 * useSnippetGeneration - Manage AI generation state and streaming
 * Handles: model selection, streaming, generation state, error tracking
 */
export const useSnippetGeneration = (enabled = true): UseSnippetGenerationReturn => {
  const toast = useToast()
  const { models, isLoadingModels, modelsError, generateStream } = useGenAI({ enabled })

  // Model selection
  const [selectedModelPrimary, setSelectedModelPrimary] = useState('')
  const [selectedModelSecondary, setSelectedModelSecondary] = useState('')

  // Generation state
  const [isGeneratingPrimary, setIsGeneratingPrimary] = useState(false)
  const [isGeneratingSecondary, setIsGeneratingSecondary] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [secondaryStreamError, setSecondaryStreamError] = useState<string | null>(null)

  // Refs for streaming
  const streamSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  // Initialize models on load
  const initializeModels = useCallback(() => {
    if (!selectedModelPrimary && models.length > 0) {
      setSelectedModelPrimary(models[0].id)
    }
    if (!selectedModelSecondary && models.length > 0) {
      setSelectedModelSecondary(models[0].id)
    }
  }, [models, selectedModelPrimary, selectedModelSecondary])

  // Initialize on models change
  React.useEffect(() => {
    initializeModels()
  }, [initializeModels, models])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (streamSubscriptionRef.current) {
        streamSubscriptionRef.current.unsubscribe()
        streamSubscriptionRef.current = null
      }
    }
  }, [])

  // Generate content from prompt
  const generateContent = useCallback(
    async (prompt: string) => {
      if (!selectedModelPrimary) {
        toast.warning('Please select an LLM model before generating')
        return null
      }

      if (prompt.trim() === '') {
        toast.warning('Please provide input to send to the model')
        return null
      }

      setIsGeneratingPrimary(true)
      setStreamError(null)

      try {
        // Cleanup previous subscription
        if (streamSubscriptionRef.current) {
          streamSubscriptionRef.current.unsubscribe()
          streamSubscriptionRef.current = null
        }

        const { result, fallbackReason } = await generateStream(
          '', // projectId - passed separately in actual use
          '', // snippetId - passed separately in actual use
          selectedModelPrimary,
          prompt
        )

        if (!result || result.content.trim() === '') {
          toast.warning(
            'The selected model did not return any content',
            'Please try again or choose another model'
          )
          return null
        }

        if (fallbackReason) {
          setStreamError(fallbackReason)
        }

        return { content: result.content }
      } catch (error) {
        console.error('Failed to generate content:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        setStreamError(message)
        toast.error('Failed to generate content', message)
        return null
      } finally {
        setIsStreaming(false)
        setIsGeneratingPrimary(false)
      }
    },
    [selectedModelPrimary, generateStream, toast]
  )

  // Generate snippet from secondary field
  const generateSnippetFromField2 = useCallback(
    async (field2Content: string) => {
      if (!selectedModelSecondary) {
        toast.warning('Please select an LLM model before generating')
        return null
      }

      const trimmedPrompt = field2Content.trim()
      if (trimmedPrompt === '') {
        toast.warning('Please provide input to send to the model')
        return null
      }

      setIsGeneratingSecondary(true)
      setSecondaryStreamError(null)

      try {
        const { result, fallbackReason } = await generateStream(
          '', // projectId
          '', // snippetId
          selectedModelSecondary,
          field2Content
        )

        if (!result || result.content.trim() === '') {
          toast.warning(
            'The selected model did not return any content',
            'Please try again or choose another model'
          )
          return null
        }

        if (fallbackReason) {
          setSecondaryStreamError(fallbackReason)
        }

        return { content: result.content }
      } catch (error) {
        console.error('Failed to generate snippet:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        setSecondaryStreamError(message)
        toast.error('Failed to generate snippet', message)
        return null
      } finally {
        setIsGeneratingSecondary(false)
      }
    },
    [selectedModelSecondary, generateStream, toast]
  )

  return {
    models,
    isLoadingModels,
    modelsError,
    selectedModelPrimary,
    selectedModelSecondary,
    isGeneratingPrimary,
    isGeneratingSecondary,
    isStreaming,
    streamError,
    secondaryStreamError,
    setSelectedModelPrimary,
    setSelectedModelSecondary,
    generateContent,
    generateSnippetFromField2
  }
}
