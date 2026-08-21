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

export type DetailLayout = 'owner' | 'engaged' | 'discovery'

/**
 * Which of the three page orders a viewer gets.
 *
 * The page used to render one fixed order for everyone, which put a card about
 * the viewer's own missing records above the animal they came to see. An owner
 * wants their responses first; someone mid-handover wants their own status
 * first; everyone else came here to meet a pet.
 */
export const resolveDetailLayout = (viewerRole: string, hasMyResponse: boolean): DetailLayout => {
  if (viewerRole === 'owner') return 'owner'
  if (hasMyResponse) return 'engaged'
  return 'discovery'
}
