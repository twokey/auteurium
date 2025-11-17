import type { SnippetFormState } from '../hooks/useSnippetForm'

interface SnippetFormFieldsProps {
  formState: SnippetFormState
  activeField: 'textField1' | null
  savingField: 'textField1' | null
  onTitleChange: (title: string) => void
  onTextField1Change: (value: string) => void
  onFieldActivate: (field: 'textField1') => void
  onFieldBlur: (field: 'textField1', value: string) => Promise<void>
  textField1Ref: React.MutableRefObject<HTMLTextAreaElement | null>
  isDisabled?: boolean
}

/**
 * SnippetFormFields - Render snippet form fields
 * Displays title and textField1 with edit support
 */
export const SnippetFormFields = ({
  formState,
  activeField,
  savingField,
  onTitleChange,
  onTextField1Change,
  onFieldActivate,
  onFieldBlur,
  textField1Ref,
  isDisabled = false
}: SnippetFormFieldsProps) => {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={formState.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isDisabled}
        />
      </div>

      <div>
        <label htmlFor="textField1" className="block text-sm font-medium text-gray-700 mb-1">
          Content {savingField === 'textField1' && '(saving...)'}
        </label>
        {activeField === 'textField1' ? (
          <textarea
            id="textField1"
            ref={textField1Ref}
            value={formState.textField1}
            onChange={(e) => onTextField1Change(e.target.value)}
            onBlur={(e) => onFieldBlur('textField1', e.target.value)}
            className="w-full px-3 py-2 border border-blue-500 rounded-md focus:outline-none resize-none"
            rows={4}
            disabled={isDisabled || savingField === 'textField1'}
          />
        ) : (
          <div
            onClick={() => onFieldActivate('textField1')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onFieldActivate('textField1')
              }
            }}
            role="button"
            tabIndex={0}
            className="w-full px-3 py-2 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 min-h-[100px] text-sm text-gray-700"
          >
            {formState.textField1 || 'Click to edit...'}
          </div>
        )}
      </div>
    </div>
  )
}
