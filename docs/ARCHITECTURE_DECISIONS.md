# Architecture Decisions & Patterns

## Decision 1: Hook-Driven State Management

**Decision**: Extract business logic and state into custom hooks instead of keeping in components.

**Rationale**:
- Hooks are reusable across components
- Easier to test in isolation
- Cleaner component code (focuses on UI)
- Follows React best practices

**Example**: 
```
EditSnippetModal was 965 lines with mixed logic
Now split into:
- useSnippetForm (210 lines) - state logic
- useSnippetGeneration (195 lines) - generation logic
- useSnippetMutations (140 lines) - data mutations
- EditSnippetModal (~150 lines) - UI only
```

## Decision 2: Base Component Templates

**Decision**: Create reusable base components (ConfirmationModal, BaseFormModal) instead of duplicating modal code.

**Rationale**:
- Reduces modal boilerplate by ~30%
- Consistent UX across all modals
- Easier to update modal behavior app-wide
- New modals built faster

**Pattern**:
```typescript
// Reusable template
export const BaseFormModal = ({ isOpen, onSubmit, config, children }) => {
  // Handles: form submission, loading, error display
  // User provides: custom fields in children
}

// Usage in specific modal
export const EditSnippetModal = () => {
  return (
    <BaseFormModal {...commonProps}>
      <SnippetFormFields />
      <SnippetTagsSection />
    </BaseFormModal>
  )
}
```

## Decision 3: Hierarchical Component Structure

**Decision**: Organize components in hierarchy: Base → Sub-components → Features

**Rationale**:
- Clear ownership and responsibility
- Easier to find components
- Natural scaling pattern
- Supports tree-based refactoring

**Hierarchy**:
```
Shared (Base)
├── FormField (primitive)
├── FormSection (primitive grouping)
├── ConfirmationModal (template)
└── BaseFormModal (template)

Features (Domain-specific)
├── Snippets
│   ├── useSnippetForm (hook)
│   ├── SnippetFormFields (composite)
│   └── SnippetGenerationPanel (composite)
├── Connections
│   ├── useConnectionManagement (hook)
│   └── ConnectionForm (composite)
└── Projects
    ├── useProjectForm (hook)
    └── ProjectFormFields (composite)
```

## Decision 4: Single Responsibility Per Hook

**Decision**: Each hook handles one cohesive responsibility, not multiple.

**Rationale**:
- Hooks are smaller and easier to understand
- Can be combined as needed
- Easier to test each responsibility
- Better code reusability

**Example from Snippet Hooks**:
- `useSnippetForm` - form state ONLY
- `useSnippetGeneration` - generation state ONLY  
- `useSnippetMutations` - mutations ONLY
- NOT: one mega-hook with all three

## Decision 5: Explicit Prop Drilling for Sub-Components

**Decision**: Use props (not context) to pass data to sub-components within a feature.

**Rationale**:
- Clear data flow (props show dependencies)
- Easier to refactor
- Components are self-documenting
- No context complexity for local state

**Pattern**:
```typescript
// In parent component (EditSnippetModal)
const form = useSnippetForm(snippet)

// Pass extracted data to sub-component
<SnippetFormFields
  formState={form.formState}
  onTitleChange={form.setTitle}
  onTextField1Change={form.setTextField1}
  // ... explicit props
/>

// Sub-component is self-contained and testable
```

## Decision 6: Global State for Cross-Feature State

**Decision**: Use Zustand stores ONLY for state that's shared across multiple features/pages.

**Rationale**:
- Don't over-use global state
- Keeps scope clear
- Easier to debug
- Better performance (less re-renders)

**Current Global State** (Zustand):
- Modal visibility/data (used in multiple places)
- Toast notifications (used everywhere)
- Canvas viewport (shared across canvas feature)
- Projects cache (shared across dashboard/canvas)

**Local State** (Hooks/Components):
- Form fields (EditSnippetModal only)
- Generation models (EditSnippetModal only)
- Connection details (ManageConnectionsModal only)

## Decision 7: Error Handling at Mutation Layer

**Decision**: Consolidate error handling in mutation hooks, not in components.

