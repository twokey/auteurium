import { ReactNode } from 'react'

interface FormSectionProps {
  title?: string
  description?: string
  children: ReactNode
}

/**
 * FormSection - Group related form fields with optional heading
 * Provides visual separation and organization within forms
 * 
 * @example
 * <FormSection title="Personal Information" description="Your personal details">
 *   <FormField label="Name" />
 *   <FormField label="Email" />
 * </FormSection>
 */
export const FormSection = ({
  title,
  description,
  children
}: FormSectionProps) => {
  return (
    <div className="space-y-4">
      {(title || description) && (
        <div className="border-b border-gray-200 pb-4">
          {title && (
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}


