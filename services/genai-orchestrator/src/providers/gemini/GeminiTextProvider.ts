import { GoogleGenAI } from '@google/genai'
import { Logger } from '@aws-lambda-powertools/logger'

import type {
  GenerationRequest,
  GenerationResponse,
  ModelConfig,
  StreamingChunk
} from '@auteurium/shared-types'
import type { ITextProvider } from '../base'
import { getModelsByProvider } from '../../config/models'
import { ModelProvider } from '@auteurium/shared-types'

const logger = new Logger({ serviceName: 'gemini-text-provider' })

/**
 * Gemini text-to-text provider implementation
 * Uses Google Gen AI SDK (@google/genai)
 */
export class GeminiTextProvider implements ITextProvider {
  readonly name = 'gemini'
  private client: GoogleGenAI | null = null
  private apiKey: string | null = null

  async initialize(apiKey: string): Promise<void> {
    this.apiKey = apiKey
    this.client = new GoogleGenAI({ apiKey })
    logger.info('Gemini provider initialized')
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    if (!this.client) {
      throw new Error('Gemini provider not initialized. Call initialize() first.')
    }

    const startTime = Date.now()

    try {
      // Validate request
      await this.validatePrompt(request.prompt)

      // Build prompt with optional system instruction
      const fullPrompt = request.systemPrompt
        ? `${request.systemPrompt}\n\n${request.prompt}`
        : request.prompt

      logger.info('Generating content with Gemini', {
        modelId: request.modelId,
        promptLength: request.prompt.length,
        hasSystemPrompt: !!request.systemPrompt
      })

      // Generate content using new SDK
      const response = await this.client.models.generateContent({
        model: request.modelId,
        contents: fullPrompt,
        config: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 2048,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      })

      const text = response.text ?? ''

      // Calculate metrics
      const generationTimeMs = Date.now() - startTime
      const tokensUsed = this.estimateTokens(request.prompt) + this.estimateTokens(text)
      const cost = this.calculateCost(tokensUsed, request.modelId)

      logger.info('Generation completed', {
        modelId: request.modelId,
        tokensUsed,
        cost,
        generationTimeMs
      })

      return {
        content: text,
        tokensUsed,
        cost,
        modelUsed: request.modelId,
        generationTimeMs
      }
    } catch (error) {
      logger.error('Generation failed', {
        error: error instanceof Error ? error.message : String(error),
        modelId: request.modelId
      })
      throw error
    }
  }

  async generateStream(
    request: GenerationRequest,
    onChunk: (chunk: StreamingChunk) => void
  ): Promise<GenerationResponse> {
    if (!this.client) {
      throw new Error('Gemini provider not initialized. Call initialize() first.')
    }

    const startTime = Date.now()
    let fullContent = ''

    try {
      await this.validatePrompt(request.prompt)

      const fullPrompt = request.systemPrompt
        ? `${request.systemPrompt}\n\n${request.prompt}`
        : request.prompt

      logger.info('Starting streaming generation', {
        modelId: request.modelId,
        promptLength: request.prompt.length
      })

      // Generate content stream using new SDK
      const response = await this.client.models.generateContentStream({
        model: request.modelId,
        contents: fullPrompt,
        config: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 2048,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      })

      // Stream chunks
      for await (const chunk of response) {
        const chunkText = chunk.text ?? ''
        fullContent += chunkText

        onChunk({
          content: chunkText,
          isComplete: false
        })
      }

      // Send final chunk
      await onChunk({
        content: '',
        isComplete: true,
        tokensUsed: this.estimateTokens(request.prompt) + this.estimateTokens(fullContent)
      })

      const generationTimeMs = Date.now() - startTime
      const tokensUsed = this.estimateTokens(request.prompt) + this.estimateTokens(fullContent)
      const cost = this.calculateCost(tokensUsed, request.modelId)

      logger.info('Streaming generation completed', {
        modelId: request.modelId,
        tokensUsed,
        cost,
        generationTimeMs
      })

      return {
        content: fullContent,
        tokensUsed,
        cost,
        modelUsed: request.modelId,
        generationTimeMs
      }
    } catch (error) {
      logger.error('Streaming generation failed', {
        error: error instanceof Error ? error.message : String(error),
        modelId: request.modelId
      })
      throw error
    }
  }

  async getAvailableModels(): Promise<ModelConfig[]> {
    return getModelsByProvider(ModelProvider.GEMINI)
  }

  isModelSupported(modelId: string): boolean {
    const models = getModelsByProvider(ModelProvider.GEMINI)
    return models.some(model => model.modelId === modelId)
  }

  calculateCost(tokensUsed: number, modelId: string): number {
    const models = getModelsByProvider(ModelProvider.GEMINI)
    const model = models.find(m => m.modelId === modelId)

    if (!model || !model.costPerToken) {
      logger.warn('Cost per token not configured for model', { modelId })
      return 0
    }

    return tokensUsed * model.costPerToken
  }

  async validatePrompt(prompt: string): Promise<boolean> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty')
    }

    if (prompt.length > 50000) {
      throw new Error('Prompt exceeds maximum length of 50000 characters')
    }

    // Add more validation as needed (content filtering, etc.)
    return true
  }

  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    // Gemini uses SentencePiece tokenizer, this is an approximation
    return Math.ceil(text.length / 4)
  }
}
