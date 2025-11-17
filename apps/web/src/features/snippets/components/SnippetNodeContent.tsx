import { countWords } from '../../../shared/utils/textUtils'

import type { EditableField } from '../../../types'

interface SnippetNodeContentProps {
  activeField: EditableField | null
  draftValues: {
    textField1: string
  }
  savingField: EditableField | null
  textField1Ref: React.RefObject<HTMLTextAreaElement | null>
  onFieldChange: (field: EditableField, value: string) => void
  onFieldActivate: (field: EditableField) => void
  onFieldBlur: (field: EditableField, value: string, onSave: (field: EditableField, value: string) => Promise<void>) => Promise<void>
  onFieldSave: (field: EditableField, value: string) => Promise<void>
  isDisabled?: boolean
}

/**
 * SnippetNodeContent - Display and edit snippet fields inline
 * Renders textField1 with toggle between view and edit modes
 */
export const SnippetNodeContent = ({
  activeField,
  draftValues,
  savingField,
  textField1Ref,
  onFieldChange,
  onFieldActivate,
  onFieldBlur,
  onFieldSave,
  isDisabled = false
}: SnippetNodeContentProps) => {
  const wordCountField1 = countWords(draftValues.textField1)

  return (
    <div className="space-y-1.5">
      {/* textField1 */}
      <div>
        {activeField === 'textField1' ? (
          <textarea
            ref={textField1Ref}
            value={draftValues.textField1}
            onChange={(e) => onFieldChange('textField1', e.target.value)}
            onBlur={async () => {
              await onFieldBlur('textField1', draftValues.textField1, onFieldSave)
            }}
            className="w-full px-2 py-1 text-sm bg-white border border-blue-500 rounded focus:outline-none resize-none"
            rows={3}
            disabled={isDisabled || savingField === 'textField1'}
          />
        ) : (
          <div
            onClick={() => onFieldActivate('textField1')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onFieldActivate('textField1')
              }
            }}
            className="text-xs text-gray-700 whitespace-pre-wrap p-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 transition-colors"
          >
            {draftValues.textField1 || <span className="text-gray-400 italic">Click to edit...</span>}
          </div>
        )}
        <p className="text-[10px] text-gray-500 mt-0.5">
          {wordCountField1} words {savingField === 'textField1' && '(saving...)'}
        </p>
      </div>
    </div>
  )
}


