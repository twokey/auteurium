import { useCallback, useEffect, useRef, useState } from 'react'
import type { Snippet } from '../../../types'

type EditableField = 'textField1'

export interface SnippetFormState {
  title: string
  textField1: string
  tags: string[]
  categories: string[]
  tagInput: string
  categoryInput: string
}

export interface UseSnippetFormReturn {
  // State
  formState: SnippetFormState
  activeField: EditableField | null
  savingField: EditableField | null

  // Field refs for focus management
  textField1Ref: React.MutableRefObject<HTMLTextAreaElement | null>

  // Mutations
  setTitle: (title: string) => void
  setTextField1: (value: string) => void
  setTagInput: (value: string) => void
  setCategoryInput: (value: string) => void

  // Tag/Category management
  addTag: () => void
  removeTag: (tag: string) => void
  addCategory: () => void
  removeCategory: (category: string) => void

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
 * Handles: form fields, tags, categories, field activation/blur, autosave
 *
 * @param snippet - Initial snippet data
 * @param onFieldSave - Callback when a field is saved (for autosave)
 */
export const useSnippetForm = (
  snippet: Pick<Snippet, 'title' | 'textField1' | 'tags' | 'categories'>,
  onFieldSave?: (field: EditableField, value: string) => Promise<void>
): UseSnippetFormReturn => {
  // Form state
  const [formState, setFormState] = useState<SnippetFormState>({
    title: snippet.title && snippet.title.trim() !== '' ? snippet.title : 'New snippet',
    textField1: snippet.textField1 ?? '',
    tags: snippet.tags ?? [],
    categories: snippet.categories ?? [],
    tagInput: '',
    categoryInput: ''
  })

  // Field interaction state
  const [activeField, setActiveField] = useState<EditableField | null>(null)
  const [savingField, setSavingField] = useState<EditableField | null>(null)

  // Refs
  const textField1Ref = useRef<HTMLTextAreaElement | null>(null)
  const lastSavedValuesRef = useRef({
    textField1: snippet.textField1 ?? ''
  })

  // Reset form when snippet changes
  useEffect(() => {
    const nextTitle = snippet.title && snippet.title.trim() !== '' ? snippet.title : 'New snippet'
    setFormState({
      title: nextTitle,
      textField1: snippet.textField1 ?? '',
      tags: snippet.tags ?? [],
      categories: snippet.categories ?? [],
      tagInput: '',
      categoryInput: ''
    })
    setActiveField(null)
    setSavingField(null)
    lastSavedValuesRef.current = {
      textField1: snippet.textField1 ?? ''
    }
  }, [snippet])

  // Mutation handlers
  const setTitle = useCallback((title: string) => {
    setFormState(prev => ({ ...prev, title }))
  }, [])

  const setTextField1 = useCallback((value: string) => {
    setFormState(prev => ({ ...prev, textField1: value }))
  }, [])

  const setTagInput = useCallback((value: string) => {
    setFormState(prev => ({ ...prev, tagInput: value }))
  }, [])

  const setCategoryInput = useCallback((value: string) => {
    setFormState(prev => ({ ...prev, categoryInput: value }))
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

  // Category management
  const addCategory = useCallback(() => {
    const trimmedCategory = formState.categoryInput.trim()
    if (trimmedCategory && !formState.categories.includes(trimmedCategory)) {
      setFormState(prev => ({
        ...prev,
        categories: [...prev.categories, trimmedCategory],
        categoryInput: ''
      }))
    }
  }, [formState.categoryInput, formState.categories])

  const removeCategory = useCallback((categoryToRemove: string) => {
    setFormState(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat !== categoryToRemove)
    }))
  }, [])

  // Field focus management for autosave
  const focusField = useCallback(() => {
    const target = textField1Ref.current
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
  const handleFieldBlur = useCallback(async (field: EditableField) => {
    setActiveField(current => (current === field ? null : current))

    const currentValue = formState.textField1
    const lastSavedValue = lastSavedValuesRef.current[field]

    if (currentValue === lastSavedValue || !onFieldSave) {
      return
    }

    setSavingField(field)
    try {
      await onFieldSave(field, currentValue)
      lastSavedValuesRef.current[field] = currentValue
    } catch (error) {
      console.error('Failed to save field:', error)
      // Revert to last saved value
      setTextField1(lastSavedValue)
    } finally {
      setSavingField(null)
    }
  }, [formState.textField1, onFieldSave, setTextField1])

  return {
    formState,
    activeField,
    savingField,
    textField1Ref,
    setTitle,
    setTextField1,
    setTagInput,
    setCategoryInput,
    addTag,
    removeTag,
    addCategory,
    removeCategory,
    handleFieldActivate,
    handleFieldBlur,
    setActiveField,
    setSavingField,
    focusField
  }
}
