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

**Current Status**: Documentation-only phase. No package.json or build configuration exists yet.

When implementation begins, the following commands will be needed:
- Frontend build/dev server commands (React with Vite expected)
- TypeScript compilation and type checking
- AWS CDK deployment commands (`cdk deploy`, `cdk synth`)
- AppSync schema management and GraphQL code generation
- Testing framework commands (unit, integration, e2e)
- Vector database setup and migration commands

## Architecture Notes

**Current Structure**: Documentation files in `/docs/` contain detailed requirements and design specifications:
- `application-requirements.md`: Complete feature specifications and user roles
- `technology-stack.md`: Technology choices and rationale  
- `backend-logic.md`: Critical implementation areas and AWS architecture
- `canvas-design.md`: UI/UX design and interaction patterns

**Key Implementation Areas**:
- **Frontend**: React with React Flow for canvas, positioned snippets with many-to-many connections
- **Backend**: AWS Lambda functions with TypeScript, GraphQL API via AppSync
- **Authentication**: AWS Cognito with user data isolation (admin users cannot access snippet content)
- **Critical Logic**: Cascade deletes (project deletion removes all snippets), directional snippet connections
- **Media Handling**: Pre-signed S3 URLs for direct uploads, backend registration of successful uploads
- **Infrastructure**: AWS CDK with resource naming conventions (app name + stack identification)

**Data Model**: Projects contain snippets (two text fields each), snippets have connections with optional labels, project-scoped tags/categories

**Backend Implementation Details**:
- **Data Validation**: Comprehensive request payload validation with validation library
- **Error Handling**: Consistent API error format, CloudWatch logging for debugging
- **Idempotency**: Built-in mechanisms for critical operations (creation, linking)
- **GenAI Integration**: Secure API key management, error handling and retries
- **Performance**: Lambda optimization for cold starts and memory usage