import { GenerationModality, ModelConfig, ModelProvider } from '@auteurium/shared-types'

/**
 * Central registry of all available LLM models
 * Add new models here as providers are implemented
 */
export const MODEL_REGISTRY: ModelConfig[] = [
  // Gemini Models - Flash-Lite is default
  {
    id: 'gemini-2.5-flash-lite',
    provider: ModelProvider.GEMINI,
    modelId: 'gemini-2.5-flash-lite',
    modality: GenerationModality.TEXT_TO_TEXT,
    displayName: 'Gemini 2.5 Flash-Lite',
    description: 'Fastest and most cost-efficient model',
    maxTokens: 8192,
    costPerToken: 0.0000001, // $0.10 per million input tokens
    enabled: true
  },
  {
    id: 'gemini-2.5-flash',
    provider: ModelProvider.GEMINI,
    modelId: 'gemini-2.5-flash',
    modality: GenerationModality.TEXT_TO_TEXT,
    displayName: 'Gemini 2.5 Flash',
    description: 'Balanced model with 1M token context window',
    maxTokens: 8192,
    costPerToken: 0.0000003, // $0.30 per million input tokens
    enabled: true
  },
  {
    id: 'gemini-2.5-pro',
    provider: ModelProvider.GEMINI,
    modelId: 'gemini-2.5-pro',
    modality: GenerationModality.TEXT_TO_TEXT,
    displayName: 'Gemini 2.5 Pro',
    description: 'Most powerful model with complex reasoning capabilities',
    maxTokens: 8192,
    costPerToken: 0.00000125, // $1.25 per million input tokens
    enabled: true
  },

  // Imagen Models - Image Generation
  {
    id: 'imagen-4.0-fast-generate-001',
    provider: ModelProvider.GEMINI,
    modelId: 'imagen-4.0-fast-generate-001',
    modality: GenerationModality.TEXT_TO_IMAGE,
    displayName: 'Imagen 4 Fast',
    description: 'Fast, cost-effective image generation',
    costPerToken: 0.02, // $0.02 per image
    enabled: true
  },
  {
    id: 'gemini-2.5-flash-image',
    provider: ModelProvider.GEMINI,
    modelId: 'gemini-2.5-flash-image',
    modality: GenerationModality.TEXT_AND_IMAGE_TO_IMAGE,
    displayName: 'Gemini 2.5 Flash Image',
    description: 'Multimodal image generation from text and images (up to 3 input images)',
    costPerToken: 0.0387, // $30 per 1M tokens × 1,290 tokens per image = $0.0387 per image
    enabled: true
  },

  // Vidu Models - Video Generation (Vidu Q2 family only)
  {
    id: 'vidu-q2-pro',
    provider: ModelProvider.VIDU,
    modelId: 'viduq2pro',
    modality: GenerationModality.TEXT_TO_VIDEO,
    displayName: 'Vidu Q2 Pro',
    description: 'Premium Q2 Image-to-Video & Start-End (1-10s, up to 1080p)',
    costPerToken: 0.075, // Base cost for 1-second 720p generation
    enabled: true
  },
  {
    id: 'vidu-q2-turbo',
    provider: ModelProvider.VIDU,
    modelId: 'viduq2turbo',
    modality: GenerationModality.TEXT_TO_VIDEO,
    displayName: 'Vidu Q2 Turbo',
    description: 'Fast Q2 Image-to-Video & Start-End (1-10s, up to 1080p)',
    costPerToken: 0.03, // Base cost for 1-second 540p generation
    enabled: true
  },
  {
    id: 'vidu-q2',
    provider: ModelProvider.VIDU,
    modelId: 'viduq2',
    modality: GenerationModality.TEXT_TO_VIDEO,
    displayName: 'Vidu Q2 (Text & Reference)',
    description: 'Text-to-Video and Reference-to-Video (1-10s, up to 1080p)',
    costPerToken: 0.05, // Base cost for 1-second 540p text-to-video generation
    enabled: true
  },

  // OpenAI Models (disabled until provider is implemented)
  {
    id: 'gpt-4-turbo',
    provider: ModelProvider.OPENAI,
    modelId: 'gpt-4-turbo-preview',
    modality: GenerationModality.TEXT_TO_TEXT,
    displayName: 'GPT-4 Turbo',
    description: 'Most capable OpenAI model',
    maxTokens: 4096,
    costPerToken: 0.00003, // $30 per million tokens
    enabled: false
  },
  {
    id: 'gpt-3.5-turbo',
    provider: ModelProvider.OPENAI,
    modelId: 'gpt-3.5-turbo',
    modality: GenerationModality.TEXT_TO_TEXT,
    displayName: 'GPT-3.5 Turbo',
    description: 'Fast and affordable OpenAI model',
    maxTokens: 4096,
    costPerToken: 0.000003, // $3 per million tokens
    enabled: false
  }
]

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find(model => model.id === modelId)
}

/**
 * Get all enabled models
 */
export function getEnabledModels(): ModelConfig[] {
  return MODEL_REGISTRY.filter(model => model.enabled)
}

/**
 * Get models by modality
 */
export function getModelsByModality(modality?: GenerationModality): ModelConfig[] {
  const models = getEnabledModels()
  return modality ? models.filter(model => model.modality === modality) : models
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: ModelProvider): ModelConfig[] {
  return MODEL_REGISTRY.filter(model => model.provider === provider && model.enabled)
}
