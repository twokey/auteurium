import { getEnabledModels, getModelsByModality } from '@auteurium/genai-orchestrator'
import { GenerationModality } from '@auteurium/shared-types'
import { Logger } from '@aws-lambda-powertools/logger'

import { handleError } from '../../utils/errors'

import type {
  GenerationModality as OrchestratorGenerationModality,
  ModelConfig as OrchestratorModelConfig,
  ModelProvider as OrchestratorModelProvider
} from '@auteurium/shared-types'
import type { AppSyncResolverHandler } from 'aws-lambda'

const logger = new Logger({ serviceName: 'genai-available-models' })

type GraphQLModelProvider = 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'CUSTOM'
type GraphQLGenerationModality = 'TEXT_TO_TEXT' | 'TEXT_TO_IMAGE' | 'TEXT_TO_VIDEO' | 'TEXT_TO_AUDIO'

interface GraphQLModelConfig {
  id: string
  provider: GraphQLModelProvider
  modelId: string
  modality: GraphQLGenerationModality
  displayName: string
  description: string | null
  maxTokens: number | null
  costPerToken: number | null
  enabled: boolean
}

const providerToGraphQL: Record<OrchestratorModelProvider, GraphQLModelProvider> = {
  gemini: 'GEMINI',
  openai: 'OPENAI',
  anthropic: 'ANTHROPIC',
  custom: 'CUSTOM'
}

const modalityToGraphQL: Record<OrchestratorGenerationModality, GraphQLGenerationModality> = {
  [GenerationModality.TEXT_TO_TEXT]: 'TEXT_TO_TEXT',
  [GenerationModality.TEXT_TO_IMAGE]: 'TEXT_TO_IMAGE',
  [GenerationModality.TEXT_TO_VIDEO]: 'TEXT_TO_VIDEO',
  [GenerationModality.TEXT_TO_AUDIO]: 'TEXT_TO_AUDIO'
}

const graphQLToModality: Record<GraphQLGenerationModality, OrchestratorGenerationModality> = {
  TEXT_TO_TEXT: GenerationModality.TEXT_TO_TEXT,
  TEXT_TO_IMAGE: GenerationModality.TEXT_TO_IMAGE,
  TEXT_TO_VIDEO: GenerationModality.TEXT_TO_VIDEO,
  TEXT_TO_AUDIO: GenerationModality.TEXT_TO_AUDIO
}

const toGraphQLModelConfig = (model: OrchestratorModelConfig): GraphQLModelConfig => ({
  id: model.id,
  provider: providerToGraphQL[model.provider] ?? 'CUSTOM',
  modelId: model.modelId,
  modality: modalityToGraphQL[model.modality] ?? 'TEXT_TO_TEXT',
  displayName: model.displayName,
  description: model.description ?? null,
  maxTokens: model.maxTokens ?? null,
  costPerToken: model.costPerToken ?? null,
  enabled: model.enabled
})

interface AvailableModelsArgs {
  modality?: GraphQLGenerationModality
}

/**
 * Query resolver: availableModels
 * Returns list of available LLM models, optionally filtered by modality
 */
export const handler: AppSyncResolverHandler<AvailableModelsArgs, GraphQLModelConfig[]> = async (event) => {
  try {
    const { modality } = event.arguments

    logger.info('Fetching available models', { modality })

    const orchestratorModality = modality ? graphQLToModality[modality] : undefined

    const availableModels = await Promise.resolve(
      orchestratorModality
        ? getModelsByModality(orchestratorModality)
        : getEnabledModels()
    )

    const models = availableModels
      .filter(model => model.enabled)
      .map(toGraphQLModelConfig)

    logger.info('Available models retrieved', {
      modality,
      count: models.length,
      models: models.map(m => ({ id: m.id, enabled: m.enabled }))
    })

    return models
  } catch (error) {
    logger.error('Failed to fetch available models', {
      error: error instanceof Error ? error.message : String(error),
      modality: event.arguments.modality
    })

    handleError(error, logger, {
      operation: 'availableModels',
      modality: event.arguments.modality
    })

    // Return empty array as fallback
    return []
  }
}
