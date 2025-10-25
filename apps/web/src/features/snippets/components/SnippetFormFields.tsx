import type { SnippetFormState } from '../hooks/useSnippetForm'

interface SnippetFormFieldsProps {
  formState: SnippetFormState
  activeField: 'textField1' | 'textField2' | null
  savingField: 'textField1' | 'textField2' | null
  onTitleChange: (title: string) => void
  onTextField1Change: (value: string) => void
  onTextField2Change: (value: string) => void
  onFieldActivate: (field: 'textField1' | 'textField2') => void
  onFieldBlur: (field: 'textField1' | 'textField2', value: string) => Promise<void>
  textField1Ref: React.MutableRefObject<HTMLTextAreaElement | null>
  textField2Ref: React.MutableRefObject<HTMLTextAreaElement | null>
  isDisabled?: boolean
}

/**
 * SnippetFormFields - Render snippet form fields
 * Displays title, textField1, textField2 with edit support
 */
export const SnippetFormFields = ({
  formState,
  activeField,
  savingField,
  onTitleChange,
  onTextField1Change,
  onTextField2Change,
  onFieldActivate,
  onFieldBlur,
  textField1Ref,
  textField2Ref,
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
          Field 1 {savingField === 'textField1' && '(saving...)'}
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
            role="button"
            tabIndex={0}
            className="w-full px-3 py-2 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 min-h-[100px] text-sm text-gray-700"
          >
            {formState.textField1 || 'Click to edit...'}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="textField2" className="block text-sm font-medium text-gray-700 mb-1">
          Field 2 {savingField === 'textField2' && '(saving...)'}
        </label>
        {activeField === 'textField2' ? (
          <textarea
            id="textField2"
            ref={textField2Ref}
            value={formState.textField2}
            onChange={(e) => onTextField2Change(e.target.value)}
            onBlur={(e) => onFieldBlur('textField2', e.target.value)}
            className="w-full px-3 py-2 border border-blue-500 rounded-md focus:outline-none resize-none"
            rows={4}
            disabled={isDisabled || savingField === 'textField2'}
          />
        ) : (
          <div
            onClick={() => onFieldActivate('textField2')}
            role="button"
            tabIndex={0}
            className="w-full px-3 py-2 bg-blue-50 rounded-md cursor-pointer hover:bg-blue-100 min-h-[100px] text-sm text-gray-700"
          >
            {formState.textField2 || 'Click to edit...'}
          </div>
        )}
      </div>
    </div>
  )
}
