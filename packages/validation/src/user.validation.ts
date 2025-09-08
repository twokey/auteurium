import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128)
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional()
})

export const userIdSchema = z.string().uuid()

export type CreateUserValidation = z.infer<typeof createUserSchema>
export type UpdateUserValidation = z.infer<typeof updateUserSchema>