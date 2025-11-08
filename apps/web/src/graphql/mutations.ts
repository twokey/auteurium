// Project mutations
export const CREATE_PROJECT = /* GraphQL */ `
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      description
      createdAt
      updatedAt
      lastModified
    }
  }
`

export const UPDATE_PROJECT = /* GraphQL */ `
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      name
      description
      createdAt
      updatedAt
      lastModified
    }
  }
`

export const DELETE_PROJECT = /* GraphQL */ `
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`

// Snippet mutations
export const CREATE_SNIPPET = /* GraphQL */ `
  mutation CreateSnippet($input: CreateSnippetInput!) {
    createSnippet(input: $input) {
      id
      projectId
      title
      textField1
      position {
        x
        y
      }
      tags
      categories
      version
      createdAt
      updatedAt
      snippetType
    }
  }
`

export const UPDATE_SNIPPET = /* GraphQL */ `
  mutation UpdateSnippet($projectId: ID!, $id: ID!, $input: UpdateSnippetInput!) {
    updateSnippet(projectId: $projectId, id: $id, input: $input) {
      id
      projectId
      title
      textField1
      position {
        x
        y
      }
      tags
      categories
      version
      createdAt
      updatedAt
      snippetType
    }
  }
`

export const UPDATE_SNIPPET_POSITIONS = /* GraphQL */ `
  mutation UpdateSnippetPositions($projectId: ID!, $updates: [UpdateSnippetPositionInput!]!) {
    updateSnippetPositions(projectId: $projectId, updates: $updates) {
      id
      projectId
      title
      textField1
      position {
        x
        y
      }
      tags
      categories
      version
      createdAt
      updatedAt
      snippetType
    }
  }
`

export const DELETE_SNIPPET = /* GraphQL */ `
  mutation DeleteSnippet($projectId: ID!, $id: ID!) {
    deleteSnippet(projectId: $projectId, id: $id)
  }
`

export const REVERT_SNIPPET = /* GraphQL */ `
  mutation RevertSnippet($projectId: ID!, $id: ID!, $version: Int!) {
    revertSnippet(projectId: $projectId, id: $id, version: $version) {
      id
      projectId
      title
      textField1
      position {
        x
        y
      }
      tags
      categories
      version
      createdAt
      updatedAt
      snippetType
    }
  }
`

export const GENERATE_SNIPPET_IMAGE = /* GraphQL */ `
  mutation GenerateSnippetImage($projectId: ID!, $snippetId: ID!, $modelId: ID) {
    generateSnippetImage(projectId: $projectId, snippetId: $snippetId, modelId: $modelId) {
      id
      projectId
      title
      textField1
      position {
        x
        y
      }
      tags
      categories
      version
      createdAt
      updatedAt
      imageUrl
      imageS3Key
      imageMetadata {
        width
        height
        aspectRatio
      }
    }
  }
`

export const GENERATE_SNIPPET_VIDEO = /* GraphQL */ `
  mutation GenerateSnippetVideo(
    $projectId: ID!
    $snippetId: ID!
    $modelId: ID!
    $duration: Int
    $aspectRatio: String
    $resolution: String
    $style: String
    $seed: Int
    $movementAmplitude: String
  ) {
    generateSnippetVideo(
      projectId: $projectId
      snippetId: $snippetId
      modelId: $modelId
      duration: $duration
      aspectRatio: $aspectRatio
      resolution: $resolution
      style: $style
      seed: $seed
      movementAmplitude: $movementAmplitude
    ) {
      id
      projectId
      title
      textField1
      position {
        x
        y
      }
      tags
      categories
      version
      createdAt
      updatedAt
      videoUrl
      videoS3Key
      videoMetadata {
        duration
        resolution
        aspectRatio
        style
        seed
        format
        fileSize
        movementAmplitude
      }
    }
  }
`

export const COMBINE_SNIPPET_CONNECTIONS = /* GraphQL */ `
  mutation CombineSnippetConnections($projectId: ID!, $snippetId: ID!) {
    combineSnippetConnections(projectId: $projectId, snippetId: $snippetId) {
      id
      projectId
      title
      textField1
      position {
        x
        y
      }
      tags
      categories
      version
      createdAt
      updatedAt
      imageUrl
      imageS3Key
      imageMetadata {
        width
        height
        aspectRatio
      }
      snippetType
    }
  }
`

// Connection mutations
export const CREATE_CONNECTION = /* GraphQL */ `
  mutation CreateConnection($input: CreateConnectionInput!) {
    createConnection(input: $input) {
      id
      projectId
      sourceSnippetId
      targetSnippetId
      label
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CONNECTION = /* GraphQL */ `
  mutation UpdateConnection($id: ID!, $input: UpdateConnectionInput!) {
    updateConnection(id: $id, input: $input) {
      id
      projectId
      sourceSnippetId
      targetSnippetId
      label
      createdAt
      updatedAt
    }
  }
`

export const DELETE_CONNECTION = /* GraphQL */ `
  mutation DeleteConnection($projectId: ID!, $connectionId: ID!) {
    deleteConnection(projectId: $projectId, connectionId: $connectionId)
  }
`

// Admin mutations
export const CREATE_USER = /* GraphQL */ `
  mutation CreateUser($email: String!, $name: String!, $temporaryPassword: String!) {
    createUser(email: $email, name: $name, temporaryPassword: $temporaryPassword) {
      id
      email
      name
      role
      createdAt
      updatedAt
    }
  }
`

export const DELETE_USER = /* GraphQL */ `
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`

export const RESET_USER_PASSWORD = /* GraphQL */ `
  mutation ResetUserPassword($id: ID!) {
    resetUserPassword(id: $id)
  }
`
