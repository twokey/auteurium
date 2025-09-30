import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'

import { AuthService } from './auth'

// Create HTTP link
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_ENDPOINT ?? ''
})

// Auth link to add JWT token to requests
interface AuthLinkContext {
  headers?: Record<string, string>
}

const authLink = setContext(async (_operation, context: AuthLinkContext) => {
  const existingHeaders: Record<string, string> = context.headers
    ? { ...context.headers }
    : {}

  try {
    const token = await AuthService.getAccessToken()

    return {
      headers: {
        ...existingHeaders,
        authorization: token ? `Bearer ${token}` : ''
      }
    }
  } catch (error) {
    console.error('Error getting auth token:', error)
    return { headers: existingHeaders }
  }
})

// Error link for handling GraphQL errors
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach((graphQLError) => {
      const { message, locations, path } = graphQLError
      const formattedLocations = locations
        ?.map(({ line, column }) => `${line}:${column}`)
        .join(', ') ?? 'unknown'
      const formattedPath = path?.join(' > ') ?? 'unknown'

      console.error('GraphQL error', {
        message,
        locations: formattedLocations,
        path: formattedPath
      })
    })
  }

  if (networkError) {
    console.error('Network error:', networkError)

    // Handle authentication errors
    const message = 'message' in networkError ? networkError.message : undefined
    if (message && (message.includes('401') || message.includes('Unauthorized'))) {
      // TODO: Redirect to login or refresh token
      console.error('Authentication error - user may need to login again')
    }
  }
})

// Configure Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Project: {
        fields: {
          snippets: {
            merge(_existing: unknown[] = [], incoming: unknown[]) {
              return incoming
            }
          }
        }
      },
      Snippet: {
        fields: {
          connections: {
            merge(_existing: unknown[] = [], incoming: unknown[]) {
              return incoming
            }
          },
          versions: {
            merge(_existing: unknown[] = [], incoming: unknown[]) {
              return incoming
            }
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all'
    },
    query: {
      errorPolicy: 'all'
    }
  }
})

export default apolloClient
