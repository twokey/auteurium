import type { SnippetFormState } from '../hooks/useSnippetForm'

interface SnippetFormFieldsProps {
  formState: SnippetFormState
  activeField: 'mainText' | null
  savingField: 'mainText' | null
  onTitleChange: (title: string) => void
  onMainTextChange: (value: string) => void
  onFieldActivate: (field: 'mainText') => void
  onFieldBlur: (field: 'mainText', value: string) => Promise<void>
  mainTextRef: React.MutableRefObject<HTMLTextAreaElement | null>
  isDisabled?: boolean
}

/**
 * SnippetFormFields - Render snippet form fields
 * Displays title and primary content with edit support
 */
export const SnippetFormFields = ({
  formState,
  activeField,
  savingField,
  onTitleChange,
  onMainTextChange,
  onFieldActivate,
  onFieldBlur,
  mainTextRef,
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
        <label htmlFor="mainText" className="block text-sm font-medium text-gray-700 mb-1">
          Content {savingField === 'mainText' && '(saving...)'}
        </label>
        {activeField === 'mainText' ? (
          <textarea
            id="mainText"
            ref={mainTextRef}
            value={formState.mainText}
            onChange={(e) => onMainTextChange(e.target.value)}
            onBlur={(e) => void onFieldBlur('mainText', e.target.value)}
            className="w-full px-3 py-2 border border-blue-500 rounded-md focus:outline-none resize-none"
            rows={4}
            disabled={isDisabled || savingField === 'mainText'}
          />
        ) : (
          <div
            onClick={() => onFieldActivate('mainText')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onFieldActivate('mainText')
              }
            }}
            role="button"
            tabIndex={0}
            className="w-full px-3 py-2 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 min-h-[100px] text-sm text-gray-700"
          >
            {formState.mainText || 'Click to edit...'}
          </div>
        )}
      </div>
    </div>
  )
}
