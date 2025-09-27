/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USER_POOL_ID?: string
  readonly VITE_USER_POOL_CLIENT_ID?: string
  readonly VITE_OAUTH_DOMAIN?: string
  readonly VITE_OAUTH_REDIRECT_SIGNIN?: string
  readonly VITE_OAUTH_REDIRECT_SIGNOUT?: string
  readonly VITE_GRAPHQL_ENDPOINT?: string
  readonly VITE_AWS_REGION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
