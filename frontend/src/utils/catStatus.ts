export const getStatusDisplay = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export const getStatusClasses = (status: string): string => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800'
    case 'fostered':
      return 'bg-yellow-100 text-yellow-800'
    case 'adopted':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
