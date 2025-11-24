import { useCallback, useEffect, useRef, useState } from 'react'

import type { EditableField, SnippetField } from '../../../types'

export interface UseSnippetNodeEditingReturn {
  activeField: EditableField | null
  draftValues: Record<string, string>
  savingField: EditableField | null
  contentRef: React.RefObject<HTMLTextAreaElement | null>
  setActiveField: (field: EditableField | null) => void
  setDraftValue: (field: EditableField, value: string) => void
  setSavingField: (field: EditableField | null) => void
  syncDraftFromSnippet: (snippet: { content: Record<string, SnippetField> }) => void
  focusField: () => void
}

/**
 * useSnippetNodeEditing - Manage inline editing state for snippet fields
 * Handles: active field, draft values, saving state, ref management
 */
export const useSnippetNodeEditing = (
  initialSnippet: { content: Record<string, SnippetField> }
): UseSnippetNodeEditingReturn => {
  const [activeField, setActiveField] = useState<EditableField | null>(null)
  const [draftValues, setDraftValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(initialSnippet.content ?? {}).map(([key, field]) => [key, field.value])
    )
  )
  const [savingField, setSavingField] = useState<EditableField | null>(null)
  const contentRef = useRef<HTMLTextAreaElement | null>(null)

  // Sync draft values from snippet when not editing
  useEffect(() => {
    if (activeField) return

    setDraftValues((prev) => {
      const next = { ...prev }
      Object.entries(initialSnippet.content ?? {}).forEach(([key, field]) => {
        next[key] = field.value
      })
      return next
    })
  }, [initialSnippet.content, activeField])

  // Set draft value
  const setDraftValue = useCallback((field: EditableField, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [field]: value
    }))
  }, [])

  // Sync draft from external snippet
  const syncDraftFromSnippet = useCallback(
    (snippet: { content: Record<string, SnippetField> }) => {
      setDraftValues(
        Object.fromEntries(Object.entries(snippet.content ?? {}).map(([key, field]) => [key, field.value]))
      )
    },
    []
  )

  // Focus field
  const focusField = useCallback(() => {
    setTimeout(() => {
      contentRef.current?.focus()
    }, 0)
  }, [])

  return {
    activeField,
    draftValues,
    savingField,
    contentRef,
    setActiveField,
    setDraftValue,
    setSavingField,
    syncDraftFromSnippet,
    focusField
  }
}
