import { useCallback, useState } from 'react'

import { useToast } from '../../../shared/store/toastStore'

import type { EditableField } from '../../../types'

export interface UseSnippetNodeActionsReturn {
  handleFieldSave: (
    field: EditableField,
    value: string,
    onUpdateContent: (changes: Partial<Record<EditableField, string>>) => Promise<void>
  ) => Promise<void>
  handleCombine: (onCombine: () => Promise<void>) => Promise<void>
  handleGenerateImage: (onGenerateImage: (modelId?: string) => void, modelId?: string) => void
  handleDelete: (onDelete: () => void) => void
  isCombining: boolean
  isImageLoading: boolean
  setIsImageLoading: (loading: boolean) => void
}

/**
 * useSnippetNodeActions - Manage action handlers for snippet node
 * Handles: field saving, combining, image generation, deletion
 */
export const useSnippetNodeActions = (): UseSnippetNodeActionsReturn => {
  const toast = useToast()
  const [isCombining, setIsCombining] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(true)

  // Handle field save
  const handleFieldSave = useCallback(
    async (
      field: EditableField,
      value: string,
      onUpdateContent: (changes: Partial<Record<EditableField, string>>) => Promise<void>
    ) => {
      try {
        await onUpdateContent({ [field]: value })
      } catch (error) {
        console.error(`Failed to save ${field}:`, error)
        toast.error(`Failed to save ${field}`)
        throw error
      }
    },
    [toast]
  )

  // Handle combine
  const handleCombine = useCallback(
    async (onCombine: () => Promise<void>) => {
      const confirmed = window.confirm('Combine this snippet with its connected snippets? This cannot be undone.')
      if (!confirmed) return

      setIsCombining(true)
      try {
        await onCombine()
        toast.success('Snippet combined successfully')
      } catch (error) {
        console.error('Failed to combine:', error)
        toast.error('Failed to combine snippet')
        throw error
      } finally {
        setIsCombining(false)
      }
    },
    [toast]
  )

  // Handle generate image
  const handleGenerateImage = useCallback(
    (onGenerateImage: (modelId?: string) => void, modelId?: string) => {
      try {
        setIsImageLoading(true)
        onGenerateImage(modelId)
      } catch (error) {
        console.error('Failed to generate image:', error)
        toast.error('Failed to generate image')
        setIsImageLoading(false)
      }
    },
    [toast]
  )

  // Handle delete
  const handleDelete = useCallback((onDelete: () => void) => {
    const confirmed = window.confirm('Are you sure you want to delete this snippet? This cannot be undone.')
    if (!confirmed) return

    try {
      onDelete()
      toast.success('Snippet deleted')
    } catch (error) {
      console.error('Failed to delete:', error)
      toast.error('Failed to delete snippet')
    }
  }, [toast])

  return {
    handleFieldSave,
    handleCombine,
    handleGenerateImage,
    handleDelete,
    isCombining,
    isImageLoading,
    setIsImageLoading
  }
}

