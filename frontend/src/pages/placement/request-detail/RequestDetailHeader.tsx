import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import type { PlacementRequestDetail } from '@/types/placement'
import { formatRequestType, formatStatus } from '@/types/placement'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getStatusBadgeVariant } from './utils'

interface RequestDetailHeaderProps {
  request: PlacementRequestDetail
  petCity?: string | null
}

export function RequestDetailHeader({ request, petCity }: RequestDetailHeaderProps) {
  return (
    <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 pb-4 mb-6 -mx-4 px-4 border-b">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <Link to="/requests" className="hover:text-foreground">
          Requests
        </Link>
        <span>/</span>
        <Link to={`/pets/${String(request.pet.id)}/view`} className="hover:text-foreground">
          {request.pet.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Request #{request.id}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {request.pet.photo_url && (
            <img
              src={request.pet.photo_url}
              alt={request.pet.name}
              className="h-12 w-12 rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {formatRequestType(request.request_type)}
              <Badge variant={getStatusBadgeVariant(request.status)}>
                {formatStatus(request.status)}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              {request.pet.name}
              {petCity && ` • ${petCity}`}
              {request.pet.country && `, ${request.pet.country}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {request.chat_id && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/messages/${String(request.chat_id)}`}>
                <MessageCircle className="h-4 w-4 mr-1" />
                Chat
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
