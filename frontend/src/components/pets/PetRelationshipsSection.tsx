import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User as UserIcon, Calendar } from 'lucide-react'
import type { PetRelationship } from '@/types/pet'
import { format } from 'date-fns'

interface PetRelationshipsSectionProps {
  relationships: PetRelationship[]
}

export const PetRelationshipsSection: React.FC<PetRelationshipsSectionProps> = ({
  relationships,
}) => {
  // Filter out past 'viewer' relationships as they are usually less relevant for history.
  // We keep current viewers as requested.
  const relevantRelationships = relationships.filter(
    (r) => r.relationship_type !== 'viewer' || !r.end_at
  )

  const activeRelationships = relevantRelationships.filter((r) => !r.end_at)
  const pastRelationships = relevantRelationships
    .filter((r): r is PetRelationship & { end_at: string } => !!r.end_at)
    .sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime())

  const renderRelationship = (rel: PetRelationship) => (
    <div key={rel.id} className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="bg-muted p-2 rounded-full shrink-0">
        <UserIcon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{rel.user?.name ?? 'Unknown User'}</p>
          <Badge variant="outline" className="capitalize text-[10px] h-5 px-1.5">
            {rel.relationship_type}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Calendar className="h-3 w-3" />
          <span>
            {format(new Date(rel.start_at), 'MMM d, yyyy')}
            {rel.end_at ? ` - ${format(new Date(rel.end_at), 'MMM d, yyyy')}` : ' - Present'}
          </span>
        </div>
      </div>
    </div>
  )

  if (relevantRelationships.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground">People</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeRelationships.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Current
            </h3>
            <div className="space-y-1">{activeRelationships.map(renderRelationship)}</div>
          </div>
        )}

        {pastRelationships.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              History
            </h3>
            <div className="space-y-1">{pastRelationships.map(renderRelationship)}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
