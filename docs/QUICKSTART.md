# React Architecture - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide shows you how to use the refactored React architecture.

---

## 📁 Project Structure

```
src/
├── types/          ← Import all types from here
├── shared/         ← Reusable everything
│   ├── components/ui/  ← Button, Modal, Input, etc.
│   ├── hooks/          ← useLocalStorage, useDebounce, etc.
│   ├── store/          ← Zustand stores (modal, toast)
│   ├── utils/          ← Date, text, validation helpers
│   └── constants/      ← All configuration
├── features/       ← Feature-specific code
│   ├── canvas/
│   └── projects/
└── pages/          ← Route components
```

---

## 💡 Common Tasks

### 1. Show a Notification

```typescript
import { useToast } from '@shared/store/toastStore'

function MyComponent() {
  const toast = useToast()
  
  const handleSave = async () => {
    try {
      await save()
      toast.success('Saved successfully!')
    } catch (error) {
      toast.error('Save failed', error.message)
    }
  }
}
```

**Types**: `success`, `error`, `warning`, `info`

### 2. Use a Button

```typescript
import { Button } from '@shared/components/ui'

<Button 
  variant="primary"  // primary | secondary | danger | ghost | success
  size="md"          // sm | md | lg
  isLoading={saving}
  onClick={handleSave}
  fullWidth
>
  Save
</Button>
```

### 3. Create a Modal

```typescript
import { Modal, Button } from '@shared/components/ui'

<Modal isOpen={isOpen} onClose={onClose} size="md">
  <Modal.Header>
    <h2>My Modal</h2>
  </Modal.Header>
  <Modal.Body>
    <p>Content here</p>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={handleSave}>Save</Button>
  </Modal.Footer>
</Modal>
```

### 4. Use Form Inputs

```typescript
import { Input, Textarea } from '@shared/components/ui'

<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  helperText="Enter your email address"
  required
/>

<Textarea
  label="Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={4}
  error={errors.description}
/>
```

### 5. Manage Modal State

```typescript
import { useModalStore } from '@shared/store/modalStore'

function CanvasComponent() {
  const { openEditSnippet, closeEditSnippet, editSnippet } = useModalStore()
  
  // Open modal
  const handleEdit = (snippet) => {
    openEditSnippet(snippet)
  }
  
  // The modal is automatically managed!
  // Just check editSnippet.isOpen in your modal component
}
```

### 6. Use LocalStorage

```typescript
import { useLocalStorage } from '@shared/hooks'

const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light')

// Use like useState
setTheme('dark')

// Remove from storage
removeTheme()
```

### 7. Debounce a Value

```typescript
import { useDebounce } from '@shared/hooks'

const [searchTerm, setSearchTerm] = useState('')
const debouncedSearch = useDebounce(searchTerm, 300)

useEffect(() => {
  // Only runs after user stops typing for 300ms
  performSearch(debouncedSearch)
}, [debouncedSearch])
```

### 8. Format Dates

```typescript
import { formatDate, getTimeSince, formatDateTime } from '@shared/utils/dateFormatters'

formatDate('2024-01-15')           // "Jan 15, 2024"
formatDateTime('2024-01-15')       // "Jan 15, 2024, 10:30 AM"
getTimeSince('2024-01-15')         // "2 days ago"
```

### 9. Validate Forms

```typescript
import { isValidEmail, validateLoginForm } from '@shared/utils/validation'

// Individual validation
if (!isValidEmail(email)) {
  setError('Invalid email')
}

// Full form validation
const errors = validateLoginForm(email, password)
if (errors.length > 0) {
  // Handle errors
  errors.forEach(err => {
    setFieldError(err.field, err.message)
  })
}
```

### 10. Use Constants

```typescript
import { CANVAS_CONSTANTS, VALIDATION, UI } from '@shared/constants'

// Canvas constants
const wordLimit = CANVAS_CONSTANTS.WORD_LIMIT // 100

// Validation constants
const minLength = VALIDATION.MIN_PASSWORD_LENGTH // 8

// UI constants
const toastDuration = UI.TOAST_DURATION // 5000
```

---

## 🎯 Common Patterns

### Pattern 1: Creating a New Feature Component

```typescript
import { useState } from 'react'
import { Button, Input } from '@shared/components/ui'
import { useToast } from '@shared/store/toastStore'
import { isValidEmail } from '@shared/utils/validation'
import type { User } from '@types'

export const MyFeature = () => {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  
  const handleSubmit = () => {
    if (!isValidEmail(email)) {
      setError('Invalid email')
      return
    }
    
    // Do something
    toast.success('Done!')
  }
  
  return (
    <div>
      <Input
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
      />
      <Button onClick={handleSubmit}>Submit</Button>
    </div>
  )
}
```

