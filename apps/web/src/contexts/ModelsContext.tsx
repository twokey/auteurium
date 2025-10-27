import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'

import { GET_AVAILABLE_MODELS } from '../graphql/genai'
import { useGraphQLQueryWithCache } from '../shared/hooks/useGraphQLQueryWithCache'
import type { AvailableModel } from '../types'

interface AvailableModelsData {
  availableModels: AvailableModel[]
}

interface ModelsContextValue {
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

const ModelsContext = createContext<ModelsContextValue | null>(null)

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

  const allModels = data?.availableModels ?? []

  const filterByModalities = useCallback(
    (models: AvailableModel[], modalities: Array<AvailableModel['modality']>) =>
      models.filter(model => modalities.includes(model.modality)),
    []
  )

  const textModels = useMemo(
    () => filterByModalities(allModels, ['TEXT_TO_TEXT']),
    [allModels, filterByModalities]
  )
  const imageModels = useMemo(
    () => filterByModalities(allModels, ['TEXT_TO_IMAGE', 'TEXT_AND_IMAGE_TO_IMAGE']),
    [allModels, filterByModalities]
  )
  const videoModels = useMemo(
    () => filterByModalities(allModels, ['TEXT_TO_VIDEO']),
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

export const useModels = (): ModelsContextValue => {
  const context = useContext(ModelsContext)
  if (!context) {
    throw new Error('useModels must be used within ModelsProvider')
  }
  return context
}
