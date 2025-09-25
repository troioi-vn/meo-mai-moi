export const getStatusDisplay = (status?: string): string => {
  if (!status || typeof status !== 'string') return ''
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export const getStatusClasses = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'lost':
      return 'bg-yellow-100 text-yellow-800'
    case 'deceased':
      return 'bg-blue-100 text-blue-800'
    case 'deleted':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
