export const calculateAge = (birthday: string): number => {
  const birthDate = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

/**
 * Format a date as relative time (e.g., "2 min ago", "Yesterday", "Dec 15")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return 'Now'
  }
  if (diffMins < 60) {
    return `${String(diffMins)}m ago`
  }
  if (diffHours < 24) {
    return `${String(diffHours)}h ago`
  }
  if (diffDays === 1) {
    return 'Yesterday'
  }
  if (diffDays < 7) {
    return `${String(diffDays)}d ago`
  }

  // Format as "Dec 15" or "Dec 15, 2023" if different year
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric'
  }
  return date.toLocaleDateString('en-US', options)
}