**Rationale**:
- Consistent error handling app-wide
- Components stay focused on UI
- Easier to add logging/monitoring
- Automatic toast notifications

**Pattern**:
```typescript
// In useSnippetMutations
export const useSnippetMutations = () => {
  const toast = useToast()
  
  const updateSnippet = useCallback(async (...) => {
    try {
      // make request
    } catch (error) {
      // Handle error: log, toast, etc
      toast.error('Failed to update', error.message)
      throw error // let caller decide
    }
  })
}

// In component - just call it
await mutations.updateSnippet(...)
// Error already handled by hook
```

## Decision 8: Keyboard Event Handlers as Props

**Decision**: Pass keyboard handlers as props to sub-components that need them.

**Rationale**:
- Hook manages keyboard logic
- Component just renders inputs
- Easy to test keyboard behavior
- Consistent with React patterns

**Pattern**:
```typescript
// In hook
const handleTagKeyPress = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    addTag()
  }
}

// Pass to component
<SnippetTagsSection
  onTagKeyPress={handleTagKeyPress}
/>
```

## Decision 9: Consistent Naming Conventions

**Decision**: Use predictable naming for hooks, components, and functions.

**Naming Rules**:
- Hooks: `use[Domain][Responsibility]` (e.g., `useSnippetForm`, `useConnectionManagement`)
- Components: `[Domain][Responsibility]` (e.g., `SnippetFormFields`, `ConnectionForm`)
- Modals: `[Domain]Modal` (e.g., `EditSnippetModal`, `CreateProjectModal`)
- Store hooks: `use[Domain]Store` (e.g., `useModalStore`, `useCanvasStore`)
- Handlers: `handle[Action]` (e.g., `handleSave`, `handleDelete`)
- Callbacks: `on[Event]` (e.g., `onFieldSave`, `onComplete`)
- Setters: `set[Property]` (e.g., `setTitle`, `setTextField1`)

**Benefits**:
- Developers can predict where code is
- New code follows same pattern
- Easy to search/refactor
- Self-documenting

## Decision 10: TypeScript Interfaces Over Types for Props

**Decision**: Use `interface` for component/hook props, `type` for domain/utility types.

**Rationale**:
- Interfaces are for contracts (props)
- Types are for domain models
- Better semantics
- Easier to extend interfaces

**Pattern**:
```typescript
// Component props - interface
interface SnippetFormFieldsProps {
  formState: SnippetFormState
  onTitleChange: (value: string) => void
}

// Domain model - type
type SnippetFormState = {
  title: string
  textField1: string
}
```

## Validation Checklist for New Components

When creating new components, follow this checklist:

- [ ] Component name follows `[Domain][Responsibility]` pattern
- [ ] Component has TypeScript interface for props
- [ ] Component has JSDoc comment with example
- [ ] Logic extracted to hook (if complex)
- [ ] Hook has `use[Domain][Responsibility]` name
- [ ] Hook exports return type interface
- [ ] Error handling in hook, not component
- [ ] Component receives explicit props (not context)
- [ ] Component is under appropriate directory (shared/ or features/)
- [ ] Component has index.ts export if needed
- [ ] No console.log in production code (use errorLogger)
- [ ] Accessibility considered (labels, aria-, roles)

## Migration Path for Existing Components

**Phase 1**: Create new patterns (✓ DONE)
- Base modals, form components, hooks

**Phase 2**: Refactor large modals (NEXT)
- EditSnippetModal (965 → 200)
- ManageConnectionsModal (308 → 120)
- VersionHistoryModal (254 → 100)

**Phase 3**: Refactor large components (THEN)
- SnippetNode (648 → 250)
- Auth components extraction

**Phase 4**: Extract generic patterns (AFTER)
- Generic form hook
- Generic modal hook
- Reusable utilities

## Performance Considerations

**No Regressions Expected**:
- All new code is modular
- No additional bundle size initially
- Same dependencies used

**Potential Improvements**:
- Lazy load modal components
- Split large modals into smaller chunks
- Better tree-shaking with split files
- Easier to implement error boundaries per feature

---

**Status**: Approved and implemented
**Date**: October 18, 2025
**Next Review**: After Phase 2 completion
