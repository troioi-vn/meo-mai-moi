import { Badge } from '@/components/ui/badge'

export function HelperProfileStatusBadge({ status }: { status?: string }) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500">Active</Badge>
    case 'archived':
      return <Badge variant="secondary">Archived</Badge>
    case 'deleted':
      return <Badge variant="destructive">Deleted</Badge>
    default:
      return null
  }
}
