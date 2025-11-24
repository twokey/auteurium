import { useCallback, useEffect, useRef, useState } from 'react'

import type { Snippet } from '../../../types'
import { getPrimaryTextValue } from '../../../utils/snippetContent'

type EditableField = 'mainText'

export interface SnippetFormState {
  title: string
  mainText: string
  tags: string[]
  tagInput: string
}

export interface UseSnippetFormReturn {
  // State
  formState: SnippetFormState
  activeField: EditableField | null
  savingField: EditableField | null

  // Field refs for focus management
  mainTextRef: React.MutableRefObject<HTMLTextAreaElement | null>

  // Mutations
  setTitle: (title: string) => void
  setMainText: (value: string) => void
  setTagInput: (value: string) => void

  // Tag/Category management
  addTag: () => void
  removeTag: (tag: string) => void

  // Field management
  handleFieldActivate: (field: EditableField) => void
  handleFieldBlur: (field: EditableField) => void
  setActiveField: (field: EditableField | null) => void
  setSavingField: (field: EditableField | null) => void

  // Focus management
  focusField: () => void
}

/**
 * useSnippetForm - Manage snippet form state and interactions
 * Handles: form fields, tags, field activation/blur, autosave
 *
 * @param snippet - Initial snippet data
 * @param onFieldSave - Callback when a field is saved (for autosave)
 */
export const useSnippetForm = (
  snippet: Pick<Snippet, 'title' | 'content' | 'tags'>,
  onFieldSave?: (field: EditableField, value: string) => Promise<void>
): UseSnippetFormReturn => {
  const initialText = getPrimaryTextValue(snippet)
  // Form state
  const [formState, setFormState] = useState<SnippetFormState>({
    title: snippet.title && snippet.title.trim() !== '' ? snippet.title : 'New snippet',
    mainText: initialText,
    tags: snippet.tags ?? [],
    tagInput: ''
  })

  // Field interaction state
  const [activeField, setActiveField] = useState<EditableField | null>(null)
  const [savingField, setSavingField] = useState<EditableField | null>(null)

  // Refs
  const mainTextRef = useRef<HTMLTextAreaElement | null>(null)
  const lastSavedValuesRef = useRef({
    mainText: initialText
  })

  // Reset form when snippet changes
  useEffect(() => {
    const nextTitle = snippet.title && snippet.title.trim() !== '' ? snippet.title : 'New snippet'
    setFormState({
      title: nextTitle,
      mainText: getPrimaryTextValue(snippet),
      tags: snippet.tags ?? [],
      tagInput: ''
    })
    setActiveField(null)
    setSavingField(null)
    lastSavedValuesRef.current = {
      mainText: getPrimaryTextValue(snippet)
    }
  }, [snippet])

  // Mutation handlers
  const setTitle = useCallback((title: string) => {
    setFormState(prev => ({ ...prev, title }))
  }, [])

  const setMainText = useCallback((value: string) => {
    setFormState(prev => ({ ...prev, mainText: value }))
  }, [])

  const setTagInput = useCallback((value: string) => {
    setFormState(prev => ({ ...prev, tagInput: value }))
  }, [])

  // Tag management
  const addTag = useCallback(() => {
    const trimmedTag = formState.tagInput.trim()
    if (trimmedTag && !formState.tags.includes(trimmedTag)) {
      setFormState(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
        tagInput: ''
      }))
    }
  }, [formState.tagInput, formState.tags])

  const removeTag = useCallback((tagToRemove: string) => {
    setFormState(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }, [])

  // Field focus management for autosave
  const focusField = useCallback(() => {
    const target = mainTextRef.current
    if (target) {
      const length = target.value.length
      target.focus()
      target.setSelectionRange(length, length)
    }
  }, [])

  // Handle field activation
  const handleFieldActivate = useCallback((field: EditableField) => {
    if (savingField === field || activeField === field) return
    setActiveField(field)
    focusField()
  }, [activeField, savingField, focusField])

  // Handle field blur with autosave
  const handleFieldBlur = useCallback((field: EditableField) => {
    setActiveField(current => (current === field ? null : current))

    const currentValue = formState.mainText
    const lastSavedValue = lastSavedValuesRef.current[field]

    if (currentValue === lastSavedValue || !onFieldSave) {
      return
    }

    setSavingField(field)
    void (async () => {
      try {
        await onFieldSave(field, currentValue)
        lastSavedValuesRef.current[field] = currentValue
      } catch (error) {
        console.error('Failed to save field:', error)
        // Revert to last saved value
        setMainText(lastSavedValue)
      } finally {
        setSavingField(null)
      }
    })()
  }, [formState.mainText, onFieldSave, setMainText])

  return {
    formState,
    activeField,
    savingField,
    mainTextRef,
    setTitle,
    setMainText,
    setTagInput,
    addTag,
    removeTag,
    handleFieldActivate,
    handleFieldBlur,
    setActiveField,
    setSavingField,
    focusField
  }
}
