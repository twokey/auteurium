import { useState, useCallback } from 'react'
import { countWords } from '../../../utils/textUtils'
import { getRenderableFields } from '../../../utils/snippetContent'
import type { SnippetField } from '../../../types'

interface SnippetNodeContentProps {
  content: Record<string, SnippetField>
  activeField: string | null
  draftValues: Record<string, string>
  savingField: string | null
  onFieldChange: (field: string, value: string) => void
  onFieldActivate: (field: string) => void
  onFieldBlur: (field: string) => void
  onAddField: (key: string, value: string) => void
  onDeleteField: (key: string) => void
  isDisabled?: boolean
}

export const SnippetNodeContent = ({
  content,
  activeField,
  draftValues,
  savingField,
  onFieldChange,
  onFieldActivate,
  onFieldBlur,
  onAddField,
  onDeleteField,
  isDisabled = false
}: SnippetNodeContentProps) => {
  const fields = getRenderableFields({ content })
  const [isAddingField, setIsAddingField] = useState(false)
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldValue, setNewFieldValue] = useState('')

  const handleAddField = useCallback(() => {
    if (newFieldKey && newFieldValue) {
      onAddField(newFieldKey, newFieldValue)
      setNewFieldKey('')
      setNewFieldValue('')
      setIsAddingField(false)
    }
  }, [newFieldKey, newFieldValue, onAddField])

  return (
    <div className="space-y-3">
      {fields.map((field) => {
        const isEditing = activeField === field.key
        const value = isEditing ? (draftValues[field.key] ?? field.value) : field.value
        const safeValue = value ?? ''
        const wordCount = countWords(safeValue)

        return (
          <div key={field.key} className="space-y-1">
            {field.label && (
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  {field.label}
                </label>
                {!field.isSystem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteField(field.key)
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete field"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {isEditing ? (
              <textarea
                value={safeValue}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                onBlur={() => onFieldBlur(field.key)}
                className="w-full px-2 py-1 text-sm bg-white border border-blue-500 rounded focus:outline-none resize-none"
                rows={Math.max(2, safeValue.split('\n').length)}
                disabled={isDisabled || savingField === field.key}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault()
                    onFieldBlur(field.key)
                  }
                }}
              />
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  onFieldActivate(field.key)
                }}
                role="button"
                tabIndex={0}
                className="text-sm text-gray-900 whitespace-pre-wrap p-1 -ml-1 hover:bg-gray-100 rounded cursor-pointer transition-colors border border-transparent hover:border-gray-200"
              >
                {value || <span className="text-gray-400 italic">Click to edit...</span>}
              </div>
            )}

            <p className="text-[10px] text-gray-400 text-right">
              {wordCount} words {savingField === field.key && '(saving...)'}
            </p>
          </div>
        )
      })}

      {/* Add Field UI */}
      {!isDisabled && (
        <div className="pt-2 border-t border-gray-100">
          {isAddingField ? (
            <div className="space-y-2 p-2 bg-gray-50 rounded border border-gray-200" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                placeholder="Field Name"
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <textarea
                placeholder="Content"
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
                className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsAddingField(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddField}
                  disabled={!newFieldKey || !newFieldValue}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Add Field
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsAddingField(true)
              }}
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Field
            </button>
          )}
        </div>
      )}
    </div>
  )
}
