import { type Snippet } from '@auteurium/shared-types'
import { z } from 'zod'

import { getProjectById } from '../../database/projects'
import { combineSnippetConnectionsLogic } from '../../database/snippet-combine'
import {
  createSnippet,
  deleteSnippet,
  revertSnippetToVersion,
  updateSnippet
} from '../../database/snippets'
import { requireAuth, requireOwnership, validateInput } from '../../middleware/validation'
import { createNotFoundError } from '../../utils/errors'
import { withSignedImageUrl, withSignedImageUrls } from '../../utils/snippetImages'

import type { GraphQLContext } from '../../types/context'

// Validation schemas
const createSnippetSchema = z.object({
  input: z.object({
    projectId: z.string(),
    title: z.string().optional().default('New snippet'),
    textField1: z.string().optional().default(''),
    textField2: z.string().optional().default(''),
    position: z.object({
      x: z.number(),
      y: z.number()
    }).optional().default({ x: 0, y: 0 }),
    tags: z.array(z.string()).optional().default([]),
    categories: z.array(z.string()).optional().default([])
  })
})

const updateSnippetSchema = z.object({
  projectId: z.string(),
  id: z.string(),
  input: z.object({
    title: z.string().optional(),
    textField1: z.string().optional(),
    textField2: z.string().optional(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }).optional(),
    tags: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional()
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

    const createdSnippet = await createSnippet(input, user.id)
    return await withSignedImageUrl(createdSnippet, context.logger)
  },

  // Update an existing snippet
  updateSnippet: async (
    _parent: unknown,
    args: unknown,
    context: GraphQLContext
  ): Promise<Snippet> => {
    const { projectId, id: snippetId, input } = validateInput(updateSnippetSchema, args)
    const user = requireAuth(context.user)

    context.logger.info('Updating snippet', {
      projectId,
      snippetId,
      userId: user.id
    })

    // The updateSnippet function will verify ownership
    const updatedSnippet = await updateSnippet(projectId, snippetId, input, user.id)
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
          y: z.number()
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

  // Combine connected snippets' textField2 values
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
      userId: user.id,
      newTextLength: updatedSnippet.textField2.length
    })

    return await withSignedImageUrl(updatedSnippet, context.logger)
  }
}