### Pattern 2: Using Zustand Store

```typescript
// 1. Define your store
import { create } from 'zustand'

interface MyState {
  count: number
  increment: () => void
  decrement: () => void
}

export const useMyStore = create<MyState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 }))
}))

// 2. Use in components
import { useMyStore } from '@features/my-feature/store'

const { count, increment } = useMyStore()
```

### Pattern 3: Custom Hook with GraphQL

```typescript
import { useCallback } from 'react'
import { useGraphQLMutation } from '@/hooks/useGraphQLMutation'
import { MY_MUTATION } from '@/graphql/mutations'
import { useToast } from '@shared/store/toastStore'

export function useMyFeature() {
  const toast = useToast()
  
  const { mutate, loading } = useGraphQLMutation(MY_MUTATION, {
    onCompleted: () => {
      toast.success('Success!')
    },
    onError: (error) => {
      toast.error('Failed', error.message)
    }
  })
  
  const doSomething = useCallback(async () => {
    await mutate({ variables: { ... } })
  }, [mutate])
  
  return { doSomething, loading }
}
```

---

## 🛠️ Development Workflow

### Adding a New Component

1. **Import types**: `import type { MyType } from '@types'`
2. **Use shared UI**: `import { Button } from '@shared/components/ui'`
3. **Add toast**: `const toast = useToast()`
4. **Add state if needed**: Use Zustand for shared state
5. **Add utils**: Use shared utilities

### Adding a New Feature

1. **Create directory**: `src/features/my-feature/`
2. **Add store** (if needed): `store/myFeatureStore.ts`
3. **Add hooks** (if needed): `hooks/useMyFeature.ts`
4. **Add components**: `components/MyComponent.tsx`
5. **Add types** (if needed): Add to `src/types/domain.ts`

---

## 📋 Checklists

### Before Committing
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Linter passes (`npm run lint`)
- [ ] Used shared components where possible
- [ ] Used toast instead of alert
- [ ] Imported types from `@types`
- [ ] Added proper error handling

### Code Review Checklist
- [ ] No alert() calls
- [ ] No type duplication
- [ ] Using shared UI components
- [ ] Using utility functions
- [ ] Constants instead of magic numbers
- [ ] Proper error boundaries
- [ ] Toast notifications for user feedback

---

## 🐛 Troubleshooting

### Import Errors
**Problem**: Can't find `@shared` or `@types`  
**Solution**: These are path aliases defined in `vite.config.ts`

### TypeScript Errors
**Problem**: Type mismatch  
**Solution**: Check `src/types/` for the correct types

### Modal Not Opening
**Problem**: Modal state not working  
**Solution**: Use `useModalStore()` instead of local useState

### Toast Not Showing
**Problem**: Notifications don't appear  
**Solution**: Ensure `<ToastContainer />` is in App.tsx

---

## 📚 Documentation

For more details, see:

1. **ARCHITECTURE.md** - Complete architecture guide
2. **MIGRATION_CHECKLIST.md** - Migration steps
3. **FINAL_SUMMARY.md** - What was accomplished
4. **STATUS.md** - Current status

---

## 🎓 Learning Resources

### Code Examples
- All shared components have inline examples
- Check `src/shared/components/ui/` for patterns
- Check `src/shared/hooks/` for hook examples

### Best Practices
- See ARCHITECTURE.md "Best Practices" section
- Follow patterns in refactored components
- Use TypeScript strict mode

---

## 💬 Quick Reference

### Most Used Imports
```typescript
import { Button, Modal, Input } from '@shared/components/ui'
import { useToast } from '@shared/store/toastStore'
import { useModalStore } from '@shared/store/modalStore'
import { formatDate } from '@shared/utils/dateFormatters'
import { CANVAS_CONSTANTS } from '@shared/constants'
import type { Snippet, Project } from '@types'
```

### Most Used Patterns
```typescript
// Toast notification
const toast = useToast()
toast.success('Done!')

// Modal management
const { openEditSnippet } = useModalStore()
openEditSnippet(snippet)

// Constants
const limit = CANVAS_CONSTANTS.WORD_LIMIT

// Utilities
const formatted = formatDate(date)
```

---

**Happy coding!** 🚀

If you have questions, check the documentation or ask the team!


