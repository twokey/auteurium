// User queries
export const GET_ME = /* GraphQL */ `
  query GetMe {
    me {
      id
      email
      name
      role
      createdAt
      updatedAt
    }
  }
`

// Project queries
export const GET_PROJECTS = /* GraphQL */ `
  query GetProjects {
    projects {
      id
      name
      description
      createdAt
      updatedAt
      lastModified
    }
  }
`

export const GET_PROJECT = /* GraphQL */ `
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      description
      createdAt
      updatedAt
      lastModified
      snippets {
        id
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
        imageS3Key
        videoUrl
        imageMetadata {
          width
          height
          aspectRatio
        }
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
        generated
        generationId
        generationCreatedAt
        createdFrom
        snippetType
      }
    }
  }
`

export const GET_PROJECT_WITH_SNIPPETS = /* GraphQL */ `
  query GetProjectWithSnippets($projectId: ID!) {
    project(id: $projectId) {
      id
      name
      description
      createdAt
      updatedAt
      lastModified
      snippets {
        id
        projectId
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
        imageS3Key
        videoUrl
        imageMetadata {
          width
          height
          aspectRatio
        }
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
        generated
        generationId
        generationCreatedAt
        createdFrom
        snippetType
      }
    }
  }
`

export const GET_PROJECT_CONNECTIONS = /* GraphQL */ `
  query GetProjectConnections($projectId: ID!, $limit: Int) {
    projectConnections(projectId: $projectId, limit: $limit) {
      id
      projectId
      sourceSnippetId
      targetSnippetId
      connectionType
      label
      createdAt
      updatedAt
    }
  }
`

// Snippet queries
export const GET_SNIPPET = /* GraphQL */ `
  query GetSnippet($id: ID!) {
    snippet(id: $id) {
      id
      projectId
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
      imageS3Key
      videoUrl
      imageMetadata {
        width
        height
        aspectRatio
      }
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
      generated
      generationId
      generationCreatedAt
      createdFrom
      snippetType
      versions {
        id
        version
        title
        content
        position {
          x
          y
          zIndex
        }
        tags
        createdAt
      }
    }
  }
`

export const GET_SNIPPET_VERSIONS = /* GraphQL */ `
  query GetSnippetVersions($snippetId: ID!) {
    snippetVersions(snippetId: $snippetId) {
      id
      version
      title
      content
      position {
        x
        y
        zIndex
      }
      tags
      createdAt
    }
  }
`

// Admin queries
export const GET_SYSTEM_ANALYTICS = /* GraphQL */ `
  query GetSystemAnalytics {
    systemAnalytics {
      totalUsers
      totalProjects
      totalSnippets
      averageSnippetsPerUser
    }
  }
`

export const GET_ALL_USERS = /* GraphQL */ `
  query GetAllUsers {
    users {
      id
      email
      name
      role
      createdAt
      updatedAt
    }
  }
`
