import { GenerationModality, ModelConfig, ModelProvider } from '@auteurium/shared-types'

/**
 * Central registry of all available LLM models
 * Add new models here as providers are implemented
 */
export const MODEL_REGISTRY: ModelConfig[] = [
  // Gemini Models
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
