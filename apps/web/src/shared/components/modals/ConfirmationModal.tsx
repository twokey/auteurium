import { ReactNode } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
  isLoading?: boolean
}

/**
 * ConfirmationModal - Reusable confirmation dialog
 * Used for delete/confirm workflows with consistent UX
 * 
 * @example
 * <ConfirmationModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   onConfirm={handleDelete}
 *   title="Delete Item?"
 *   description="This action cannot be undone"
 *   isDangerous
 *   isLoading={isDeleting}
 * />
 */
export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false
}: ConfirmationModalProps) => {
  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <Modal.Header>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </Modal.Header>
      <Modal.Body>
        {description && (
          <div className="text-sm text-gray-600">
            {description}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button 
          variant={isDangerous ? 'danger' : 'primary'}
          onClick={() => {
            void handleConfirm()
          }}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}


