# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Auteurium** is a web application for creating text snippets and organizing them visually on a canvas with logical connections. This is the early development phase - the repository currently contains only documentation.

### Core Concept
- Users create text snippets within projects 
- Snippets are positioned on a visual canvas (similar to Miro/FigJam)
- Snippets can be connected with directional, many-to-many relationships
- Each snippet has two text fields and can have tags/categories
- Canvas supports zooming, panning, and drag-and-drop positioning

## Architecture

**Monorepo Structure**: All components (frontend, backend, infrastructure) will be organized in a single GitHub repository

**Technology Stack**:
- **Frontend**: React with React Flow for canvas interactions, Tailwind CSS for styling
- **Backend**: AWS Lambda (Node.js with TypeScript)
- **API Layer**: GraphQL with AWS AppSync
- **Authentication**: AWS Cognito
- **Storage**: Vector database for snippet connections
- **Infrastructure**: AWS CDK for Infrastructure as Code
- **Hosting**: Amazon S3 + CloudFront

## Key Application Features

### User Management
- Self-registration with email/password
- Admin users with system analytics access (cannot view snippet content)
- All user data is private and scoped to individual users

### Project Organization
- Users can create multiple projects
- Snippets, tags, and categories are project-specific
- Project deletion cascades to all contained snippets

### Snippet Management  
- Two text fields per snippet, no length limits (expected up to page length)
- Unique alphanumeric IDs displayed on canvas
- Large snippets (>100 words) shown minimized with expand modal
- Version history with revert capability
- Positioned freely on infinite canvas

### Connection System
- Directional relationships between snippets (A depends on B)
- Many-to-many connections supported
- Connection labels/tags for relationship types
- Connections created by entering target snippet ID
- Visual lines drawn between connected snippets

### Canvas Interface
- Infinite scrollable workspace per project
- Pan and zoom controls
- Drag-and-drop snippet positioning
- Context menus for snippet operations
- Modal dialogs for editing and connection management

## Development Commands

**Prerequisites**: Node.js 22+ (LTS), npm 10+, TypeScript 5.9+, AWS CLI configured (for deployment)

### Setup
- `npm run setup` - Install all dependencies and set up development environment
- `./tools/scripts/setup-dev.sh` - Alternative setup script

### Development
- `npm run dev` - Start web app (localhost:3000) and API service concurrently
- `npm run dev:web` - Start only web app with Vite dev server
- `npm run dev:api` - Start only API service in watch mode

### Building
- `npm run build` - Build all packages and applications using build-all.sh script
- `./tools/scripts/build-all.sh` - Direct script execution for full build
- Build order: shared-types → validation → graphql-schema → api → web → infrastructure

### Code Quality
- `npm run lint` - Run ESLint on web app and build API (includes type checking)
- `npm run typecheck` - Run TypeScript type checking on web app
- Individual package linting available in each workspace

### GraphQL
- `npm run generate` - Generate GraphQL types from schema using codegen
- `./tools/scripts/generate-graphql.sh` - Direct script for GraphQL code generation

### Testing
- `npm run test` - Run API unit tests (integration/e2e tests not yet implemented)
- `npm run test:api` - Run Jest tests in services/api
- API uses Jest, integration tests planned for tests/integration/
- E2E tests with Playwright planned for tests/e2e/

### Deployment
- `npm run deploy [stage] [profile]` - Deploy to AWS (default: dev environment)
- `./tools/scripts/deploy-stack.sh dev` - Deploy to dev environment
- Uses AWS CDK, requires AWS CLI configuration
- Available stages: dev, prod

### CDK Commands (from infrastructure/aws-cdk/)
- `npm run cdk synth` - Synthesize CloudFormation templates
- `npm run cdk deploy --all` - Deploy all stacks
- `npm run cdk destroy --all` - Destroy all stacks
- `npm run cdk diff` - Show differences between deployed and local stacks

## Monorepo Structure

**Workspaces Configuration**: Uses npm workspaces with apps/*, packages/*, services/*, infrastructure/aws-cdk

- **apps/web** - React frontend with React Flow, Vite, Tailwind CSS, AWS Amplify
- **packages/shared-types** - TypeScript definitions shared across monorepo
- **packages/graphql-schema** - GraphQL schema and generated types
- **packages/validation** - Zod schemas for request validation
- **services/api** - AWS Lambda GraphQL resolvers with PowerTools
- **services/media** - Media handling Lambda functions (pre-signed URLs, upload completion)
- **infrastructure/aws-cdk** - Infrastructure as Code with CDK stacks
- **tests/** - Integration and E2E test suites
- **tools/scripts/** - Build, deployment, and development automation scripts

## Architecture Notes

**Data Model**:
- Users → Projects → Snippets (1:many relationships)
- Snippets have directional many-to-many connections with optional labels
- Project-scoped tags/categories
- Snippet versioning with revert capability
- Two text fields per snippet, positioned on infinite canvas

**Frontend Architecture**:
- React with React Flow for canvas interactions
- Zustand for state management
- AWS Amplify for authentication and GraphQL
- Apollo Client for GraphQL operations
- React Router for navigation
- Tailwind CSS for styling

**Backend Architecture**:
- GraphQL API via AWS AppSync
- Lambda resolvers with TypeScript
- DynamoDB for data storage (designed for future vector database migration)
- AWS Cognito for authentication with user data isolation
- S3 for media uploads with pre-signed URLs
- CloudWatch for basic logging (monitoring stack disabled for cost savings)

**Critical Implementation Areas**:
- **Authentication**: AWS Cognito integration, admin users cannot access snippet content
- **Cascade Deletes**: Project deletion removes all snippets and connections
- **Media Handling**: Direct S3 uploads via pre-signed URLs, backend registration on completion
- **Data Validation**: Zod schemas in packages/validation for consistent validation
- **Error Handling**: Consistent API error format, comprehensive CloudWatch logging
- **Infrastructure**: CDK stacks with app-specific resource naming for multi-app AWS accounts
- **Cost Optimization**: Monitoring stack disabled during development (~$5-7/month savings)

**Build Dependencies**:
1. packages/shared-types (foundational types)
2. packages/validation (depends on shared-types)
3. packages/graphql-schema (schema and codegen)
4. services/api (depends on shared-types, validation)
5. apps/web (depends on generated GraphQL types)
6. infrastructure/aws-cdk (independent)

## Monitoring Configuration

**Current Status**: CloudWatch monitoring stack is DISABLED for development cost savings (~$5-7/month)

**Re-enabling Monitoring** (when ready for production):
1. Rename `infrastructure/aws-cdk/lib/stacks/auteurium-monitoring-stack.ts.disabled` to `.ts`
2. Uncomment monitoring lines in `infrastructure/aws-cdk/lib/auteurium-app.ts`
3. Run: `cdk deploy Auteurium-Monitoring-dev`

**Monitoring Features** (when enabled):
- Custom CloudWatch dashboard with API and CloudFront metrics
- Automated alerts for API errors (>5 errors) and high latency (>5 seconds)
- SNS notifications for production issues
- Centralized logging with configurable retention