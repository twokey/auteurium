import { Amplify, type ResourcesConfig } from 'aws-amplify'

// These values would normally come from environment variables
// and would be set during the CDK deployment process
const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      // These will be populated by the CDK deployment
      userPoolId: import.meta.env.VITE_USER_POOL_ID ?? '',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID ?? '',

      // Optional: if you want to use hosted UI
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_OAUTH_DOMAIN ?? '',
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: [
            import.meta.env.VITE_OAUTH_REDIRECT_SIGNIN ?? 'http://localhost:3000'
          ],
          redirectSignOut: [
            import.meta.env.VITE_OAUTH_REDIRECT_SIGNOUT ?? 'http://localhost:3000'
          ],
          responseType: 'code'
        }
      }
    }
  },

  API: {
    GraphQL: {
      endpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT ?? '',
      region: import.meta.env.VITE_AWS_REGION ?? 'us-east-1',
      defaultAuthMode: 'userPool'
    }
  }
}

/**
 * Validates and configures AWS Amplify
 * Checks for critical configuration values and logs warnings if missing
 */
export const configureAmplify = () => {
  const config = amplifyConfig
  const issues: string[] = []

  // Validate critical Auth configuration
  if (!config.Auth?.Cognito?.userPoolId) {
    issues.push('Missing VITE_USER_POOL_ID - Authentication will not work')
  }
  if (!config.Auth?.Cognito?.userPoolClientId) {
    issues.push('Missing VITE_USER_POOL_CLIENT_ID - Authentication will not work')
  }

  // Validate critical API configuration
  if (!config.API?.GraphQL?.endpoint) {
    issues.push('Missing VITE_GRAPHQL_ENDPOINT - GraphQL queries will fail')
  }

  // Log validation results
  if (issues.length > 0) {
    console.error('[Amplify] Configuration issues detected:')
    issues.forEach(issue => console.error(`  - ${issue}`))
    console.error('[Amplify] Please check your .env.local file and ensure all required variables are set')
  }

  // Configure Amplify
  Amplify.configure(config)

  // Success log
  console.warn('[Amplify] Configured successfully', {
    hasAuth: Boolean(config.Auth?.Cognito?.userPoolId),
    hasGraphQL: Boolean(config.API?.GraphQL?.endpoint),
    region: config.API?.GraphQL?.region
  })
}

export default amplifyConfig
