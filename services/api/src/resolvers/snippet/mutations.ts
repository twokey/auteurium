import { type Snippet, type SnippetField, type SnippetInput, type UpdateSnippetInput } from '@auteurium/shared-types'
import { z } from 'zod'

import { getProjectById } from '../../database/projects'
import {
  createSnippet,
  deleteSnippet,
  revertSnippetToVersion,
  updateSnippet
} from '../../database/snippets'
import { combineSnippetConnectionsLogic } from '../../database/snippet-combine'
import { requireAuth, requireOwnership, validateInput } from '../../middleware/validation'
import { createNotFoundError } from '../../utils/errors'
import { withSignedImageUrl, withSignedImageUrls } from '../../utils/snippetImages'

import type { GraphQLContext } from '../../types/context'

// Validation schemas
const snippetFieldSchema = z.object({
  label: z.string().optional(),
  value: z.string(),
  type: z.string().optional(),
  isSystem: z.boolean().optional(),
  order: z.number().optional()
})

const parseContentJson = <T>(
  value: string,
  ctx: z.RefinementCtx
): Record<string, T> => {
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, T>
    }
  } catch (error) {
    // Fall through to issue
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'Content must be a valid JSON object'
  })

  return {}
}

const contentSchema = z.union([
  z.record(snippetFieldSchema),
  z.string().transform((value, ctx) => parseContentJson<z.infer<typeof snippetFieldSchema>>(value, ctx))
]).pipe(z.record(snippetFieldSchema)).optional().default({})

const contentUpdateSchema = z.union([
  z.record(snippetFieldSchema.nullable()),
  z.string().transform((value, ctx) => parseContentJson<z.infer<typeof snippetFieldSchema> | null>(value, ctx))
]).pipe(z.record(snippetFieldSchema.nullable())).optional()

const parseJsonObject = (value: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch (error) {
    // Keep parsing failures non-fatal; validation has already run
    console.warn('Failed to parse JSON content string', { error })
  }

  return null
}

const normalizeContent = <T extends SnippetField | null>(content: unknown): Record<string, T> | undefined => {
  if (content === undefined || content === null) {
    return undefined
  }

  if (typeof content === 'string') {
    const parsed = parseJsonObject(content)
    return parsed ? parsed as Record<string, T> : undefined
  }

  if (typeof content === 'object' && !Array.isArray(content)) {
    return content as Record<string, T>
  }

  return undefined
}

const createSnippetSchema = z.object({
  input: z.object({
    projectId: z.string(),
    title: z.string().optional().default('New snippet'),
    content: contentSchema,
    position: z.object({
      x: z.number(),
      y: z.number(),
      zIndex: z.number().optional()
    }).optional().default({ x: 0, y: 0 }),
    tags: z.array(z.string()).optional().default([]),
    generated: z.boolean().optional().default(false),
    generationId: z.string().optional(),
    generationCreatedAt: z.string().optional(),
    snippetType: z.enum(['text', 'image', 'video', 'audio', 'generic', 'content']).optional().default('text')
  })
})

const updateSnippetSchema = z.object({
  projectId: z.string(),
    id: z.string(),
    input: z.object({
      title: z.string().optional(),
      content: contentUpdateSchema,
    position: z.object({
      x: z.number(),
      y: z.number(),
      zIndex: z.number().optional()
    }).optional(),
    tags: z.array(z.string()).optional(),
    generated: z.boolean().optional(),
    generationId: z.string().optional(),
    generationCreatedAt: z.string().optional()
  })
})

const deleteSnippetSchema = z.object({
  projectId: z.string(),
  id: z.string()
})

const revertSnippetSchema = z.object({
  projectId: z.string(),
  id: z.string(),
  version: z.number().min(1)
})

const combineSnippetSchema = z.object({
  projectId: z.string(),
  snippetId: z.string()
})

