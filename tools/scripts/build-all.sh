#!/bin/bash

set -e  # Exit on any error

# Build all packages and applications
echo "🏗️  Building Auteurium monorepo..."

# Build shared packages first
echo "📦 Building shared packages..."
(cd packages/shared-types && npm run build)
(cd packages/validation && npm run build)

# Build GraphQL schema and generate types
echo "🔄 Generating GraphQL types..."
(cd packages/graphql-schema && npm run codegen)

# Build backend services
echo "⚡ Building backend services..."
(cd services/api && npm run build)

# Build frontend
echo "🌐 Building web application..."
(cd apps/web && npm run build)

# Build infrastructure
echo "☁️  Building infrastructure..."
(cd infrastructure/aws-cdk && npm run build)

echo "✅ Build complete!"