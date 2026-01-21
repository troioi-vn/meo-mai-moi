import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { HelperProfile } from '@/types/helper-profile'

export function HelperProfilePetTypesCard({
  petTypes,
}: {
  petTypes: NonNullable<HelperProfile['pet_types']>
}) {
  if (petTypes.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Pet Types</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {petTypes.map((pt) => (
            <Badge key={pt.id} variant="outline" className="text-sm">
              {pt.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
