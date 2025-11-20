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

const ModalMain = ({ isOpen, onClose, children, size = 'md' }: ModalProps) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={`relative bg-white rounded-xl shadow-2xl w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col animate-scale-in border border-surface-200`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}

ModalMain.displayName = 'Modal'

const ModalHeader = ({ children }: ModalHeaderProps) => {
  return (
    <div className="px-6 py-4 border-b border-surface-100">
      {children}
    </div>
  )
}
ModalHeader.displayName = 'ModalHeader'

const ModalBody = ({ children }: ModalBodyProps) => {
  return (
    <div className="px-6 py-4 overflow-y-auto flex-1">
      {children}
    </div>
  )
}
ModalBody.displayName = 'ModalBody'

const ModalFooter = ({ children }: ModalFooterProps) => {
  return (
    <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-end gap-3 bg-surface-50/50 rounded-b-xl">
      {children}
    </div>
  )
}
ModalFooter.displayName = 'ModalFooter'

export const Modal = Object.assign(ModalMain, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter
})



