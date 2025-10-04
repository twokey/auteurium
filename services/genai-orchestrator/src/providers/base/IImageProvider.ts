import type { GenerationRequest, MediaAsset } from '@auteurium/shared-types'
import type { ILLMProvider } from './ILLMProvider'

export interface ImageGenerationRequest extends Omit<GenerationRequest, 'systemPrompt'> {
  width?: number
  height?: number
  style?: string
  negativePrompt?: string
}

export interface ImageGenerationResponse {
  image: MediaAsset
  tokensUsed: number
  cost: number
  modelUsed: string
  generationTimeMs: number
}

/**
 * Interface for text-to-image generation providers
 * Future support for DALL-E, Midjourney, Stable Diffusion, etc.
 */
export interface IImageProvider extends ILLMProvider {
  /**
   * Generate image from text prompt
   * @param request - Image generation parameters
   * @returns Generated image with metadata
   */
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>

  /**
   * Get supported image sizes
   * @returns List of available width/height combinations
   */
  getSupportedSizes(): Array<{ width: number; height: number }>
}
