import { useState } from 'react'

interface AccordionProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  isOptional?: boolean
  onToggle?: (isExpanded: boolean) => void
}

export const Accordion = ({
  title,
  children,
  defaultExpanded = false,
  isOptional = false,
  onToggle
}: AccordionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggle = () => {
    const newExpandedState = !isExpanded
    setIsExpanded(newExpandedState)
    onToggle?.(newExpandedState)
  }

  return (
    <div className="border border-gray-200 rounded-sm bg-white">
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 uppercase">
            {title}
          </span>
          {isOptional && (
            <span className="text-xs text-gray-400 font-normal normal-case">
              (Optional)
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content */}
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-2 pt-0 border-t border-gray-200">
          {children}
        </div>
      </div>
    </div>
  )
}
