import { generateClient } from 'aws-amplify/api'

// Create the Amplify GraphQL client
// Authentication is handled automatically via Amplify.configure() in config/amplify.ts
export const client = generateClient()

// Error handler utility for logging GraphQL errors
export const logGraphQLErrors = (errors: Array<{ message: string; locations?: unknown; path?: unknown }>) => {
  errors.forEach((error) => {
    const formattedLocations = error.locations
      ? JSON.stringify(error.locations)
      : 'unknown'
    const formattedPath = error.path
      ? Array.isArray(error.path) ? error.path.join(' > ') : JSON.stringify(error.path)
      : 'unknown'

    console.error('GraphQL error', {
      message: error.message,
      locations: formattedLocations,
      path: formattedPath
    })
  })
}

export default client
