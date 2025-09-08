module.exports = {
  schema: '../packages/graphql-schema/schema.graphql',
  documents: [
    'apps/web/src/**/*.ts',
    'apps/web/src/**/*.tsx',
  ],
  generates: {
    'packages/graphql-schema/generated/types.ts': {
      plugins: [
        'typescript',
        'typescript-resolvers'
      ],
      config: {
        useIndexSignature: true,
        contextType: '../../services/api/src/types/context#GraphQLContext'
      }
    },
    'apps/web/src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo'
      ],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false
      }
    }
  }
}