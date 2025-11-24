export const GET_AVAILABLE_MODELS = /* GraphQL */ `
  query GetAvailableModels {
    availableModels {
      id
      displayName
      description
      provider
      modality
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
      generationId
      generationCreatedAt
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
      generationId
      generationCreatedAt
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

export const CREATE_SCENES = /* GraphQL */ `
  mutation CreateScenes($projectId: ID!, $snippetId: ID!, $input: CreateScenesInput!) {
    createScenes(projectId: $projectId, snippetId: $snippetId, input: $input) {
      scenes {
        id
        projectId
        userId
        title
        content
        position {
          x
          y
          zIndex
        }
        tags
        version
        createdAt
        updatedAt
        createdFrom
        generated
        generationId
        generationCreatedAt
        snippetType
      }
      tokensUsed
      cost
      modelUsed
      generationTimeMs
    }
  }
`
