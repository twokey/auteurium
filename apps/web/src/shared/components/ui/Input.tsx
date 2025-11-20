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
  const errorClass = error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'

  return (
    <div className={widthClass}>
      {label && (
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={`${widthClass} px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed ${errorClass} ${className}`}
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



