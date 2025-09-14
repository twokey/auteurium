import { Amplify } from 'aws-amplify'
import type { ResourcesConfig } from 'aws-amplify'

// These values would normally come from environment variables
// and would be set during the CDK deployment process
const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      // These will be populated by the CDK deployment
      userPoolId: process.env.VITE_USER_POOL_ID || '',
      userPoolClientId: process.env.VITE_USER_POOL_CLIENT_ID || '',

      // Optional: if you want to use hosted UI
      loginWith: {
        oauth: {
          domain: process.env.VITE_OAUTH_DOMAIN || '',
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: [process.env.VITE_OAUTH_REDIRECT_SIGNIN || 'http://localhost:3000'],
          redirectSignOut: [process.env.VITE_OAUTH_REDIRECT_SIGNOUT || 'http://localhost:3000'],
          responseType: 'code'
        }
      }
    }
  },

  API: {
    GraphQL: {
      endpoint: process.env.VITE_GRAPHQL_ENDPOINT || '',
      region: process.env.VITE_AWS_REGION || 'us-east-1',
      defaultAuthMode: 'userPool'
    }
  }
}

export const configureAmplify = () => {
  Amplify.configure(amplifyConfig)
}

export default amplifyConfig