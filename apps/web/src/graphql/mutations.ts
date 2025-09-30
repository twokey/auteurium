import { gql } from '@apollo/client'

// Project mutations
export const CREATE_PROJECT = gql`
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

export const UPDATE_PROJECT = gql`
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

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`

// Snippet mutations
export const CREATE_SNIPPET = gql`
  mutation CreateSnippet($input: CreateSnippetInput!) {
    createSnippet(input: $input) {
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
    }
  }
`

export const UPDATE_SNIPPET = gql`
  mutation UpdateSnippet($projectId: ID!, $id: ID!, $input: UpdateSnippetInput!) {
    updateSnippet(projectId: $projectId, id: $id, input: $input) {
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
    }
  }
`

export const DELETE_SNIPPET = gql`
  mutation DeleteSnippet($projectId: ID!, $id: ID!) {
    deleteSnippet(projectId: $projectId, id: $id)
  }
`

export const REVERT_SNIPPET = gql`
  mutation RevertSnippet($projectId: ID!, $id: ID!, $version: Int!) {
    revertSnippet(projectId: $projectId, id: $id, version: $version) {
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
    }
  }
`

// Connection mutations
export const CREATE_CONNECTION = gql`
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

export const UPDATE_CONNECTION = gql`
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

export const DELETE_CONNECTION = gql`
  mutation DeleteConnection($id: ID!) {
    deleteConnection(id: $id)
  }
`

// Admin mutations
export const CREATE_USER = gql`
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

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`

export const RESET_USER_PASSWORD = gql`
  mutation ResetUserPassword($id: ID!) {
    resetUserPassword(id: $id)
  }
`