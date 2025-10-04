import { gql } from '@apollo/client'

export const GET_AVAILABLE_MODELS = gql`
  query GetAvailableModels($modality: GenerationModality!) {
    availableModels(modality: $modality) {
      id
      displayName
      description
      provider
      maxTokens
      costPerToken
    }
  }
`

export const GENERATE_CONTENT = gql`
  mutation GenerateContent($projectId: ID!, $snippetId: ID!, $input: GenerateContentInput!) {
    generateContent(projectId: $projectId, snippetId: $snippetId, input: $input) {
      content
      tokensUsed
      cost
      modelUsed
      generationTimeMs
    }
  }
`
