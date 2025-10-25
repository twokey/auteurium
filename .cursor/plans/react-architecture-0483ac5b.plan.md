<!-- 0483ac5b-ee2b-4822-84d4-69e1aa6388e6 74fe4cfa-671e-4486-b016-534b2059e74f -->
# React Architecture Refactoring Plan

## Critical Issues Identified

1. **Type Duplication**: `Snippet`, `Project`, `Connection` interfaces defined in 5+ files
2. **God Component**: `Canvas.tsx` is 1015 lines with 8 useState hooks and 5 modal states
3. **Unused Zustand**: Installed but not utilized, causing prop drilling (8+ props to SnippetNode)
4. **No Code Splitting**: All components loaded eagerly, impacting initial load
5. **Alert-based Errors**: Using `alert()` instead of proper toast notifications
6. **No Error Boundaries**: Single component crash takes down entire app
7. **Manual Refetching**: No cache invalidation strategy for GraphQL

## Phase 1: Foundation & Type System

### 1.1 Centralized Type Definitions

**Files**: `apps/web/src/types/index.ts`, `apps/web/src/types/domain.ts`, `apps/web/src/types/graphql.ts`

Create shared type definitions to eliminate duplication:

- Domain types: `Snippet`, `Project`, `Connection`, `User`, `ImageMetadata`
- GraphQL operation types: Query/Mutation variables and responses
- Component prop types: Modal props, node data structures

**Impact**: Removes 200+ lines of duplicated interfaces across components

### 1.2 Establish Feature-based Architecture

**Structure**:

```
src/
  features/
    canvas/
      components/
      hooks/
      store/
      types/
    projects/
    snippets/
    auth/
  shared/
    components/
    hooks/
    utils/
```

## Phase 2: State Management with Zustand

### 2.1 Canvas Store

**File**: `apps/web/src/features/canvas/store/canvasStore.ts`

Manage canvas-specific state:

- Node/edge state (integrate with ReactFlow)
- Viewport persistence
- Selected snippet/connection
- Canvas loading states

**Benefit**: Removes 5 useState hooks from Canvas.tsx

### 2.2 Modal Store

**File**: `apps/web/src/shared/store/modalStore.ts`

Centralized modal management:

```typescript
interface ModalState {
  editSnippet: { isOpen: boolean; snippetId: string | null }
  deleteSnippet: { isOpen: boolean; snippetId: string | null }
  // ... other modals
}
```

**Benefit**: Replaces 5 modal-related useState hooks with clean store

### 2.3 Project Cache Store

**File**: `apps/web/src/features/projects/store/projectStore.ts`

Client-side caching:

- Recently viewed projects
- Optimistic updates
- Reduce unnecessary refetches

## Phase 3: Component Decomposition

### 3.1 Break Down Canvas.tsx

**Current**: 1015 lines, 15 responsibilities

**Split into**:

- `CanvasContainer.tsx` (150 lines) - orchestration
- `hooks/useCanvasData.ts` - data fetching logic
- `hooks/useCanvasHandlers.ts` - event handlers
- `hooks/useReactFlowSetup.ts` - ReactFlow configuration
- `CanvasModals.tsx` - modal rendering logic

**Files affected**:

- `apps/web/src/pages/Canvas.tsx`
- New files in `apps/web/src/features/canvas/`

### 3.2 Shared UI Component Library

**Files**: `apps/web/src/shared/components/ui/`

Create reusable components:

- `Button.tsx` - Standardized button with variants
- `Modal.tsx` - Compound component pattern
- `Card.tsx`
- `Input.tsx`, `Textarea.tsx`
- `LoadingSpinner.tsx`

**Benefit**: DRY principle, consistent UI, easier theming

### 3.3 Replace EditSnippetModal Complexity

**Current**: 962 lines, 13 useState hooks

**Refactor**:

- Extract `hooks/useSnippetForm.ts` - form state management
- Extract `hooks/useSnippetGeneration.ts` - AI generation logic  
- Create `components/SnippetFormFields.tsx` - form UI
- Create `components/SnippetActions.tsx` - action buttons

## Phase 4: Error Handling & UX

### 4.1 Toast Notification System

**Files**:

- `apps/web/src/shared/components/ui/Toast.tsx`
- `apps/web/src/shared/hooks/useToast.ts`
- `apps/web/src/shared/store/toastStore.ts`

Replace all `alert()` calls (12+ instances) with toast notifications

### 4.2 Error Boundaries

**Files**:

- `apps/web/src/shared/components/ErrorBoundary.tsx`
- `apps/web/src/shared/components/ErrorFallback.tsx`

Wrap major routes and feature components to prevent full app crashes

### 4.3 Centralized Error Logging

**File**: `apps/web/src/shared/utils/errorLogger.ts`

Standardize error handling across GraphQL operations

## Phase 5: Performance Optimization

### 5.1 Code Splitting

**Files**: `apps/web/src/App.tsx`, route components

Implement lazy loading:

