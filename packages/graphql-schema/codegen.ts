import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './schema.graphql',
  generates: {
    './generated/types.ts': {
      plugins: ['typescript'],
      config: {
        scalars: {
          ID: 'string',
          String: 'string',
          Boolean: 'boolean',
          Int: 'number',
          Float: 'number',
        },
      },
    },
    './resolvers/types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        contextType: '../src/types/context#GraphQLContext',
        scalars: {
          ID: 'string',
          String: 'string',
          Boolean: 'boolean',
          Int: 'number',
          Float: 'number',
        },
      },
    },
  },
};

export default config;