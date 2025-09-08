#!/bin/bash

echo "🛠️  Setting up Auteurium development environment..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install dependencies for all packages
echo "📦 Installing package dependencies..."

# Web app
cd apps/web && npm install && cd ../..

# Shared packages
cd packages/shared-types && npm install && cd ../..
cd packages/graphql-schema && npm install && cd ../..
cd packages/validation && npm install && cd ../..

# Backend services
cd services/api && npm install && cd ../..

# Infrastructure
cd infrastructure/aws-cdk && npm install && cd ../..

# Make scripts executable
chmod +x tools/scripts/*.sh

echo "✅ Development environment setup complete!"
echo "🏃 Run 'npm run dev' to start development servers"