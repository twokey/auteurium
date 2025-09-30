import type { User } from '@auteurium/shared-types'

interface Logger {
  info: (message: string, metadata?: Record<string, unknown>) => void
  warn: (message: string, metadata?: Record<string, unknown>) => void
  error: (message: string, metadata?: Record<string, unknown>) => void
}

export interface GraphQLContext {
  user?: User
  isAdmin: boolean
  requestId: string
  logger: Logger
}
