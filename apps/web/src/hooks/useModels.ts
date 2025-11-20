import { useContext } from 'react'

import { ModelsContext, type ModelsContextValue } from '../contexts/ModelsContext'

export const useModels = (): ModelsContextValue => {
  const context = useContext(ModelsContext)
  if (!context) {
    throw new Error('useModels must be used within ModelsProvider')
  }
  return context
}
