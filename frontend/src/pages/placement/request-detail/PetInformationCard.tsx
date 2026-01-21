import { Link } from 'react-router-dom'
import type { PlacementRequestDetail } from '@/types/placement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PetInformationCardProps {
  request: PlacementRequestDetail
  petCity?: string | null
}

export function PetInformationCard({ request, petCity }: PetInformationCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Pet Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {request.pet.photo_url && (
            <img
              src={request.pet.photo_url}
              alt={request.pet.name}
              className="h-20 w-20 rounded-lg object-cover"
            />
          )}
          <div>
            <h3 className="font-semibold">{request.pet.name}</h3>
            {request.pet.pet_type && (
              <p className="text-sm text-muted-foreground">{request.pet.pet_type.name}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {petCity}
              {request.pet.state && `, ${request.pet.state}`}
              {request.pet.country && `, ${request.pet.country}`}
            </p>
            <Link
              to={`/pets/${String(request.pet.id)}/view`}
              className="text-sm text-primary hover:underline"
            >
              View Pet Profile →
            </Link>
          </div>
        </div>

        {request.notes && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">Notes</p>
            <p className="text-sm text-muted-foreground">{request.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
