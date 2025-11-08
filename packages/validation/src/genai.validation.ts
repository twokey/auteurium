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
  modality: z.enum([
    'text-to-text',
    'text-to-image',
    'text-and-image-to-image',
    'text-to-video',
    'text-to-audio'
  ]).optional()
})

export const generationHistoryInputSchema = z.object({
  snippetId: z.string().min(1, 'Snippet ID is required')
})

export const createScenesInputSchema = z.object({
  modelId: z.string().min(1, 'Model ID is required'),
  prompt: z.string()
    .min(1, 'Prompt cannot be empty')
    .max(50000, 'Prompt exceeds maximum length of 50000 characters'),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8192).optional()
})

export const MAX_SCENES = 100

export const generateVideoInputSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  snippetId: z.string().min(1, 'Snippet ID is required'),
  modelId: z.string().min(1, 'Model ID is required'),
  duration: z.number().int().min(4).max(8).optional(),
  aspectRatio: z.enum(['default', '16:9', '9:16', '1:1']).optional(),
  resolution: z.enum(['512', '720p', '1080p']).optional(),
  style: z.enum(['general', 'anime']).optional(),
  seed: z.number().int().min(0).max(999999).optional(),
  movementAmplitude: z.enum(['auto', 'small', 'medium', 'large']).optional()
})

export const MAX_REFERENCE_IMAGES = 7 // Vidu Q1 supports up to 7 images
export const MAX_VIDEO_PROMPT_LENGTH = 2000

export type GenerateContentInput = z.infer<typeof generateContentInputSchema>
export type AvailableModelsInput = z.infer<typeof availableModelsInputSchema>
export type GenerationHistoryInput = z.infer<typeof generationHistoryInputSchema>
export type CreateScenesInput = z.infer<typeof createScenesInputSchema>
export type GenerateVideoInput = z.infer<typeof generateVideoInputSchema>
