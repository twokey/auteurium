export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

export interface PaginationInput {
  limit?: number
  offset?: number
  cursor?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  totalCount: number
  hasNextPage: boolean
  nextCursor?: string
}