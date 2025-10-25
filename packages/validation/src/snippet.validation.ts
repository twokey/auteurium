import { z } from 'zod'

const positionSchema = z.object({
  x: z.number(),
  y: z.number()
})

export const createSnippetSchema = z.object({
  projectId: z.string().uuid(),
  textField1: z.string().max(50000).optional().default(''),
  position: positionSchema,
  tags: z.array(z.string().min(1).max(50)).optional().default([]),
  categories: z.array(z.string().min(1).max(50)).optional().default([])
})

export const updateSnippetSchema = z.object({
  textField1: z.string().max(50000).optional(),
  position: positionSchema.optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  categories: z.array(z.string().min(1).max(50)).optional()
})

export const snippetIdSchema = z.string().uuid()

export type CreateSnippetValidation = z.infer<typeof createSnippetSchema>
export type UpdateSnippetValidation = z.infer<typeof updateSnippetSchema>