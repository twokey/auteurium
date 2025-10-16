export enum ModelProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  CUSTOM = 'custom'
}

export enum GenerationModality {
  TEXT_TO_TEXT = 'text-to-text',
  TEXT_TO_IMAGE = 'text-to-image',
  TEXT_AND_IMAGE_TO_IMAGE = 'text-and-image-to-image',
  TEXT_TO_VIDEO = 'text-to-video',
  TEXT_TO_AUDIO = 'text-to-audio'
}

export interface ModelConfig {
  id: string
  provider: ModelProvider
  modelId: string
  modality: GenerationModality
  displayName: string
  maxTokens?: number
  costPerToken?: number
  enabled: boolean
  description?: string
}

export interface GenerationRequest {
  modelId: string
  prompt: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  inputImages?: string[] // S3 keys or URLs for multimodal generation
}

export interface GenerationResponse {
  content: string
  tokensUsed: number
  cost: number
  modelUsed: string
  generationTimeMs: number
}

export interface MediaAsset {
  type: 'image' | 'video' | 'audio'
  url: string
  s3Key: string
  metadata: Record<string, unknown>
}

export interface GenerationRecord {
  id: string
  userId: string
  snippetId: string
  projectId: string
  modelProvider: string
  modelId: string
  prompt: string
  systemPrompt?: string
  result: string
  tokensUsed: number
  cost: number
  generationTimeMs: number
  createdAt: string
}

export interface StreamingChunk {
  content: string
  isComplete: boolean
  tokensUsed?: number
}
