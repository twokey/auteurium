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
        textField1
        textField2
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
        connections {
          id
          targetSnippetId
          label
          createdAt
        }
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
        textField1
        textField2
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
        connections {
          id
          sourceSnippetId
          targetSnippetId
          label
          createdAt
          updatedAt
        }
      }
    }
  }
`

// Snippet queries
export const GET_SNIPPET = /* GraphQL */ `
  query GetSnippet($id: ID!) {
    snippet(id: $id) {
      id
      projectId
      textField1
      textField2
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
      connections {
        id
        sourceSnippetId
        targetSnippetId
        label
        createdAt
      }
      versions {
        id
        version
        textField1
        textField2
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
      textField1
      textField2
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
