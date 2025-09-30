import { type Snippet, type SnippetVersion } from '@auteurium/shared-types'
import { z } from 'zod'

import {
  getProjectSnippets,
  getSnippet,
  getSnippetVersions,
  getUserSnippets
} from '../../database/snippets'
import { enforceContentPrivacy, paginationValidation, requireAuth, validateInput } from '../../middleware/validation'

import type { GraphQLContext } from '../../types/context'

// Validation schemas
const getSnippetSchema = z.object({
  projectId: z.string(),
  snippetId: z.string()
})

const getProjectSnippetsSchema = z.object({
  projectId: z.string()
})

const getUserSnippetsSchema = z.object({
  ...paginationValidation.shape,
  lastKey: z.string().optional()
})

const getSnippetVersionsSchema = z.object({
  snippetId: z.string()
})

export const snippetQueries = {
  // Get a single snippet by ID
  snippet: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Snippet | null> => {
    const { projectId, snippetId } = validateInput(getSnippetSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Getting snippet', { projectId, snippetId, userId: user.id })

    const snippet = await getSnippet(projectId, snippetId, user.id)

    if (snippet) {
      // Ensure content privacy - even admins cannot access other users' snippets
      enforceContentPrivacy(user, snippet.userId)
    }

    return snippet
  },

  // Get all snippets for a project
  projectSnippets: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Snippet[]> => {
    const { projectId } = validateInput(getProjectSnippetsSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Getting project snippets', { projectId, userId: user.id })

    // Note: getProjectSnippets already filters by userId for privacy
    return await getProjectSnippets(projectId, user.id)
  },

  // Get all snippets for the authenticated user
  mySnippets: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<{ snippets: Snippet[], lastKey?: string }> => {
    const { limit = 20, offset = 0, lastKey } = validateInput(getUserSnippetsSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Getting user snippets', { userId: user.id, limit, offset })

    const result = await getUserSnippets(user.id, limit, lastKey)

    return {
      snippets: result.snippets,
      lastKey: result.lastKey
    }
  },

  // Get versions for a snippet
  snippetVersions: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<SnippetVersion[]> => {
    const { snippetId } = validateInput(getSnippetVersionsSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Getting snippet versions', { snippetId, userId: user.id })

    // Note: getSnippetVersions already filters by userId for privacy
    return await getSnippetVersions(snippetId, user.id)
  }
}