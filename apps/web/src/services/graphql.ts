import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { AuthService } from './auth'

// Create HTTP link
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_ENDPOINT || ''
})

// Auth link to add JWT token to requests
const authLink = setContext(async (_, { headers }) => {
  try {
    const token = await AuthService.getAccessToken()

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : ''
      }
    }
  } catch (error) {
    console.error('Error getting auth token:', error)
    return { headers }
  }
})

// Error link for handling GraphQL errors
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    })
  }

  if (networkError) {
    console.error('Network error:', networkError)
    
    // Handle authentication errors
    if (networkError.message.includes('401') || networkError.message.includes('Unauthorized')) {
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
            merge(_existing = [], incoming) {
              return incoming
            }
          }
        }
      },
      Snippet: {
        fields: {
          connections: {
            merge(_existing = [], incoming) {
              return incoming
            }
          },
          versions: {
            merge(_existing = [], incoming) {
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