/**
 * Date formatting utilities
 * Centralized date formatting functions to reduce duplication
 */

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatDetailedDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const getTimeSince = (dateString: string): string => {
  const date = new Date(dateString)
  const timestamp = date.getTime()

  if (Number.isNaN(timestamp)) return 'Unknown'

  const now = new Date()
  const diffMs = now.getTime() - timestamp

  if (diffMs <= 0) return 'Just now'

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) {
    const label = diffMinutes === 1 ? 'minute' : 'minutes'
    return `${diffMinutes} ${label} ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    const label = diffHours === 1 ? 'hour' : 'hours'
    return `${diffHours} ${label} ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) {
    const label = diffWeeks === 1 ? 'week' : 'weeks'
    return `${diffWeeks} ${label} ago`
  }

  return formatDate(dateString)
}



