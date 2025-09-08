#!/bin/bash

# Build all packages and applications
echo "🏗️  Building Auteurium monorepo..."

# Build shared packages first
echo "📦 Building shared packages..."
cd packages/shared-types && npm run build && cd ../..
cd packages/validation && npm run build && cd ../..

# Build GraphQL schema and generate types
echo "🔄 Generating GraphQL types..."
cd packages/graphql-schema && npm run codegen && cd ../..

# Build backend services
echo "⚡ Building backend services..."
cd services/api && npm run build && cd ../..

# Build frontend
echo "🌐 Building web application..."
cd apps/web && npm run build && cd ../..

# Build infrastructure
echo "☁️  Building infrastructure..."
cd infrastructure/aws-cdk && npm run build && cd ../..

echo "✅ Build complete!"