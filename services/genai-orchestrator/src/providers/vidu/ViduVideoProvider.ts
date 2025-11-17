import { Logger } from '@aws-lambda-powertools/logger'
import type { ModelConfig, VideoGenerationRequest, VideoGenerationResponse } from '@auteurium/shared-types'
import type { IVideoProvider } from '../base/IVideoProvider'
import { getModelConfig, getModelsByProvider } from '../../config/models'
import { ModelProvider, GenerationModality } from '@auteurium/shared-types'

const logger = new Logger({ serviceName: 'vidu-video-provider' })

type ViduTaskState = 'created' | 'queueing' | 'waiting' | 'processing' | 'succeed' | 'success' | 'failed'

interface ViduTaskResponse {
  task_id: string
  state: ViduTaskState
  err_code?: string
  error?: string
}

/**
 * Vidu video generation provider implementation
 * Supports text-to-video and image-to-video generation
 */
interface ViduVideoProviderOptions {
  webhookUrl?: string
}

export class ViduVideoProvider implements IVideoProvider {
  readonly name = 'vidu-video'
  private apiKey: string | null = null
  private baseUrl = 'https://api.vidu.com/ent/v2'
  private webhookUrl?: string

  constructor(options?: ViduVideoProviderOptions) {
    this.webhookUrl = options?.webhookUrl
  }

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
      const modelConfig = getModelConfig(request.modelId)
      if (!modelConfig) {
        throw new Error(`Model configuration not found for ${request.modelId}`)
      }

      // Validate prompt
      await this.validatePrompt(request.prompt)

      // Determine endpoint based on whether images are provided
      const endpoint = this.resolveEndpoint(request)
      const apiModelId = this.formatModelIdForEndpoint(modelConfig.modelId, endpoint)

      logger.info('Generating video with Vidu', {
        modelId: modelConfig.modelId,
        apiModelId,
        endpoint,
        promptLength: request.prompt.length,
        imageCount: request.inputImages?.length || 0,
        duration: request.duration,
        aspectRatio: request.aspectRatio
      })

      // Submit video generation task
      const taskResponse = await this.submitVideoTask(endpoint, request, apiModelId)

      const generationTimeMs = Date.now() - startTime
      const cost = this.calculateCost(1, request.modelId)

      logger.info('Video generation task submitted', {
        modelId: modelConfig.modelId,
        cost,
        generationTimeMs,
        taskId: taskResponse.task_id,
        webhookConfigured: Boolean(this.webhookUrl)
      })

      return {
        cost,
        modelUsed: modelConfig.modelId,
        generationTimeMs,
        taskId: taskResponse.task_id,
        status: 'PENDING'
      }
    } catch (error) {
      logger.error('Video generation failed', {
        error: error instanceof Error ? error.message : String(error),
        modelId: request.modelId
      })
      throw error
    }
  }

  private resolveEndpoint(request: VideoGenerationRequest): 'text2video' | 'img2video' {
    if (request.inputImages && request.inputImages.length > 0) {
      return 'img2video'
    }
    return 'text2video'
  }

  private formatModelIdForEndpoint(modelId: string, endpoint: 'text2video' | 'img2video'): string {
    if (endpoint === 'img2video') {
      const match = modelId.match(/^(viduq\d)([a-z]+)$/i)
      if (match) {
        return `${match[1]}-${match[2]}`.toLowerCase()
      }
    }
    return modelId
  }

  private async submitVideoTask(endpoint: string, request: VideoGenerationRequest, apiModelId: string): Promise<ViduTaskResponse> {
    const url = `${this.baseUrl}/${endpoint}`

    const body: Record<string, unknown> = {
      model: apiModelId,
      prompt: request.prompt,
      audio: false
    }

    // Add optional parameters
    if (request.inputImages && request.inputImages.length > 0) {
      body.images = request.inputImages
    }
    if (request.duration !== undefined) {
      body.duration = request.duration
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
      body.seed = request.seed
    }
    if (request.movementAmplitude) {
      body.movement_amplitude = request.movementAmplitude
    }

    if (this.webhookUrl) {
      body.callback_url = this.webhookUrl
      logger.info('Including callback URL for Vidu task', {
        callbackUrl: this.webhookUrl,
        endpoint: url
      })
    } else {
      logger.warn('No webhook URL configured for Vidu provider; callbacks will not be received')
    }

    logger.info('Submitting Vidu task', { url, model: request.modelId, requestBody: body })

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
      logger.error('Vidu API request failed', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        requestUrl: url,
        requestBody: body
      })
      throw new Error(`Vidu API error (${response.status}): ${errorText}`)
    }

    const data = await response.json() as ViduTaskResponse

    logger.info('Vidu task submitted successfully', {
      taskId: data.task_id,
      state: data.state,
      fullResponse: data
    })

    return data
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
    const model = getModelConfig(modelId)

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
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }

  getSupportedAspectRatios(): string[] {
    return ['default', '16:9', '9:16', '1:1']
  }

  getSupportedResolutions(): string[] {
    return ['540p', '720p', '1080p']
  }

  getSupportedStyles(): string[] {
    return ['general', 'anime']
  }
}
