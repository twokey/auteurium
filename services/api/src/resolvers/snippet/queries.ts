import { type Snippet, type SnippetVersion } from '@auteurium/shared-types'
import { z } from 'zod'

import {
  getProjectSnippets,
  getSnippet,
  getSnippetVersions,
  getUserSnippets
} from '../../database/snippets'
import { enforceContentPrivacy, paginationValidation, requireAuth, validateInput } from '../../middleware/validation'
import { withSignedImageUrl, withSignedImageUrls } from '../../utils/snippetImages'

import type { GraphQLContext } from '../../types/context'

// Validation schemas
const getSnippetSchema = z.object({
  projectId: z.string(),
  snippetId: z.string()
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

    return snippet ? await withSignedImageUrl(snippet, context.logger) : null
  },

  // Get all snippets for a project
  projectSnippets: async (
    parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Snippet[]> => {
    // When called as a field resolver on Project, get projectId from parent
    // When called as a query, get projectId from args
    const parentObj = parent as { id?: string; projectId?: string } | null
    const argsObj = args as { projectId?: string } | null
    const projectId = parentObj?.id ?? parentObj?.projectId ?? argsObj?.projectId

    if (!projectId) {
      context.logger.error('projectId is required but not found', {
        parent,
        args,
        parentKeys: parentObj ? Object.keys(parentObj) : []
      })
      throw new Error('projectId is required')
    }

    const user = requireAuth(context.user)

    context.logger.info('Getting project snippets', { projectId, userId: user.id })

    // Note: getProjectSnippets already filters by userId for privacy
    const projectSnippets = await getProjectSnippets(projectId, user.id)
    return await withSignedImageUrls(projectSnippets, context.logger)
  },

  // Get all snippets for the authenticated user
  mySnippets: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<{ snippets: Snippet[], lastKey?: Record<string, unknown> }> => {
    const { limit = 20, offset = 0, lastKey } = validateInput(getUserSnippetsSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Getting user snippets', { userId: user.id, limit, offset })

    const result = await getUserSnippets(user.id, limit, lastKey as Record<string, unknown> | undefined)
    const snippetsWithImages = await withSignedImageUrls(result.snippets, context.logger)

    return {
      snippets: snippetsWithImages,
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

    // Note: getSnippetVersions takes limit as second parameter
    return await getSnippetVersions(snippetId, 50)
  }
}
