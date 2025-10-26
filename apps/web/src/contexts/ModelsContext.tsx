import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { GET_AVAILABLE_MODELS } from '../graphql/genai'
import { useGraphQLQuery } from '../hooks/useGraphQLQuery'

export interface AvailableModel {
  id: string
  displayName: string
  description?: string | null
  provider?: string
  maxTokens?: number
  costPerToken?: number
}

interface AvailableModelsData {
  availableModels: AvailableModel[]
}

interface ModelsContextValue {
  textModels: AvailableModel[]
  imageModels: AvailableModel[]
  isLoadingTextModels: boolean
  isLoadingImageModels: boolean
  textModelsError: Error | null
  imageModelsError: Error | null
  refetchTextModels: () => Promise<void>
  refetchImageModels: () => Promise<void>
}

const ModelsContext = createContext<ModelsContextValue | null>(null)

interface ModelsProviderProps {
  children: ReactNode
}

export const ModelsProvider = ({ children }: ModelsProviderProps) => {
  // Query text generation models
  const {
    data: textModelsData,
    loading: isLoadingTextModels,
    error: textModelsError,
    refetch: refetchTextModels
  } = useGraphQLQuery<AvailableModelsData>(GET_AVAILABLE_MODELS, {
    variables: { modality: 'TEXT_TO_TEXT' }
  })

  // Query image generation models
  const {
    data: imageModelsData,
    loading: isLoadingImageModels,
    error: imageModelsError,
    refetch: refetchImageModels
  } = useGraphQLQuery<AvailableModelsData>(GET_AVAILABLE_MODELS, {
    variables: { modality: 'TEXT_TO_IMAGE' }
  })

  const textModels = useMemo(() => textModelsData?.availableModels ?? [], [textModelsData])
  const imageModels = useMemo(() => imageModelsData?.availableModels ?? [], [imageModelsData])

  const value = useMemo(
    () => ({
      textModels,
      imageModels,
      isLoadingTextModels,
      isLoadingImageModels,
      textModelsError,
      imageModelsError,
      refetchTextModels,
      refetchImageModels
    }),
    [
      textModels,
      imageModels,
      isLoadingTextModels,
      isLoadingImageModels,
      textModelsError,
      imageModelsError,
      refetchTextModels,
      refetchImageModels
    ]
  )

  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
}

export const useModels = (): ModelsContextValue => {
  const context = useContext(ModelsContext)
  if (!context) {
    throw new Error('useModels must be used within ModelsProvider')
  }
  return context
}
