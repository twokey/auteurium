import { useCallback, useState } from 'react'

import { useEntityForm, type UseEntityFormReturn } from './useEntityForm'

export interface UseModalFormReturn<T> {
  // Modal state
  isOpen: boolean
  openModal: (data?: T) => void
  closeModal: () => void
  
  // Form state (from useEntityForm)
  form: UseEntityFormReturn<T>
  
  // Combined operations
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (callback: (data: T) => Promise<void>) => Promise<void>
  resetAll: () => void
}

/**
 * useModalForm - Combined form + modal state management
 * Handles: modal visibility, form data, submission lifecycle
 * 
 * Usage:
 * ```typescript
 * const modal = useModalForm<User>({ name: '', email: '' })
 * modal.openModal()
 * await modal.onSubmit(async (data) => {
 *   await api.createUser(data)
 * })
 * ```
 */
export const useModalForm = <T extends Record<string, any>>(
  initialData: T
): UseModalFormReturn<T> => {
  const form = useEntityForm(initialData)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Open modal with optional data override
  const openModal = useCallback((data?: T) => {
    if (data) {
      form.updateMultiple(data)
    }
    setIsOpen(true)
  }, [form])

  // Close modal
  const closeModal = useCallback(() => {
    setIsOpen(false)
    setSubmitError(null)
  }, [])

  // Handle form submission
  const onSubmit = useCallback(
    async (callback: (data: T) => Promise<void>) => {
      setIsSubmitting(true)
      setSubmitError(null)
      try {
        await callback(form.formData)
        setIsOpen(false)
        form.reset()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Submission failed'
        setSubmitError(message)
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    [form]
  )

  // Reset everything
  const resetAll = useCallback(() => {
    form.reset()
    setIsOpen(false)
    setSubmitError(null)
  }, [form])

  return {
    isOpen,
    openModal,
    closeModal,
    form,
    isSubmitting,
    submitError,
    onSubmit,
    resetAll
  }
}


