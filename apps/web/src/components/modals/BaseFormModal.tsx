import { type ReactNode, type FormEvent } from 'react'

import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export interface FormModalConfig {
  title: string
  submitText?: string
  cancelText?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isDangerous?: boolean
}

interface BaseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: FormEvent) => void | Promise<void>
  config: FormModalConfig
  isLoading?: boolean
  error?: string | null
  children: ReactNode
}

/**
 * BaseFormModal - Template for form-based modals
 * Handles common form patterns: submission, loading, error display
 * 
 * @example
 * <BaseFormModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   onSubmit={handleSubmit}
 *   config={{ title: 'Edit Item', submitText: 'Save' }}
 *   isLoading={isSubmitting}
 *   error={error}
 * >
 *   <FormField label="Name" {...register('name')} />
 * </BaseFormModal>
 */
export const BaseFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  config,
  isLoading = false,
  error = null,
  children
}: BaseFormModalProps) => {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await onSubmit(e)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={config.size ?? 'md'}>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <Modal.Header>
          <h2 className="text-lg font-semibold text-gray-900">{config.title}</h2>
        </Modal.Header>
        
        <Modal.Body>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}
          {children}
        </Modal.Body>
        
        <Modal.Footer>
          <Button 
            type="button"
            variant="secondary" 
            onClick={onClose}
            disabled={isLoading}
          >
            {config.cancelText ?? 'Cancel'}
          </Button>
          <Button 
            type="submit"
            variant={config.isDangerous ? 'danger' : 'primary'}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {config.submitText ?? 'Submit'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}


