# Quick Start Guide - New Refactored Code

**Status**: ✅ READY TO USE
**Last Updated**: October 18, 2025

---

## 🚀 Quick Access

### Import Base Components

```typescript
// Modals
import { ConfirmationModal, BaseFormModal } from '@shared/components/modals'

// Forms
import { FormField, FormSection } from '@shared/components/forms'
```

### Import Hooks

```typescript
// Generic
import { useEntityForm, useModalForm } from '@shared/hooks'

// Snippets
import { 
  useSnippetForm,
  useSnippetGeneration,
  useSnippetMutations,
  useSnippetVersions,
  useSnippetNodeEditing,
  useSnippetNodeActions
} from '@features/snippets/hooks'

// Connections
import {
  useConnectionManagement,
  useConnectionListing
} from '@features/connections/hooks'
```

### Import Utilities

```typescript
import {
  FormValidation,
  FormSerialization,
  ErrorMapping,
  FormFields,
  FormState
} from '@shared/utils/formHelpers'
```

---

## 📋 Common Patterns

### Pattern 1: Simple Form with useEntityForm

```typescript
const MyForm = () => {
  const form = useEntityForm({ name: '', email: '' })
  
  return (
    <div>
      <FormField
        label="Name"
        value={form.formData.name}
        onChange={(e) => form.updateField('name', e.target.value)}
      />
      <FormField
        label="Email"
        value={form.formData.email}
        onChange={(e) => form.updateField('email', e.target.value)}
      />
      <button onClick={() => form.reset()}>Reset</button>
    </div>
  )
}
```

### Pattern 2: Modal Form with useModalForm

```typescript
const MyModalForm = () => {
  const modal = useModalForm({ name: '', email: '' })
  
  const handleSubmit = async (data) => {
    await api.saveData(data)
  }
  
  return (
    <>
      <button onClick={() => modal.openModal()}>Open</button>
      <BaseFormModal
        isOpen={modal.isOpen}
        onClose={modal.closeModal}
        onSubmit={() => modal.onSubmit(handleSubmit)}
        title="Edit"
        isLoading={modal.isSubmitting}
        error={modal.submitError}
      >
        {/* Form fields */}
      </BaseFormModal>
    </>
  )
}
```

### Pattern 3: Confirmation Modal

```typescript
const MyComponent = () => {
  const [showConfirm, setShowConfirm] = useState(false)
  
  return (
    <>
      <button onClick={() => setShowConfirm(true)}>Delete</button>
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          deleteItem()
          setShowConfirm(false)
        }}
        title="Delete?"
        isDangerous
      />
    </>
  )
}
```

### Pattern 4: Form Validation

```typescript
const validateForm = (data) => {
  const errors = {}
  
  if (FormValidation.required(data.name)) {
    errors.name = FormValidation.required(data.name)
  }
  
  if (FormValidation.email(data.email)) {
    errors.email = FormValidation.email(data.email)
  }
  
  return errors
}

// Use in form
if (Object.keys(errors).length === 0) {
  // Valid
}
```

### Pattern 5: Serialize Form Data

```typescript
const handleSubmit = (data) => {
  // Clean up data
  const cleaned = FormSerialization.trimAll(data)
  const filtered = FormSerialization.removeEmpty(cleaned)
  
  // Send to API
  api.save(filtered)
}
```

---

## 📁 File Locations

| What | Where |
|------|-------|
| Base modals | `apps/web/src/shared/components/modals/` |
| Form components | `apps/web/src/shared/components/forms/` |
| Generic hooks | `apps/web/src/shared/hooks/` |
| Form helpers | `apps/web/src/shared/utils/formHelpers.ts` |
| Snippet hooks | `apps/web/src/features/snippets/hooks/` |
| Snippet components | `apps/web/src/features/snippets/components/` |
| Connection hooks | `apps/web/src/features/connections/hooks/` |
| Connection components | `apps/web/src/features/connections/components/` |

---

## 🎯 Using Refactored Components

### EditSnippetModal

```typescript
import { EditSnippetModal } from '@features/snippets/modals/EditSnippetModal.refactored'

<EditSnippetModal 
  isOpen={isOpen} 
  onClose={onClose} 
  snippet={snippet}
/>
```

### ManageConnectionsModal

```typescript
import { ManageConnectionsModal } from '@features/connections/modals/ManageConnectionsModal.refactored'

<ManageConnectionsModal
  isOpen={isOpen}
  onClose={onClose}
  snippet={snippet}
  allSnippets={allSnippets}
/>
```

### VersionHistoryModal

```typescript
import { VersionHistoryModal } from '@features/snippets/modals/VersionHistoryModal.refactored'

<VersionHistoryModal
  isOpen={isOpen}
  onClose={onClose}
  snippet={snippet}
/>
```

### SnippetNode

```typescript
import { SnippetNode } from '@features/snippets/components/SnippetNode.refactored'

<SnippetNode
  id={nodeId}
  data={{
    snippet: {...},
    onEdit: handleEdit,
    onDelete: handleDelete,
    // ... other handlers
  }}
/>
```

---

## 📚 Documentation

- **HOOKS_PATTERNS.md** - How to create and use custom hooks
- **MODAL_PATTERNS.md** - How to create and use modals
- **Code JSDoc** - Each file has detailed comments

---

## ✅ Checklist for Using New Code

- [ ] Import from correct location
- [ ] Use FormField for inputs (not raw input)
- [ ] Use FormSection for groups (not divs)
- [ ] Use hooks for state (not useState)
- [ ] Use base modals (not custom)
- [ ] Add proper type interfaces
- [ ] Handle errors with toast
- [ ] Show loading states
- [ ] Disable form during submission
- [ ] Add JSDoc comments

---

## 🔧 Creating New Modals

1. Create store (optional, if needs persistent state)
2. Create hooks for form/operations
3. Create components for UI sections
4. Create modal that composes hooks + components
5. Use in your feature

See `MODAL_PATTERNS.md` for detailed example.

---

## 🐛 Common Pitfalls

❌ Using old monolithic modals
✅ Use refactored or create new following pattern

❌ Creating custom input components
✅ Use FormField

❌ Managing form state in component
✅ Use useEntityForm or useModalForm

❌ Catching errors and not showing them
✅ Use toast.error() in catch blocks

❌ Forgetting to disable form during submit
✅ Add `disabled={isSubmitting}` to inputs

---

## 📞 Need Help?

1. Check the documentation files
2. Look at examples in the refactored files
3. Review the progress reports
4. Follow the established patterns
5. Ask questions in team channels

---

## 🎓 Key Takeaways

- **Hooks are for state**: Use them instead of useState
- **Components are for UI**: Keep them simple and pure
- **Modals are orchestrators**: Compose hooks and components
- **Patterns matter**: Follow the established structure
- **Documentation exists**: Reference HOOKS_PATTERNS.md and MODAL_PATTERNS.md

---

**You're ready to use the new refactored code!** 🚀

