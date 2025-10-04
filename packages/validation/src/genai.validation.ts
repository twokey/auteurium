import { z } from 'zod'

/**
 * Validation schemas for GenAI operations
 */

export const generateContentInputSchema = z.object({
  modelId: z.string().min(1, 'Model ID is required'),
  prompt: z.string()
    .min(1, 'Prompt cannot be empty')
    .max(50000, 'Prompt exceeds maximum length of 50000 characters'),
  systemPrompt: z.string().max(10000, 'System prompt exceeds maximum length').optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8192).optional()
})

export const availableModelsInputSchema = z.object({
  modality: z.enum(['text-to-text', 'text-to-image', 'text-to-video', 'text-to-audio']).optional()
})

export const generationHistoryInputSchema = z.object({
  snippetId: z.string().min(1, 'Snippet ID is required')
})

export type GenerateContentInput = z.infer<typeof generateContentInputSchema>
export type AvailableModelsInput = z.infer<typeof availableModelsInputSchema>
export type GenerationHistoryInput = z.infer<typeof generationHistoryInputSchema>
