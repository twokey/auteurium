export const GET_AVAILABLE_MODELS = /* GraphQL */ `
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

export const GENERATE_CONTENT = /* GraphQL */ `
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
export const GENERATE_CONTENT_STREAM = /* GraphQL */ `
  mutation GenerateContentStream($projectId: ID!, $snippetId: ID!, $input: GenerateContentInput!) {
    generateContentStream(projectId: $projectId, snippetId: $snippetId, input: $input) {
      content
      tokensUsed
      cost
      modelUsed
      generationTimeMs
    }
  }
`

export const GENERATION_STREAM_SUBSCRIPTION = /* GraphQL */ `
  subscription OnGenerationStream($snippetId: ID!) {
    onGenerationStream(snippetId: $snippetId) {
      snippetId
      content
      isComplete
      tokensUsed
    }
  }
`