```typescript
const Canvas = lazy(() => import('./features/canvas/CanvasContainer'))
const Dashboard = lazy(() => import('./features/projects/Dashboard'))
```

**Benefit**: Reduce initial bundle by ~40%

### 5.2 Vite Build Optimization

**File**: `apps/web/vite.config.ts`

Add chunk splitting, tree shaking:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'reactflow': ['reactflow'],
        'amplify': ['aws-amplify', '@aws-amplify/auth']
      }
    }
  }
}
```

### 5.3 Memoization Strategy

**Files**: Various components

- Memoize expensive computations in Canvas (`flowNodes`, `flowEdges`)
- Use `React.memo` for pure components (SnippetNode already done ✓)
- Optimize re-render triggers

### 5.4 GraphQL Query Optimization

**File**: `apps/web/src/hooks/useGraphQLQuery.ts`

Add caching layer:

- Implement stale-while-revalidate
- Add request deduplication
- Cache invalidation on mutations

## Phase 6: Developer Experience

### 6.1 Custom Hook Library

**Files**: `apps/web/src/shared/hooks/`

Extract common patterns:

- `useLocalStorage.ts` - typed localStorage wrapper
- `useDebounce.ts` - debounced values
- `useMediaQuery.ts` - responsive utilities
- `useKeyPress.ts` - keyboard shortcuts

### 6.2 Constants & Configuration

**Files**:

- `apps/web/src/shared/constants/index.ts`
- `apps/web/src/shared/config/`

Centralize magic numbers and configuration:

- `WORD_LIMIT = 100` (currently inline)
- `GENERATED_SNIPPET_VERTICAL_OFFSET = 500`
- API endpoints, timeouts, etc.

### 6.3 Utility Functions

**File**: `apps/web/src/shared/utils/`

Extract and organize:

- Date formatting (duplicated in ProjectCard and CanvasInfoPanel)
- Text truncation utilities
- Validation helpers

## Phase 7: Testing Setup

### 7.1 Testing Infrastructure

**Files**: Setup files for Vitest

- Configure Vitest
- Add React Testing Library
- Setup MSW for API mocking

### 7.2 Test Examples

Create test patterns for:

- Custom hooks
- Zustand stores
- Component integration tests

## Implementation Priority

**Week 1-2**: Foundation

- Phase 1: Type system (1.1, 1.2)
- Phase 2: Zustand stores (2.1, 2.2, 2.3)

**Week 3-4**: Component Refactoring

- Phase 3: Decompose Canvas (3.1)
- Phase 3: Shared UI (3.2, 3.3)

**Week 5**: Error Handling & UX

- Phase 4: All sections (4.1, 4.2, 4.3)

**Week 6**: Performance

- Phase 5: All optimizations (5.1, 5.2, 5.3, 5.4)

**Week 7**: DX & Polish

- Phase 6: Hooks, constants, utils (6.1, 6.2, 6.3)
- Phase 7: Testing setup (7.1, 7.2)

## Expected Outcomes

**Maintainability**:

- 60% reduction in component complexity (lines per file)
- Zero type duplication
- Clear separation of concerns

**Performance**:

- 40% smaller initial bundle
- Faster subsequent navigation (code splitting)
- Better re-render performance (memoization)

**Developer Experience**:

- Easier to onboard new developers (clear structure)
- Faster feature development (reusable components)
- Better debugging (error boundaries, logging)

**Code Quality**:

- Type-safe throughout
- Testable architecture
- Consistent patterns

### To-dos

- [ ] Create centralized type definitions in apps/web/src/types/ (domain.ts, graphql.ts, components.ts)
- [ ] Establish feature-based folder structure (canvas/, projects/, snippets/, auth/)
- [ ] Create Zustand canvas store for nodes, edges, viewport, and loading states
- [ ] Create centralized modal management store with Zustand
- [ ] Create project cache store for client-side caching and optimistic updates
- [ ] Break down Canvas.tsx into CanvasContainer + custom hooks (useCanvasData, useCanvasHandlers, useReactFlowSetup)
- [ ] Create shared UI component library (Button, Modal, Card, Input, LoadingSpinner)
- [ ] Refactor EditSnippetModal using custom hooks (useSnippetForm, useSnippetGeneration) and sub-components
- [ ] Implement toast notification system and replace all alert() calls
- [ ] Add error boundaries around routes and major features
- [ ] Create centralized error logging utility for GraphQL and general errors
- [ ] Implement lazy loading for route components (Canvas, Dashboard, Admin)
- [ ] Configure Vite for chunk splitting, tree shaking, and bundle optimization
- [ ] Optimize re-renders with proper memoization in Canvas and other heavy components
- [ ] Add caching layer to useGraphQLQuery with stale-while-revalidate pattern
- [ ] Create shared custom hooks (useLocalStorage, useDebounce, useMediaQuery, useKeyPress)
- [ ] Centralize magic numbers and configuration values
- [ ] Extract and organize utility functions (date formatting, text truncation, validation)
- [ ] Setup Vitest, React Testing Library, and MSW for API mocking