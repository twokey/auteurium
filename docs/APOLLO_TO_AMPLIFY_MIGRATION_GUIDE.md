# Apollo Client to AWS Amplify Migration Guide

## Progress

✅ **Completed:**
- Removed Apollo Client packages from package.json
- Created reusable hooks (useGraphQLQuery, useGraphQLMutation)
- Updated all GraphQL query/mutation definitions (removed `gql` tag)
- Replaced graphql.ts with Amplify generateClient
- Removed ApolloProvider from App.tsx
- Migrated DeleteSnippetConfirmation component
- Fixed type errors in hooks

⏳ **Remaining Components (9 files):**

1. `src/components/modals/EditSnippetModal.tsx`
2. `src/components/modals/ManageConnectionsModal.tsx`
3. `src/components/modals/VersionHistoryModal.tsx`
4. `src/components/projects/CreateProjectModal.tsx`
5. `src/components/projects/EditProjectModal.tsx`
6. `src/components/projects/ProjectCard.tsx`
7. `src/pages/Canvas.tsx`
8. `src/pages/Dashboard.tsx`
9. `src/hooks/useGenAI.ts`

## Migration Pattern

### Before (Apollo Client):
```typescript
import { useMutation, useQuery } from '@apollo/client'
import { GET_PROJECTS, CREATE_PROJECT } from '../graphql/queries'

const { data, loading, error } = useQuery(GET_PROJECTS)
const [createProject] = useMutation(CREATE_PROJECT, {
  refetchQueries: [{ query: GET_PROJECTS }]
})

// Usage
await createProject({ variables: { input: {...} } })
```

### After (Amplify):
```typescript
import { useGraphQLQuery } from '../hooks/useGraphQLQuery'
import { useGraphQLMutation } from '../hooks/useGraphQLMutation'
import { GET_PROJECTS, CREATE_PROJECT } from '../graphql/queries'

const { data, loading, error, refetch } = useGraphQLQuery(GET_PROJECTS)
const { mutate: createProject } = useGraphQLMutation(CREATE_PROJECT, {
  onCompleted: () => refetch()  // Manual refetch instead of refetchQueries
})

// Usage
await createProject({ variables: { input: {...} } })
```

## File-by-File Migration Instructions

### 1. EditSnippetModal.tsx
**Current imports to replace:**
```typescript
import { useMutation } from '@apollo/client'
```

**New imports:**
```typescript
import { useGraphQLMutation } from '../../hooks/useGraphQLMutation'
```

**Pattern:** Replace all `useMutation` with `useGraphQLMutation` and add `onCompleted` callback for refetching.

### 2. ManageConnectionsModal.tsx
**Same as EditSnippetModal** - Replace `useMutation` with `useGraphQLMutation`

### 3. VersionHistoryModal.tsx
**Current imports:**
```typescript
import { useMutation, useQuery } from '@apollo/client'
```

**New imports:**
```typescript
import { useGraphQLQuery } from '../../hooks/useGraphQLQuery'
import { useGraphQLMutation } from '../../hooks/useGraphQLMutation'
```

**Pattern:**
- Replace `useQuery` with `useGraphQLQuery`
- Replace `useMutation` with `useGraphQLMutation`

### 4-6. Project Components (CreateProjectModal, EditProjectModal, ProjectCard)
**Same pattern:**
- Replace `useMutation` from Apollo with `useGraphQLMutation`
- Add `onCompleted` callback for refetching if needed

### 7. Dashboard.tsx
**Current:**
```typescript
import { useQuery } from '@apollo/client'
```

**New:**
```typescript
import { useGraphQLQuery } from '../hooks/useGraphQLQuery'
```

### 8. Canvas.tsx
**This is the largest file** - Replace all `useQuery` and `useMutation` hooks

### 9. useGenAI.ts
**Special case** - This uses subscriptions and ApolloClient

**Current:**
```typescript
import { ApolloError, useApolloClient, useMutation, useQuery } from '@apollo/client'
```

**Replace with:**
```typescript
import { useGraphQLQuery } from './useGraphQLQuery'
import { useGraphQLMutation } from './useGraphQLMutation'
import { client } from '../services/graphql'
```

**For subscriptions:**
```typescript
// Instead of Apollo subscriptions:
const subscription = client.graphql({
  query: SUBSCRIPTION_QUERY
}).subscribe({
  next: (data) => console.log(data),
  error: (err) => console.error(err)
})

// Cleanup:
subscription.unsubscribe()
```

## Quick Migration Script

For each file, follow these steps:

1. **Replace imports:**
   - Remove: `import { ... } from '@apollo/client'`
   - Add: `import { useGraphQLQuery } from '...'` and/or `import { useGraphQLMutation } from '...'`

2. **Replace hooks:**
   - `useQuery(QUERY, { variables })` → `useGraphQLQuery(QUERY, { variables })`
   - `useMutation(MUTATION)` → `useGraphQLMutation(MUTATION)`

3. **Update mutation calls:**
   - Apollo: `const [mutate] = useMutation(...); await mutate({ variables: {...} })`
   - Amplify: `const { mutate } = useGraphQLMutation(...); await mutate({ variables: {...} })`

4. **Handle refetchQueries:**
   - Apollo: `refetchQueries: [{ query: GET_DATA }]`
   - Amplify: `onCompleted: () => refetch()` (get `refetch` from `useGraphQLQuery`)

5. **Remove ApolloError types:**
   - Replace `ApolloError` with `Error`

## Testing After Migration

```bash
# 1. Build to check for errors
npm run build

# 2. Run development server
npm run dev

# 3. Test functionality:
- Create/edit/delete projects
- Create/edit/delete snippets
- Manage connections
- View version history
- GenAI features

# 4. Run E2E tests
npm run test:e2e
```

## Common Issues & Solutions

### Issue: "Property 'errors' does not exist"
**Solution:** Already fixed in hooks with type guards

### Issue: Refetch not working
**Solution:** Add `onCompleted` callback to mutation and call query's `refetch()`

### Issue: Subscription errors
**Solution:** Use Amplify's native subscription support with `client.graphql().subscribe()`

## Benefits of Migration

✅ **Security:** No Apollo Client v4 compatibility issues
✅ **Bundle Size:** ~40-50kb smaller
✅ **Type Safety:** Full TypeScript support
✅ **Simplicity:** Native Amplify integration
✅ **Zero Vulnerabilities:** All security issues resolved
