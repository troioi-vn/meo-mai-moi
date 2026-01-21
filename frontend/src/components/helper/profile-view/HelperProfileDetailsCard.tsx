import { Baby, PawPrint } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HelperProfile } from '@/types/helper-profile'

export function HelperProfileDetailsCard({ profile }: { profile: HelperProfile }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <PawPrint className="h-4 w-4" />
            Has Pets
          </span>
          <span className="font-medium">{profile.has_pets ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Baby className="h-4 w-4" />
            Has Children
          </span>
          <span className="font-medium">{profile.has_children ? 'Yes' : 'No'}</span>
        </div>
      </CardContent>
    </Card>
  )
}
