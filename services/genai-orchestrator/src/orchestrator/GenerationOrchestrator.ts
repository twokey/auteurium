import { Logger } from '@aws-lambda-powertools/logger'
import type { GenerationRequest, GenerationResponse, GenerationRecord, StreamingChunk } from '@auteurium/shared-types'
import { ProviderRegistry } from '../providers/registry'
import { getModelConfig } from '../config/models'

const logger = new Logger({ serviceName: 'generation-orchestrator' })

export interface OrchestrationContext {
  userId: string
  snippetId: string
  projectId: string
}

/**
 * Main orchestrator for GenAI operations
 * Handles provider selection, request routing, error handling, and cost tracking
 */
export class GenerationOrchestrator {
  private apiKeys: Map<string, string> = new Map()

  /**
   * Set API key for a provider
   * @param provider - Provider name (gemini, openai, etc.)
   * @param apiKey - API key from Secrets Manager
   */
  setApiKey(provider: string, apiKey: string): void {
    this.apiKeys.set(provider, apiKey)
  }

  /**
   * Generate content using specified model
   * @param request - Generation parameters
   * @param context - User and snippet context
   * @returns Generated content with metadata
   */
  async generate(
    request: GenerationRequest,
    context: OrchestrationContext
  ): Promise<GenerationResponse> {
    const startTime = Date.now()

    try {
      // Get model configuration
      const modelConfig = getModelConfig(request.modelId)
      if (!modelConfig) {
        throw new Error(`Model not found: ${request.modelId}`)
      }

      if (!modelConfig.enabled) {
        throw new Error(`Model is disabled: ${request.modelId}`)
      }

      logger.info('Starting generation', {
        userId: context.userId,
        snippetId: context.snippetId,
        projectId: context.projectId,
        modelId: request.modelId,
        provider: modelConfig.provider
      })

      // Get provider instance
      const provider = ProviderRegistry.getProvider(modelConfig.provider)

      // Initialize provider with API key
      const apiKey = this.apiKeys.get(modelConfig.provider)
      if (!apiKey) {
        throw new Error(`API key not configured for provider: ${modelConfig.provider}`)
      }

      await provider.initialize(apiKey)

      // Validate model support
      if (!provider.isModelSupported(request.modelId)) {
        throw new Error(`Model not supported by provider: ${request.modelId}`)
      }

      // Generate content
      const response = await provider.generate(request)

      const totalTime = Date.now() - startTime
      logger.info('Generation completed', {
        userId: context.userId,
        snippetId: context.snippetId,
        modelId: request.modelId,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        totalTimeMs: totalTime
      })

      return response
    } catch (error) {
      logger.error('Generation failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: context.userId,
        snippetId: context.snippetId,
        modelId: request.modelId
      })
      throw error
    }
  }

  /**
   * Generate content with streaming support. Invokes onChunk for each streamed update.
   */
  async generateStream(
    request: GenerationRequest,
    context: OrchestrationContext,
    onChunk: (chunk: StreamingChunk) => void | Promise<void>
  ): Promise<GenerationResponse> {
    const startTime = Date.now()

    try {
      const modelConfig = getModelConfig(request.modelId)
      if (!modelConfig) {
        throw new Error(`Model not found: ${request.modelId}`)
      }

      if (!modelConfig.enabled) {
        throw new Error(`Model is disabled: ${request.modelId}`)
      }

      logger.info('Starting streaming generation', {
        userId: context.userId,
        snippetId: context.snippetId,
        projectId: context.projectId,
        modelId: request.modelId,
        provider: modelConfig.provider
      })

      const provider = ProviderRegistry.getProvider(modelConfig.provider)
      const apiKey = this.apiKeys.get(modelConfig.provider)
      if (!apiKey) {
        throw new Error(`API key not configured for provider: ${modelConfig.provider}`)
      }

      await provider.initialize(apiKey)

      if (!provider.isModelSupported(request.modelId)) {
        throw new Error(`Model not supported by provider: ${request.modelId}`)
      }

      const streamRequest: GenerationRequest = {
        ...request,
        stream: true
      }

      const streamFn = provider.generateStream?.bind(provider)

      if (!streamFn) {
        logger.warn('Provider does not support streaming, falling back to standard generation', {
          provider: provider.name,
          modelId: request.modelId
        })

        const response = await provider.generate(streamRequest)
        await onChunk({
          content: response.content,
          isComplete: true,
          tokensUsed: response.tokensUsed
        })
        return response
      }

      const response = await streamFn(streamRequest, async (chunk: StreamingChunk) => {
        await onChunk(chunk)
      })

      const totalTime = Date.now() - startTime
      logger.info('Streaming generation completed', {
        userId: context.userId,
        snippetId: context.snippetId,
        modelId: request.modelId,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        totalTimeMs: totalTime
      })

      return response
    } catch (error) {
      logger.error('Streaming generation failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: context.userId,
        snippetId: context.snippetId,
        modelId: request.modelId
      })
      throw error
    }
  }

  /**
   * Create a generation record for database storage
   * @param request - Original generation request
   * @param response - Generation response
   * @param context - User and snippet context
   * @returns Record ready for DynamoDB
   */
  createGenerationRecord(
    request: GenerationRequest,
    response: GenerationResponse,
    context: OrchestrationContext
  ): Omit<GenerationRecord, 'id' | 'createdAt'> {
    const modelConfig = getModelConfig(request.modelId)

    return {
      userId: context.userId,
      snippetId: context.snippetId,
      projectId: context.projectId,
      modelProvider: modelConfig?.provider ?? 'unknown',
      modelId: request.modelId,
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      result: response.content,
      tokensUsed: response.tokensUsed,
      cost: response.cost,
      generationTimeMs: response.generationTimeMs
    }
  }
}
