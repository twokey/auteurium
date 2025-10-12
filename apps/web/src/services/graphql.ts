import { ApolloClient, InMemoryCache, ApolloLink, createHttpLink, from } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import { createAuthLink } from 'aws-appsync-auth-link'
import { createSubscriptionHandshakeLink } from 'aws-appsync-subscription-link'

import { AuthService } from './auth'

const httpUri = import.meta.env.VITE_GRAPHQL_ENDPOINT ?? ''
const region = import.meta.env.VITE_AWS_REGION ?? 'us-west-2'

const httpLink = createHttpLink({ uri: httpUri })

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
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
    const message = 'message' in networkError ? networkError.message : undefined

    const isExpectedStreamingError = typeof message === 'string' &&
      message.toLowerCase().includes('schema is not configured for subscriptions')

    if (!isExpectedStreamingError) {
      console.error('Network error:', networkError)
    } else {
      console.warn('Ignoring subscription network error (streaming not supported on this endpoint).')
    }

    if (message && (message.includes('401') || message.includes('Unauthorized'))) {
      console.error('Authentication error - user may need to login again')
    }
  }
})

const auth = {
  type: 'AMAZON_COGNITO_USER_POOLS' as const,
  jwtToken: async () => (await AuthService.getAccessToken()) ?? ''
}

const authLink = createAuthLink({ url: httpUri, region, auth })

const subscriptionLink = typeof window === 'undefined'
  ? httpLink
  : createSubscriptionHandshakeLink({ url: httpUri, region, auth }, httpLink)

const links: ApolloLink[] = [errorLink]

if (httpUri) {
  links.push(authLink as unknown as ApolloLink)
  links.push(subscriptionLink)
} else {
  links.push(httpLink)
}

export const apolloClient = new ApolloClient({
  link: from(links),
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
