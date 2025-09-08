import { User } from '@auteurium/shared-types'

export interface GraphQLContext {
  user?: User
  isAdmin: boolean
  requestId: string
  logger: any
}