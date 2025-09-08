#!/bin/bash

echo "🔄 Generating GraphQL types and code..."

cd packages/graphql-schema

# Generate TypeScript types from schema
npm run codegen

echo "✅ GraphQL code generation complete!"

cd ../..