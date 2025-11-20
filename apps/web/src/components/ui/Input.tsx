/**
 * Reusable Input component
 * Provides consistent input styling with error handling
 * React 19: Using ref as prop (no forwardRef wrapper needed)
 */

import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  ref?: React.Ref<HTMLInputElement>
}

export const Input = ({
  label,
  error,
  helperText,
  fullWidth = true,
  className = '',
  ref,
  ...props
}: InputProps) => {
  const widthClass = fullWidth ? 'w-full' : ''
  const errorClass = error
    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
    : 'border-surface-300 focus:ring-primary-500 focus:border-primary-500'

  return (
    <div className={widthClass}>
      {label && (
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-surface-700 mb-1"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={`${widthClass} px-3 py-2 border rounded-lg shadow-sm placeholder-surface-400 focus:outline-none focus:ring-2 disabled:bg-surface-100 disabled:cursor-not-allowed transition-colors duration-200 ${errorClass} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
}



