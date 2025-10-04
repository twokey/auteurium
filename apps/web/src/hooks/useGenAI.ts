import { useCallback } from 'react'
import { useMutation, useQuery } from '@apollo/client'

import { GENERATE_CONTENT, GET_AVAILABLE_MODELS } from '../graphql/genai'

type AvailableModel = {
  id: string
  displayName: string
  description?: string | null
  provider: string
  maxTokens?: number | null
  costPerToken?: number | null
}

type GenerateContentResult = {
  content: string
  tokensUsed: number
  cost: number
  modelUsed: string
  generationTimeMs: number
}

type GenerateContentVariables = {
  projectId: string
  snippetId: string
  input: {
    modelId: string
    prompt: string
  }
}

type AvailableModelsData = {
  availableModels: AvailableModel[]
}

type GenerateContentData = {
  generateContent: GenerateContentResult
}

interface UseGenAIOptions {
  enabled?: boolean
}

export const useGenAI = (options: UseGenAIOptions = {}) => {
  const { enabled = true } = options

  const {
    data: modelsData,
    loading: isLoadingModels,
    error: modelsError,
    refetch: refetchModels
  } = useQuery<AvailableModelsData>(GET_AVAILABLE_MODELS, {
    variables: { modality: 'TEXT_TO_TEXT' },
    skip: !enabled
  })

  const [generateContentMutation, { loading: isGenerating }] = useMutation<
    GenerateContentData,
    GenerateContentVariables
  >(GENERATE_CONTENT)

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

      return result.data?.generateContent
    },
    [generateContentMutation]
  )

  return {
    models: modelsData?.availableModels ?? [],
    isLoadingModels,
    modelsError,
    refetchModels,
    generate,
    isGenerating
  }
}
