/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USER_POOL_ID?: string
  readonly VITE_USER_POOL_CLIENT_ID?: string
  readonly VITE_OAUTH_DOMAIN?: string
  readonly VITE_OAUTH_REDIRECT_SIGNIN?: string
  readonly VITE_OAUTH_REDIRECT_SIGNOUT?: string
  readonly VITE_GRAPHQL_ENDPOINT?: string
  readonly VITE_AWS_REGION?: string
  readonly VITE_BYPASS_AUTH?: string
  readonly VITE_BYPASS_AUTH_USER_ID?: string
  readonly VITE_BYPASS_AUTH_EMAIL?: string
  readonly VITE_BYPASS_AUTH_NAME?: string
  readonly VITE_BYPASS_AUTH_ROLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
