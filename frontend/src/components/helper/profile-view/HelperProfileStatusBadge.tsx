import { Badge } from '@/components/ui/badge'

export function HelperProfileStatusBadge({ status }: { status?: string }) {
  switch (status) {
    case 'private':
      return <Badge variant="secondary">Private</Badge>
    case 'public':
      return <Badge className="bg-green-500">Public</Badge>
    case 'archived':
      return <Badge variant="secondary">Archived</Badge>
    case 'deleted':
      return <Badge variant="destructive">Deleted</Badge>
    default:
      return null
  }
}
