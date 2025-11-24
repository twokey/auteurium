export enum ModelProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  VIDU = 'vidu',
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
  generationId?: string
  generationCreatedAt?: string
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
  outputSnippetId?: string
  modelProvider: string
  modelId: string
  prompt: string
  systemPrompt?: string
  result: string
  tokensUsed: number
  cost: number
  generationTimeMs: number
  createdAt: string
  taskId?: string
  status?: VideoGenerationStatus
  videoS3Key?: string
  videoMetadata?: VideoMetadata
  errorMessage?: string
  videoRequest?: VideoGenerationRequestDetails
}

export interface StreamingChunk {
  content: string
  isComplete: boolean
  tokensUsed?: number
}

// Video Generation Types
export interface VideoMetadata {
  duration: number // in seconds
  resolution: string // e.g., "720p", "1080p"
  aspectRatio: string // e.g., "16:9", "9:16", "1:1"
  style?: string // e.g., "general", "anime"
  seed?: number
  format: string // e.g., "mp4"
  fileSize?: number // in bytes
  movementAmplitude?: string // e.g., "auto", "small", "medium", "large"
  model?: string
  taskId?: string
  bgm?: boolean
  credits?: number
  offPeak?: boolean
  createdAt?: string
}

export type VideoGenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface VideoGenerationRequestDetails {
  duration?: number
  aspectRatio?: string
  resolution?: string
  style?: string
  seed?: number
  movementAmplitude?: string
  inputImagesCount?: number
}

export interface VideoGenerationRequest {
  modelId: string
  prompt: string
  duration?: number // 4 or 8 seconds
  aspectRatio?: string // e.g., "16:9", "9:16", "1:1", "default"
  resolution?: string // e.g., "720p", "1080p", "512"
  style?: string // e.g., "general", "anime"
  seed?: number
  movementAmplitude?: string // e.g., "auto", "small", "medium", "large"
  inputImages?: string[] // URLs or S3 keys for reference images (image-to-video)
}

export interface VideoGenerationResponse {
  videoUrl?: string
  videoBuffer?: Buffer
  metadata?: VideoMetadata
  tokensUsed?: number
  cost: number
  modelUsed: string
  generationTimeMs: number
  taskId?: string // For async tracking
  status?: VideoGenerationStatus
  bgm?: boolean
  credits?: number
  offPeak?: boolean
}
