#!/bin/bash

STAGE=${1:-dev}
PROFILE=${2:-default}

echo "🚀 Deploying Auteurium to $STAGE environment..."

# Build everything first
./tools/scripts/build-all.sh

# Deploy infrastructure
echo "☁️  Deploying infrastructure..."
cd infrastructure/aws-cdk

# Set AWS profile if provided
if [ "$PROFILE" != "default" ]; then
  export AWS_PROFILE=$PROFILE
fi

# Set stage environment variable
export STAGE=$STAGE

# Deploy all stacks
npm run deploy

echo "✅ Deployment to $STAGE complete!"

cd ../..