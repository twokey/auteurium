/**
 * Reusable Modal component using compound component pattern
 * Provides consistent modal styling and behavior
 */

import { type ReactNode, useEffect } from 'react'

import { useKeyPress } from '../../hooks/useKeyPress'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

interface ModalHeaderProps {
  children: ReactNode
}

interface ModalBodyProps {
  children: ReactNode
}

interface ModalFooterProps {
  children: ReactNode
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}

export const Modal = ({ isOpen, onClose, children, size = 'md' }: ModalProps) => {
  // Close on Escape key
  useKeyPress('Escape', onClose, { preventDefault: false })

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
        aria-label="Close modal"
      />
      <div 
        className={`relative bg-white rounded-lg shadow-xl w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}

Modal.Header = function ModalHeader({ children }: ModalHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      {children}
    </div>
  )
}

Modal.Body = function ModalBody({ children }: ModalBodyProps) {
  return (
    <div className="px-6 py-4 overflow-y-auto flex-1">
      {children}
    </div>
  )
}

Modal.Footer = function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
      {children}
    </div>
  )
}



