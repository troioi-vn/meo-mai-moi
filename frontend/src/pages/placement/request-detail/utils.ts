export const getStatusBadgeVariant = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'open':
      return 'default'
    case 'pending_transfer':
    case 'active':
    case 'finalized':
      return 'secondary'
    default:
      return 'outline'
  }
}

export const getResponseStatusBadgeVariant = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'responded':
      return 'secondary'
    case 'accepted':
      return 'secondary'
    case 'rejected':
      return 'destructive'
    case 'cancelled':
      return 'outline'
    default:
      return 'outline'
  }
}
