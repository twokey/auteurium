import { z } from 'zod'

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional()
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional()
})

export const projectIdSchema = z.string().uuid()

export type CreateProjectValidation = z.infer<typeof createProjectSchema>
export type UpdateProjectValidation = z.infer<typeof updateProjectSchema>