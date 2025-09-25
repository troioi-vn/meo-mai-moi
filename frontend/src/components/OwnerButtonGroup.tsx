import React from 'react'
import { Button } from '@/components/ui/button'

interface OwnerButtonGroupProps {
  onEdit: () => void
  onPlacementRequest: () => void
  onMyCats: () => void
  showPlacementRequest?: boolean
}

export const OwnerButtonGroup: React.FC<OwnerButtonGroupProps> = ({
  onEdit,
  onPlacementRequest,
  onMyCats,
  showPlacementRequest = true,
}) => (
  <div className="flex gap-3 mb-4">
    <Button onClick={onEdit} variant="outline">
      Edit
    </Button>
    {showPlacementRequest && (
      <Button onClick={onPlacementRequest} variant="outline">
        Placement Request
      </Button>
    )}
    <Button onClick={onMyCats} variant="outline">
      My Pets
    </Button>
  </div>
)
