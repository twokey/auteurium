import { z } from 'zod'

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
  zIndex: z.number().optional()
})

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
    // ignore, handled below
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'Content must be valid JSON'
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

export const createSnippetSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).optional().default('New snippet'),
  content: contentSchema,
  position: positionSchema,
  tags: z.array(z.string().min(1).max(50)).optional().default([]),
  createdFrom: z.string().uuid().optional(),
  snippetType: z.enum(['text', 'image', 'video', 'audio', 'generic']).optional().default('text')
})

export const updateSnippetSchema = z.object({
  title: z.string().optional(),
  content: contentUpdateSchema,
  position: positionSchema.optional(),
  tags: z.array(z.string().min(1).max(50)).optional()
})

export const snippetIdSchema = z.string().uuid()

export type CreateSnippetValidation = z.infer<typeof createSnippetSchema>
export type UpdateSnippetValidation = z.infer<typeof updateSnippetSchema>
