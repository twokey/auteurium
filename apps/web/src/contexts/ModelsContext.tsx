import { createContext, useCallback, useMemo, type ReactNode } from 'react'

import { GET_AVAILABLE_MODELS } from '../graphql/genai'
import { useGraphQLQueryWithCache } from '../hooks/useGraphQLQueryWithCache'

import type { AvailableModel } from '../types'

interface AvailableModelsData {
  availableModels: AvailableModel[]
}

export interface ModelsContextValue {
  textModels: AvailableModel[]
  imageModels: AvailableModel[]
  videoModels: AvailableModel[]
  isLoadingTextModels: boolean
  isLoadingImageModels: boolean
  isLoadingVideoModels: boolean
  textModelsError: Error | null
  imageModelsError: Error | null
  videoModelsError: Error | null
  refetchTextModels: () => Promise<void>
  refetchImageModels: () => Promise<void>
  refetchVideoModels: () => Promise<void>
}

export const ModelsContext = createContext<ModelsContextValue | null>(null)

interface ModelsProviderProps {
  children: ReactNode
}

export const ModelsProvider = ({ children }: ModelsProviderProps) => {
  const {
    data,
    loading,
    error,
    refetch
  } = useGraphQLQueryWithCache<AvailableModelsData>(GET_AVAILABLE_MODELS)

  const allModels = useMemo(
    () => data?.availableModels ?? [],
    [data?.availableModels]
  )

  const isTextOutputModel = useCallback(
    (model: AvailableModel) => {
      const modality = model.modality?.toLowerCase?.() ?? ''
      return modality === 'text_to_text' || modality.endsWith('to_text') || modality.endsWith('to-text')
    },
    []
  )

  const filterByModalities = useCallback(
    (models: AvailableModel[], modalities: Array<AvailableModel['modality'] | string>) =>
      models.filter(model => modalities.includes(model.modality)),
    []
  )

  const textModels = useMemo(
    () => allModels.filter(isTextOutputModel),
    [allModels, isTextOutputModel]
  )
  const imageModels = useMemo(
    () => filterByModalities(allModels, ['TEXT_TO_IMAGE', 'TEXT_AND_IMAGE_TO_IMAGE']),
    [allModels, filterByModalities]
  )
  const videoModels = useMemo(
    () => filterByModalities(allModels, ['TEXT_TO_VIDEO', 'IMAGE_TO_VIDEO', 'VIDEO_TO_VIDEO']),
    [allModels, filterByModalities]
  )

  const value = useMemo(
    () => ({
      textModels,
      imageModels,
      videoModels,
      isLoadingTextModels: loading,
      isLoadingImageModels: loading,
      isLoadingVideoModels: loading,
      textModelsError: error,
      imageModelsError: error,
      videoModelsError: error,
      refetchTextModels: refetch,
      refetchImageModels: refetch,
      refetchVideoModels: refetch
    }),
    [
      textModels,
      imageModels,
      videoModels,
      loading,
      error,
      refetch
    ]
  )

  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
}
