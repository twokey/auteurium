/**
 * Form validation helpers
 */

export const FormValidation = {
  /**
   * Validate email format
   */
  email: (value: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value) return 'Email is required'
    if (!emailRegex.test(value)) return 'Invalid email format'
    return null
  },

  /**
   * Validate minimum length
   */
  minLength: (value: string, min: number): string | null => {
    if (!value) return `This field is required`
    if (value.length < min) return `Minimum ${min} characters required`
    return null
  },

  /**
   * Validate maximum length
   */
  maxLength: (value: string, max: number): string | null => {
    if (value.length > max) return `Maximum ${max} characters allowed`
    return null
  },

  /**
   * Validate required field
   */
  required: (value: unknown): string | null => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required'
    }
    return null
  },

  /**
   * Validate URL format
   */
  url: (value: string): string | null => {
    try {
      new URL(value)
      return null
    } catch {
      return 'Invalid URL format'
    }
  }
}

/**
 * Form data serialization helpers
 */

export const FormSerialization = {
  /**
   * Trim all string fields in an object
   */
  trimAll: <T extends Record<string, unknown>>(data: T): T => {
    const trimmed = {} as T
    for (const [key, value] of Object.entries(data)) {
      trimmed[key as keyof T] =
        (typeof value === 'string' ? value.trim() : value) as T[keyof T]
    }
    return trimmed
  },

  /**
   * Remove empty fields from an object
   */
  removeEmpty: <T extends Record<string, unknown>>(data: T): Partial<T> => {
    const result = {} as Partial<T>
    for (const [key, value] of Object.entries(data)) {
      if (value !== '' && value !== null && value !== undefined) {
        result[key as keyof T] = value as T[keyof T]
      }
    }
    return result
  },

  /**
   * Convert form data to FormData object for multipart uploads
   */
  toFormData: (data: Record<string, unknown>): FormData => {
    const formData = new FormData()
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof File) {
        formData.append(key, value)
      } else if (Array.isArray(value)) {
        value.forEach((item: unknown, index) => {
          formData.append(`${key}[${index}]`, String(item))
        })
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value))
      }
    }
    return formData
  },

  /**
   * Parse form data back from FormData object
   */
  fromFormData: <T extends Record<string, unknown>>(formData: FormData): Partial<T> => {
    const result: Partial<T> = {}
    formData.forEach((value, key) => {
      result[key as keyof T] = value as T[keyof T]
    })
    return result
  }
}

/**
 * Error mapping and normalization
 */

export const ErrorMapping = {
  /**
   * Map GraphQL errors to user-friendly messages
   */
  mapGraphQLError: (error: unknown): string => {
    if (error && typeof error === 'object') {
      if ('graphQLErrors' in error && Array.isArray(error.graphQLErrors) && error.graphQLErrors.length > 0) {
        const firstError = error.graphQLErrors[0]
        if (firstError && typeof firstError === 'object' && 'message' in firstError) {
          return String(firstError.message)
        }
      }
      if ('message' in error && typeof error.message === 'string') {
        return error.message
      }
    }
    return 'An error occurred'
  },

  /**
   * Extract validation errors from API response
   */
  extractValidationErrors: (error: unknown): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (error && typeof error === 'object') {
      if ('graphQLErrors' in error && Array.isArray(error.graphQLErrors)) {
        error.graphQLErrors.forEach((gqlError: unknown) => {
          if (
            gqlError &&
            typeof gqlError === 'object' &&
            'extensions' in gqlError &&
            gqlError.extensions &&
            typeof gqlError.extensions === 'object' &&
            'validationErrors' in gqlError.extensions &&
            gqlError.extensions.validationErrors &&
            typeof gqlError.extensions.validationErrors === 'object'
          ) {
            Object.assign(errors, gqlError.extensions.validationErrors)
          }
        })
      }

      if ('fieldErrors' in error && error.fieldErrors && typeof error.fieldErrors === 'object') {
        Object.assign(errors, error.fieldErrors)
      }
    }

    return errors
  },

  /**
   * Check if error is validation error
   */
  isValidationError: (error: unknown): boolean => {
    if (error && typeof error === 'object') {
      if ('graphQLErrors' in error && Array.isArray(error.graphQLErrors)) {
        return error.graphQLErrors.some((e: unknown) => {
          return (
            e &&
            typeof e === 'object' &&
            'extensions' in e &&
            e.extensions &&
            typeof e.extensions === 'object' &&
            'validationErrors' in e.extensions
          )
        })
      }
      if ('fieldErrors' in error && error.fieldErrors) {
        return true
      }
    }
    return false
  },

  /**
   * Check if error is auth error
   */
  isAuthError: (error: unknown): boolean => {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      const message = error.message.toLowerCase()
      return message.includes('unauthorized') || message.includes('not authenticated')
    }
    return false
  },

  /**
   * Check if error is network error
   */
  isNetworkError: (error: unknown): boolean => {
    if (error && typeof error === 'object') {
      if ('networkError' in error) {
        return true
      }
      if ('message' in error && typeof error.message === 'string' && error.message.includes('network')) {
        return true
      }
    }
    return false
  }
}

/**
 * Form field helpers
 */

export const FormFields = {
  /**
   * Get field value safely
   */
  getFieldValue: <T extends Record<string, unknown>>(
    data: T,
    field: keyof T,
    defaultValue: unknown = ''
  ): unknown => {
    return data?.[field] ?? defaultValue
  },

  /**
   * Build field error object
   */
  buildFieldError: (field: string, message: string) => ({
    field,
    message
  }),

  /**
   * Check if field has error
   */
  hasFieldError: (errors: Record<string, string>, field: string): boolean => {
    return !!errors?.[field]
  },

  /**
   * Get field error message
   */
  getFieldError: (errors: Record<string, string>, field: string): string | null => {
    return errors?.[field] || null
  }
}

/**
 * Form state helpers
 */

export const FormState = {
  /**
   * Check if form has changes
   */
  hasChanges: <T extends Record<string, unknown>>(
    original: T,
    current: T
  ): boolean => {
    return JSON.stringify(original) !== JSON.stringify(current)
  },

  /**
   * Get changed fields
   */
  getChanges: <T extends Record<string, unknown>>(
    original: T,
    current: T
  ): Partial<T> => {
    const changes: Partial<T> = {}
    for (const key in current) {
      if (original[key] !== current[key]) {
        changes[key] = current[key]
      }
    }
    return changes
  },

  /**
   * Check if form is pristine (unchanged from original)
   */
  isPristine: <T extends Record<string, unknown>>(
    original: T,
    current: T
  ): boolean => {
    return !FormState.hasChanges(original, current)
  }
}


