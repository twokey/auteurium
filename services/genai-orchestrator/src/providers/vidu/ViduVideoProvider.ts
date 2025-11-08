import { Logger } from '@aws-lambda-powertools/logger'
import type { ModelConfig, VideoGenerationRequest, VideoGenerationResponse, VideoMetadata } from '@auteurium/shared-types'
import type { IVideoProvider } from '../base/IVideoProvider'
import { getModelsByProvider } from '../../config/models'
import { ModelProvider, GenerationModality } from '@auteurium/shared-types'

const logger = new Logger({ serviceName: 'vidu-video-provider' })

interface ViduTaskResponse {
  taskId: string
  status: 'waiting' | 'processing' | 'succeed' | 'failed'
  videoUrl?: string
  error?: string
}

/**
 * Vidu video generation provider implementation
 * Supports text-to-video and image-to-video generation
 */
export class ViduVideoProvider implements IVideoProvider {
  readonly name = 'vidu-video'
  private apiKey: string | null = null
  private baseUrl = 'https://api.vidu.com/ent/v2'
  private maxPollingAttempts = 60 // 5 minutes with 5 second intervals
  private pollingInterval = 5000 // 5 seconds

  async initialize(apiKey: string): Promise<void> {
    this.apiKey = apiKey
    logger.info('Vidu video provider initialized')
  }

  async generate(): Promise<never> {
    throw new Error('Video provider does not support text generation. Use generateVideo() instead.')
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    if (!this.apiKey) {
      throw new Error('Vidu provider not initialized. Call initialize() first.')
    }

    const startTime = Date.now()

    try {
      // Validate prompt
      await this.validatePrompt(request.prompt)

      // Determine endpoint based on whether images are provided
      const endpoint = request.inputImages && request.inputImages.length > 0
        ? 'reference2video'
        : 'text2video'

      logger.info('Generating video with Vidu', {
        modelId: request.modelId,
        endpoint,
        promptLength: request.prompt.length,
        imageCount: request.inputImages?.length || 0,
        duration: request.duration,
        aspectRatio: request.aspectRatio
      })

      // Submit video generation task
      const taskResponse = await this.submitVideoTask(endpoint, request)

      // Poll for completion
      const finalResponse = await this.pollTaskStatus(taskResponse.taskId)

      if (finalResponse.status === 'failed') {
        throw new Error(`Video generation failed: ${finalResponse.error || 'Unknown error'}`)
      }

      if (!finalResponse.videoUrl) {
        throw new Error('No video URL returned from Vidu')
      }

      // Download video from Vidu URL
      const videoBuffer = await this.downloadVideo(finalResponse.videoUrl)

      const generationTimeMs = Date.now() - startTime
      const cost = this.calculateCost(1, request.modelId)

      const metadata: VideoMetadata = {
        duration: request.duration || 4,
        resolution: request.resolution || '720p',
        aspectRatio: request.aspectRatio || '16:9',
        style: request.style,
        seed: request.seed,
        format: 'mp4',
        fileSize: videoBuffer.length,
        movementAmplitude: request.movementAmplitude
      }

      logger.info('Video generation completed', {
        modelId: request.modelId,
        cost,
        generationTimeMs,
        videoSizeBytes: videoBuffer.length
      })

      return {
        videoUrl: finalResponse.videoUrl,
        videoBuffer,
        metadata,
        tokensUsed: 1, // Vidu charges per video, not tokens
        cost,
        modelUsed: request.modelId,
        generationTimeMs,
        taskId: taskResponse.taskId
      }
    } catch (error) {
      logger.error('Video generation failed', {
        error: error instanceof Error ? error.message : String(error),
        modelId: request.modelId
      })
      throw error
    }
  }

  private async submitVideoTask(endpoint: string, request: VideoGenerationRequest): Promise<ViduTaskResponse> {
    const url = `${this.baseUrl}/${endpoint}`

    const body: Record<string, unknown> = {
      model: request.modelId,
      prompt: request.prompt
    }

    // Add optional parameters
    if (request.inputImages && request.inputImages.length > 0) {
      body.images = request.inputImages
    }
    if (request.duration) {
      body.duration = String(request.duration)
    }
    if (request.aspectRatio) {
      body.aspect_ratio = request.aspectRatio
    }
    if (request.resolution) {
      body.resolution = request.resolution
    }
    if (request.style) {
      body.style = request.style
    }
    if (request.seed !== undefined) {
      body.seed = String(request.seed)
    }
    if (request.movementAmplitude) {
      body.movement_amplitude = request.movementAmplitude
    }

    logger.info('Submitting Vidu task', { url, model: request.modelId })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Vidu API error (${response.status}): ${errorText}`)
    }

    const data = await response.json() as ViduTaskResponse

    logger.info('Vidu task submitted', { taskId: data.taskId, status: data.status })

    return data
  }

  private async pollTaskStatus(taskId: string): Promise<ViduTaskResponse> {
    let attempts = 0

    while (attempts < this.maxPollingAttempts) {
      attempts++

      // Wait before polling (except first attempt)
      if (attempts > 1) {
        await this.sleep(this.pollingInterval)
      }

      const status = await this.checkTaskStatus(taskId)

      logger.info('Polling Vidu task', {
        taskId,
        status: status.status,
        attempt: attempts,
        maxAttempts: this.maxPollingAttempts
      })

      if (status.status === 'succeed' || status.status === 'failed') {
        return status
      }
    }

    throw new Error(`Video generation timed out after ${this.maxPollingAttempts} attempts`)
  }

  private async checkTaskStatus(taskId: string): Promise<ViduTaskResponse> {
    const url = `${this.baseUrl}/generation/${taskId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${this.apiKey}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Vidu status check error (${response.status}): ${errorText}`)
    }

    return await response.json() as ViduTaskResponse
  }

  private async downloadVideo(videoUrl: string): Promise<Buffer> {
    logger.info('Downloading video from Vidu', { videoUrl })

    const response = await fetch(videoUrl)

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getAvailableModels(): Promise<ModelConfig[]> {
    const models = getModelsByProvider(ModelProvider.VIDU)
    return models.filter(model => model.modality === GenerationModality.TEXT_TO_VIDEO)
  }

  isModelSupported(modelId: string): boolean {
    const models = getModelsByProvider(ModelProvider.VIDU)
    return models.some(model => model.modelId === modelId && model.modality === GenerationModality.TEXT_TO_VIDEO)
  }

  calculateCost(videosGenerated: number, modelId: string): number {
    const models = getModelsByProvider(ModelProvider.VIDU)
    const model = models.find(m => m.modelId === modelId)

    if (!model || !model.costPerToken) {
      logger.warn('Cost per video not configured for model', { modelId })
      return 0
    }

    // For Vidu, costPerToken represents cost per video
    return videosGenerated * model.costPerToken
  }

  async validatePrompt(prompt: string): Promise<boolean> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty')
    }

    // Vidu has a 2000-2500 character limit
    if (prompt.length > 2000) {
      throw new Error('Prompt exceeds maximum length of 2000 characters')
    }

    return true
  }

  getSupportedDurations(): number[] {
    return [4, 8]
  }

  getSupportedAspectRatios(): string[] {
    return ['default', '16:9', '9:16', '1:1']
  }

  getSupportedResolutions(): string[] {
    return ['512', '720p', '1080p']
  }

  getSupportedStyles(): string[] {
    return ['general', 'anime']
  }
}
