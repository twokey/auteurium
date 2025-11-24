/**
 * Text manipulation utilities
 * Common text operations used across components
 */

export const countWords = (text?: string | null): number => {
  if (typeof text !== 'string') return 0
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

export const truncateToWords = (text: string, wordLimit: number): string => {
  const words = text.trim().split(/\s+/)
  if (words.length <= wordLimit) return text
  return words.slice(0, wordLimit).join(' ') + '...'
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const capitalizeFirst = (text: string): string => {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export const sanitizeText = (text: string): string => {
  return text.trim().replace(/\s+/g, ' ')
}


