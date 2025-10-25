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
  required: (value: any): string | null => {
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
  trimAll: <T extends Record<string, any>>(data: T): T => {
    const trimmed = {} as T
    for (const [key, value] of Object.entries(data)) {
      trimmed[key as keyof T] =
        typeof value === 'string' ? (value.trim() as any) : value
    }
    return trimmed
  },

  /**
   * Remove empty fields from an object
   */
  removeEmpty: <T extends Record<string, any>>(data: T): Partial<T> => {
    const result = {} as Partial<T>
    for (const [key, value] of Object.entries(data)) {
      if (value !== '' && value !== null && value !== undefined) {
        result[key as keyof T] = value
      }
    }
    return result
  },

  /**
   * Convert form data to FormData object for multipart uploads
   */
  toFormData: (data: Record<string, any>): FormData => {
    const formData = new FormData()
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof File) {
        formData.append(key, value)
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          formData.append(`${key}[${index}]`, item)
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
  fromFormData: <T extends Record<string, any>>(formData: FormData): Partial<T> => {
    const result: Partial<T> = {}
    formData.forEach((value, key) => {
      result[key as keyof T] = value as any
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
  mapGraphQLError: (error: any): string => {
    if (error.graphQLErrors && error.graphQLErrors.length > 0) {
      return error.graphQLErrors[0].message
    }
    if (error.message) return error.message
    return 'An error occurred'
  },

  /**
   * Extract validation errors from API response
   */
  extractValidationErrors: (error: any): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (error.graphQLErrors) {
      error.graphQLErrors.forEach((gqlError: any) => {
        if (gqlError.extensions?.validationErrors) {
          Object.assign(errors, gqlError.extensions.validationErrors)
        }
      })
    }

    if (error.fieldErrors) {
      Object.assign(errors, error.fieldErrors)
    }

    return errors
  },

  /**
   * Check if error is validation error
   */
  isValidationError: (error: any): boolean => {
    return (
      error.graphQLErrors?.some((e: any) => e.extensions?.validationErrors) ||
      !!error.fieldErrors
    )
  },

  /**
   * Check if error is auth error
   */
  isAuthError: (error: any): boolean => {
    const message = error.message?.toLowerCase() || ''
    return message.includes('unauthorized') || message.includes('not authenticated')
  },

  /**
   * Check if error is network error
   */
  isNetworkError: (error: any): boolean => {
    return error.networkError !== undefined || error.message?.includes('network')
  }
}

/**
 * Form field helpers
 */

export const FormFields = {
  /**
   * Get field value safely
   */
  getFieldValue: <T extends Record<string, any>>(
    data: T,
    field: keyof T,
    defaultValue: any = ''
  ): any => {
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
  hasChanges: <T extends Record<string, any>>(
    original: T,
    current: T
  ): boolean => {
    return JSON.stringify(original) !== JSON.stringify(current)
  },

  /**
   * Get changed fields
   */
  getChanges: <T extends Record<string, any>>(
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
  isPristine: <T extends Record<string, any>>(
    original: T,
    current: T
  ): boolean => {
    return !FormState.hasChanges(original, current)
  }
}


