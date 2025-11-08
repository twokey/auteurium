import type { VideoGenerationRequest, VideoGenerationResponse } from '@auteurium/shared-types'
import type { ILLMProvider } from './ILLMProvider'

/**
 * Interface for text-to-video and image-to-video generation providers
 * Future support for additional video generation providers
 */
export interface IVideoProvider extends ILLMProvider {
  /**
   * Generate video from text prompt and optional reference images
   * @param request - Video generation parameters
   * @returns Generated video with metadata
   */
  generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse>

  /**
   * Get supported video durations
   * @returns List of available durations in seconds
   */
  getSupportedDurations(): number[]

  /**
   * Get supported aspect ratios
   * @returns List of available aspect ratios (e.g., ["16:9", "9:16", "1:1"])
   */
  getSupportedAspectRatios(): string[]

  /**
   * Get supported resolutions
   * @returns List of available resolutions (e.g., ["720p", "1080p"])
   */
  getSupportedResolutions(): string[]

  /**
   * Get supported styles
   * @returns List of available styles (e.g., ["general", "anime"])
   */
  getSupportedStyles(): string[]
}
