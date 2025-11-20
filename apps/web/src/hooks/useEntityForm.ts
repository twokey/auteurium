import { useCallback, useState } from 'react'

export interface UseEntityFormReturn<T> {
  formData: T
  isLoading: boolean
  error: Error | null
  updateField: <K extends keyof T>(field: K, value: T[K]) => void
  updateMultiple: (changes: Partial<T>) => void
  reset: (data?: T) => void
  setLoading: (loading: boolean) => void
  setError: (error: Error | null) => void
}

/**
 * useEntityForm - Generic form management hook for CRUD operations
 * Handles: form data, loading state, error handling, field updates
 * 
 * Usage:
 * ```typescript
 * const form = useEntityForm<User>({ name: '', email: '' })
 * form.updateField('name', 'John')
 * ```
 */
export const useEntityForm = <T extends Record<string, any>>(
  initialData: T
): UseEntityFormReturn<T> => {
  const [formData, setFormData] = useState<T>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Update single field
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }, [])

  // Update multiple fields at once
  const updateMultiple = useCallback((changes: Partial<T>) => {
    setFormData((prev) => ({
      ...prev,
      ...changes
    }))
  }, [])

  // Reset form to initial or provided data
  const reset = useCallback((data?: T) => {
    setFormData(data ?? initialData)
    setError(null)
  }, [initialData])

  return {
    formData,
    isLoading,
    error,
    updateField,
    updateMultiple,
    reset,
    setLoading: setIsLoading,
    setError
  }
}
