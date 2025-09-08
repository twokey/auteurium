# Auteurium

A web application for creating text snippets and organizing them visually on a canvas with logical connections.

## Project Structure

This is a monorepo containing:

- **apps/web** - React web application with React Flow for canvas interactions
- **packages/shared-types** - Shared TypeScript type definitions
- **packages/graphql-schema** - GraphQL schema and generated types
- **packages/validation** - Shared validation schemas using Zod
- **services/api** - AWS Lambda GraphQL resolvers
- **infrastructure/aws-cdk** - AWS CDK infrastructure code
- **tests/** - E2E and integration tests

## Technology Stack

- **Frontend**: React, React Flow, Tailwind CSS, Vite
- **Backend**: AWS Lambda, Node.js, TypeScript
- **API**: GraphQL with AWS AppSync
- **Authentication**: AWS Cognito
- **Database**: AWS DynamoDB (designed for vector database in future)
- **Infrastructure**: AWS CDK
- **Hosting**: Amazon S3 + CloudFront

## Getting Started

### Prerequisites

- Node.js 18+
- npm 8+
- AWS CLI configured (for deployment)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd auteurium

# Set up development environment
npm run setup

# Start development servers
npm run dev
```

This will start:
- Web app on http://localhost:3000
- API service in watch mode

### Available Scripts

- `npm run setup` - Install all dependencies and set up the development environment
- `npm run dev` - Start development servers for web app and API
- `npm run build` - Build all packages and applications
- `npm run lint` - Run linting across all packages
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run all tests
- `npm run generate` - Generate GraphQL types from schema
- `npm run deploy` - Deploy to AWS (requires AWS CLI setup)

### Development Workflow

1. **Shared Types**: Update types in `packages/shared-types/src/`
2. **GraphQL Schema**: Modify schema in `packages/graphql-schema/schema.graphql`
3. **Generate Types**: Run `npm run generate` after schema changes
4. **Frontend Development**: Work in `apps/web/src/`
5. **Backend Development**: Work in `services/api/src/`
6. **Infrastructure**: Modify CDK stacks in `infrastructure/aws-cdk/lib/`

## Core Features

### Canvas Interface
- Infinite scrollable workspace per project
- Pan and zoom controls with React Flow
- Drag-and-drop snippet positioning
- Visual connection lines between snippets

### Snippet Management
- Two text fields per snippet, no length limits
- Unique alphanumeric IDs displayed on canvas
- Large snippets (>100 words) shown minimized with expand modal
- Version history with revert capability

### Project Organization
- Multiple projects per user
- Project-scoped snippets, tags, and categories
- Cascade delete (project deletion removes all snippets)

### Connection System
- Directional relationships between snippets
- Many-to-many connections supported
- Optional connection labels/tags
- Created by entering target snippet ID

## Deployment

### Staging
```bash
npm run deploy dev
```

### Production
```bash
npm run deploy prod
```

The deployment script will:
1. Build all packages and applications
2. Deploy AWS infrastructure via CDK
3. Upload web app to S3 and invalidate CloudFront

## Testing

- **Unit Tests**: Run with `npm run test`
- **Integration Tests**: API resolver tests in `tests/integration/`
- **E2E Tests**: Canvas and user interaction tests in `tests/e2e/`

## Documentation

Detailed requirements and design documentation is available in the `docs/` directory:

- `docs/application-requirements.md` - Complete feature specifications
- `docs/technology-stack.md` - Technology choices and rationale
- `docs/backend-logic.md` - Critical implementation areas
- `docs/canvas-design.md` - UI/UX design and interaction patterns

## Contributing

This project is in active development. See `CLAUDE.md` for guidance when working with Claude Code.

## License

Private project - All rights reserved.