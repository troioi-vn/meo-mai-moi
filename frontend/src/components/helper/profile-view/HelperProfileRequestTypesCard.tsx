import { Heart, Home } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { HelperProfile } from '@/types/helper-profile'

export function HelperProfileRequestTypesCard({ profile }: { profile: HelperProfile }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Request Types</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {profile.request_types?.includes('foster_paid') && (
            <Badge variant="default" className="text-sm">
              <Home className="h-3 w-3 mr-1" />
              Foster (Paid)
            </Badge>
          )}
          {profile.request_types?.includes('foster_free') && (
            <Badge variant="default" className="text-sm">
              <Home className="h-3 w-3 mr-1" />
              Foster (Free)
            </Badge>
          )}
          {profile.request_types?.includes('permanent') && (
            <Badge variant="default" className="text-sm">
              <Heart className="h-3 w-3 mr-1" />
              Permanent Adoption
            </Badge>
          )}
          {profile.request_types?.includes('pet_sitting') && (
            <Badge variant="default" className="text-sm">
              <Heart className="h-3 w-3 mr-1" />
              Pet Sitting
            </Badge>
          )}
          {(!profile.request_types || profile.request_types.length === 0) && (
            <span className="text-sm text-muted-foreground">No request types specified</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
