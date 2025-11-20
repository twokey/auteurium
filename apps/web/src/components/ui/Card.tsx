/**
 * Reusable Card component
 * Provides consistent card styling
 */

import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  onClick?: () => void
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
}

const CardMain = ({
  children,
  className = '',
  padding = 'md',
  hoverable = false,
  onClick
}: CardProps) => {
  const baseStyles = 'bg-white rounded-xl border border-surface-200 shadow-sm'
  const hoverStyles = hoverable ? 'hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5' : ''
  const clickableStyles = onClick ? 'cursor-pointer' : ''

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding]} ${hoverStyles} ${clickableStyles} ${className}`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClick()
            }
          }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}

CardMain.displayName = 'Card'

interface CardHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

const CardHeader = ({ title, description, action }: CardHeaderProps) => {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-surface-900">{title}</h3>
        {description && (
          <p className="text-sm text-surface-500 mt-1">{description}</p>
        )}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}

CardHeader.displayName = 'CardHeader'

export const Card = Object.assign(CardMain, { Header: CardHeader })



