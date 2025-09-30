import type { User } from '@auteurium/shared-types'
import type { Logger } from '@aws-lambda-powertools/logger'

export interface GraphQLContext {
  user?: User
  isAdmin: boolean
  requestId: string
  logger: Logger
}
