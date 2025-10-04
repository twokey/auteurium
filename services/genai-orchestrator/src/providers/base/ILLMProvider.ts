import type { GenerationRequest, GenerationResponse, ModelConfig, StreamingChunk } from '@auteurium/shared-types'

/**
 * Base interface for all LLM providers
 * This abstraction allows swapping providers without changing client code
 */
export interface ILLMProvider {
  /**
   * Provider identifier (gemini, openai, anthropic, etc.)
   */
  readonly name: string

  /**
   * Initialize the provider with API credentials
   * @param apiKey - API key from AWS Secrets Manager
   */
  initialize(apiKey: string): Promise<void>

  /**
   * Generate content using the LLM
   * @param request - Generation parameters
   * @returns Generated content with metadata
   */
  generate(request: GenerationRequest): Promise<GenerationResponse>

  /**
   * Generate content with streaming support
   * @param request - Generation parameters
   * @param onChunk - Callback for each streamed chunk
   * @returns Final generation response
   */
  generateStream?(
    request: GenerationRequest,
    onChunk: (chunk: StreamingChunk) => void
  ): Promise<GenerationResponse>

  /**
   * Get available models for this provider
   * @returns List of supported models
   */
  getAvailableModels(): Promise<ModelConfig[]>

  /**
   * Validate if a model ID is supported
   * @param modelId - Model identifier
   */
  isModelSupported(modelId: string): boolean

  /**
   * Calculate cost for a generation request
   * @param tokensUsed - Number of tokens consumed
   * @param modelId - Model identifier
   */
  calculateCost(tokensUsed: number, modelId: string): number
}
