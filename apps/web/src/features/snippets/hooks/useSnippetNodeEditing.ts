import { useCallback, useEffect, useRef, useState } from 'react'

import type { EditableField } from '../../../types'

interface DraftValues {
  textField1: string
}

export interface UseSnippetNodeEditingReturn {
  activeField: EditableField | null
  draftValues: DraftValues
  savingField: EditableField | null
  textField1Ref: React.RefObject<HTMLTextAreaElement | null>
  setActiveField: (field: EditableField | null) => void
  setDraftValue: (field: EditableField, value: string) => void
  setSavingField: (field: EditableField | null) => void
  syncDraftFromSnippet: (snippet: { textField1: string }) => void
  focusField: () => void
}

/**
 * useSnippetNodeEditing - Manage inline editing state for snippet fields
 * Handles: active field, draft values, saving state, ref management
 */
export const useSnippetNodeEditing = (
  initialSnippet: { textField1: string }
): UseSnippetNodeEditingReturn => {
  const [activeField, setActiveField] = useState<EditableField | null>(null)
  const [draftValues, setDraftValues] = useState<DraftValues>({
    textField1: initialSnippet.textField1
  })
  const [savingField, setSavingField] = useState<EditableField | null>(null)
  const textField1Ref = useRef<HTMLTextAreaElement | null>(null)

  // Sync draft values from snippet when not editing
  useEffect(() => {
    if (activeField === 'textField1') return

    setDraftValues((prev) => {
      if (prev.textField1 === initialSnippet.textField1) {
        return prev
      }

      return {
        ...prev,
        textField1: initialSnippet.textField1
      }
    })
  }, [initialSnippet.textField1, activeField])

  // Set draft value
  const setDraftValue = useCallback((field: EditableField, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [field]: value
    }))
  }, [])

  // Sync draft from external snippet
  const syncDraftFromSnippet = useCallback(
    (snippet: { textField1: string }) => {
      setDraftValues({
        textField1: snippet.textField1
      })
    },
    []
  )

  // Focus field
  const focusField = useCallback(() => {
    setTimeout(() => {
      textField1Ref.current?.focus()
    }, 0)
  }, [])

  return {
    activeField,
    draftValues,
    savingField,
    textField1Ref,
    setActiveField,
    setDraftValue,
    setSavingField,
    syncDraftFromSnippet,
    focusField
  }
}

