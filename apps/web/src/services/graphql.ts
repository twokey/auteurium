import { generateClient } from 'aws-amplify/api'

// Lazy initialization pattern to avoid race condition
// The client is created on first use, ensuring Amplify.configure() has been called
// Using 'any' to avoid excessive type depth issues with Amplify's recursive client types
let client: any = null

/**
 * Get the GraphQL client, creating it if necessary.
 * Uses lazy initialization to ensure Amplify is configured before client creation.
 * Authentication is handled automatically via Amplify.configure() in config/amplify.ts
 */
export const getClient = () => {
  client ??= generateClient()
  return client
}

// Error handler utility for logging GraphQL errors
export const logGraphQLErrors = (errors: { message: string; locations?: unknown; path?: unknown }[]) => {
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

export default getClient
