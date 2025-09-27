# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Auteurium** is a web application for creating text snippets and organizing them visually on a canvas with logical connections. The application is built with a complete AWS serverless architecture and React frontend, ready for development and testing.

### Core Concept
- Users create text snippets within projects 
- Snippets are positioned on a visual canvas (similar to Miro/FigJam)
- Snippets can be connected with directional, many-to-many relationships
- Each snippet has two text fields and can have tags/categories
- Canvas supports zooming, panning, and drag-and-drop positioning

## Architecture

**Monorepo Structure**: All components (frontend, backend, infrastructure) will be organized in a single GitHub repository

**Technology Stack**:
- **Frontend**: React with React Flow for canvas interactions, Tailwind CSS for styling, AWS Amplify v6
- **Backend**: AWS Lambda (Node.js with TypeScript), GraphQL resolvers
- **API Layer**: GraphQL with AWS AppSync
- **Authentication**: AWS Cognito with JWT validation
- **Storage**: DynamoDB with Global Secondary Indexes (designed for Neptune migration)
- **Infrastructure**: AWS CDK for Infrastructure as Code
- **Hosting**: Amazon S3 + CloudFront (disabled for development security)

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
- `npm install` - Install all workspace dependencies

### Development
- `npm run dev` - Start web app (localhost:3000) and API service concurrently
- `npm run dev:web` - Start only web app with Vite dev server
- `npm run dev:api` - Start only API service in watch mode

### Building
- `cd apps/web && npm run build` - Build React web application
- `cd services/api && npm run build` - Build API Lambda functions
- `cd infrastructure/aws-cdk && npm run build` - Build CDK infrastructure
- Build dependencies: shared-types → validation → api → web → infrastructure

### Code Quality
- `cd apps/web && npm run lint` - ESLint for React frontend
- `cd apps/web && npm run typecheck` - TypeScript type checking for frontend

### Testing
- `cd services/api && npm run test` - Run Jest unit tests for API resolvers
- Tests include database operations, cascade deletes, authentication, validation
- Test files: `src/__tests__/` with setup, middleware, integration, and database tests

### Infrastructure Testing
**CDK TDD Framework** (from infrastructure/aws-cdk/):
- `npm run test` - Run all infrastructure tests (93 tests, 100% coverage)
- `npm run test:unit` - Fast unit tests for individual stacks
- `npm run test:integration` - Cross-stack dependency tests
- `npm run test:validation` - Runtime validation against deployed infrastructure
- `npm run test:watch` - Watch mode for development
- `npm run test:coverage` - Generate coverage reports

**Test Organization**:
- **Unit Tests**: `test/unit/stacks/` - Auth (20), Database (24), API (25), Media (24) tests
- **Integration Tests**: `test/integration/cross-stack/` - Complete infrastructure synthesis
- **Validation Tests**: `test/validation/deployment/` - Runtime version and security validation
- **Critical Protection**: Node.js 22.x runtime enforcement, IAM permissions, security compliance

### Deployment
**CDK Commands** (from infrastructure/aws-cdk/):
- `npm run synth` - Synthesize CloudFormation templates
- `npm run deploy` - Deploy all AWS stacks
- `npm run destroy` - Destroy all AWS stacks
- `npm run diff` - Show differences between deployed and local stacks

**Environment Setup**:
- Copy `apps/web/.env.example` to `apps/web/.env.local`
- Update environment variables with actual AWS resource IDs after deployment
- Variables needed: USER_POOL_ID, USER_POOL_CLIENT_ID, GRAPHQL_ENDPOINT


## Monorepo Structure

**Workspaces Configuration**: Uses npm workspaces with apps/*, packages/*, services/*, infrastructure/aws-cdk

- **apps/web** - React frontend with React Flow, Vite, Tailwind CSS, AWS Amplify v6
- **packages/shared-types** - TypeScript definitions shared across monorepo
- **packages/validation** - Zod schemas for request validation
- **services/api** - AWS Lambda GraphQL resolvers with PowerTools and comprehensive tests
- **infrastructure/aws-cdk** - Infrastructure as Code with CDK stacks for 5 AWS services

## Architecture Notes

**Data Model**:
- Users → Projects → Snippets (1:many relationships)
- Snippets have directional many-to-many connections with optional labels
- Project-scoped tags/categories
- Snippet versioning with revert capability
- Two text fields per snippet, positioned on infinite canvas

**Frontend Architecture**:
- React with React Flow for canvas interactions, React Router for navigation
- AWS Amplify v6 for authentication integration with Cognito
- Apollo Client for GraphQL operations with AppSync
- Tailwind CSS for styling
- Authentication context with useAuth hook
- Component structure: pages/, components/auth/, components/projects/, components/canvas/

**Backend Architecture**:
- GraphQL API via AWS AppSync with 20 Lambda resolvers
- DynamoDB with 5 tables and 7 Global Secondary Indexes (designed for Neptune migration)
- AWS Cognito for authentication with JWT validation using aws-jwt-verify
- User data isolation: users can only access their own projects/snippets
- S3 for media uploads with pre-signed URLs and upload completion handlers
- CloudWatch for logging (monitoring stack disabled for cost savings)

**Critical Implementation Areas**:
- **Authentication**: AWS Cognito integration, admin users cannot access snippet content
- **Cascade Deletes**: Project deletion removes all snippets and connections
- **Media Handling**: Direct S3 uploads via pre-signed URLs, backend registration on completion
- **Data Validation**: Zod schemas in packages/validation for consistent validation
- **Error Handling**: Consistent API error format, comprehensive CloudWatch logging
- **Infrastructure**: CDK stacks with app-specific resource naming for multi-app AWS accounts
- **Cost Optimization**: Monitoring stack disabled during development (~$5-7/month savings)

**AWS Infrastructure** (5 deployed stacks):
1. **Auteurium-Auth-dev** - Cognito User Pool with email/password authentication
2. **Auteurium-Database-dev** - 5 DynamoDB tables: users, projects, snippets, connections, versions
3. **Auteurium-Api-dev** - AppSync GraphQL API with Lambda resolvers for all CRUD operations
4. **Auteurium-Media-dev** - S3 bucket with presigned URL functions for media uploads
5. **Auteurium-Web-dev** - S3 + CloudFront for hosting (CloudFront disabled for development security)

**Build Dependencies**:
1. packages/shared-types → packages/validation → services/api → apps/web
2. infrastructure/aws-cdk (independent, can be built separately)

## Infrastructure Testing Framework

**TDD Approach**: The CDK infrastructure uses Test-Driven Development with comprehensive test coverage to prevent regressions and ensure consistency across all AWS stacks.

**Key Testing Commands**:
- `npm test -- auth-stack.test.ts` - Test specific stack
- `npm test -- --testNamePattern="Node.js"` - Test with pattern matching
- `npm test -- --changedSince=origin/main` - Test only changed files
- `export RUN_DEPLOYMENT_TESTS=true && npm run test:validation` - Validate deployed infrastructure

**Critical Test Areas**:
- **Runtime Version Safety**: Prevents regression to older Node.js versions (enforces 22.x)
- **Security Compliance**: IAM permissions, CORS configuration, authentication setup
- **Resource Integrity**: Naming conventions, cross-stack references, environment variables
- **Template Validation**: CDK Template assertions for all AWS resources

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