export const snippetMutations = {
  // Create a new snippet
  createSnippet: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Snippet> => {
    const { input } = validateInput(createSnippetSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Creating snippet', {
      projectId: input.projectId,
      userId: user.id
    })

    // Verify the user owns the project
    const project = await getProjectById(user.id, input.projectId)
    if (!project) {
      throw createNotFoundError('Project')
    }

    // Ensure project ownership
    requireOwnership(user, project.userId, 'project')

    const normalizedInput: SnippetInput = {
      ...input,
      content: normalizeContent<SnippetField>(input.content) ?? {}
    }

    const createdSnippet = await createSnippet(normalizedInput, user.id)
    return await withSignedImageUrl(createdSnippet, context.logger)
  },

  // Update an existing snippet
  updateSnippet: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Snippet> => {
    console.log('[Resolver] updateSnippet called with args:', JSON.stringify(args, null, 2))

    const { projectId, id: snippetId, input } = validateInput(updateSnippetSchema, args)
    const user = requireAuth(context.user)

    console.log('[Resolver] Validated input:', {
      projectId,
      snippetId,
      input,
      userId: user.id
    })

    context.logger.info('Updating snippet', {
      projectId,
      snippetId,
      userId: user.id,
      input
    })

    // The updateSnippet function will verify ownership
    const { content, ...restInput } = input
    const normalizedContent = normalizeContent<SnippetField | null>(content)
    const normalizedUpdate: UpdateSnippetInput = {
      ...restInput,
      ...(normalizedContent ? { content: normalizedContent } : {})
    }

    const updatedSnippet = await updateSnippet(projectId, snippetId, normalizedUpdate, user.id)

    console.log('[Resolver] Update completed, returning snippet:', {
      id: updatedSnippet.id,
      version: updatedSnippet.version
    })

    return await withSignedImageUrl(updatedSnippet, context.logger)
  },

  // Delete a snippet (with cascade delete of connections and versions)
  deleteSnippet: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<boolean> => {
    const { projectId, id: snippetId } = validateInput(deleteSnippetSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Deleting snippet', {
      projectId,
      snippetId,
      userId: user.id
    })

    await deleteSnippet(projectId, snippetId, user.id)

    context.logger.info('Snippet deleted successfully', {
      projectId,
      snippetId,
      userId: user.id
    })

    return true
  },

  // Revert snippet to a previous version
  revertSnippetToVersion: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Snippet> => {
    const { projectId, id: snippetId, version } = validateInput(revertSnippetSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Reverting snippet to version', {
      projectId,
      snippetId,
      targetVersion: version,
      userId: user.id
    })

    const revertedSnippet = await revertSnippetToVersion(projectId, snippetId, version, user.id)
    return await withSignedImageUrl(revertedSnippet, context.logger)
  },

  // Bulk update snippet positions (for canvas drag operations)
  updateSnippetPositions: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Snippet[]> => {
    const user = requireAuth(context.user)

    const bulkUpdateSchema = z.object({
      projectId: z.string(),
      updates: z.array(z.object({
        snippetId: z.string(),
        position: z.object({
          x: z.number(),
          y: z.number(),
          zIndex: z.number().optional()
        })
      }))
    })

    const { projectId, updates } = validateInput(bulkUpdateSchema, args)

    context.logger.info('Bulk updating snippet positions', {
      projectId,
      updateCount: updates.length,
      userId: user.id
    })

    const updatedSnippets: Snippet[] = []

    // Update each snippet position
    for (const update of updates) {
      const updatedSnippet = await updateSnippet(
        projectId,
        update.snippetId,
        { position: update.position },
        user.id
      )
      updatedSnippets.push(updatedSnippet)
    }

    context.logger.info('Bulk position update completed', {
      projectId,
      updatedCount: updatedSnippets.length,
      userId: user.id
    })

    return await withSignedImageUrls(updatedSnippets, context.logger)
  },

  // Combine connected snippets' content into the current snippet
  combineSnippetConnections: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Snippet> => {
    const { projectId, snippetId } = validateInput(combineSnippetSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Combining snippet connections', {
      projectId,
      snippetId,
      userId: user.id
    })

    // Verify the user owns the project
    const project = await getProjectById(user.id, projectId)
    if (!project) {
      throw createNotFoundError('Project')
    }

    // Ensure project ownership
    requireOwnership(user, project.userId, 'project')

    // Perform the combination logic
    const updatedSnippet = await combineSnippetConnectionsLogic(
      projectId,
      snippetId,
      user.id
    )

    context.logger.info('Snippet connections combined successfully', {
      projectId,
      snippetId,
      userId: user.id
    })

    return await withSignedImageUrl(updatedSnippet, context.logger)
  }
}
