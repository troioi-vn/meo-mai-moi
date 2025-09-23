import React from 'react'
import { Button } from '@/components/ui/button'

interface OwnerButtonGroupProps {
  onEdit: () => void
  onPlacementRequest: () => void
  onMyCats: () => void
}

export const OwnerButtonGroup: React.FC<OwnerButtonGroupProps> = ({
  onEdit,
  onPlacementRequest,
  onMyCats,
}) => (
  <div className="flex gap-3 mb-4">
    <Button onClick={onEdit} variant="outline">
      Edit
    </Button>
    <Button onClick={onPlacementRequest} variant="outline">
      Placement Request
    </Button>
    <Button onClick={onMyCats} variant="outline">
      My Cats
    </Button>
  </div>
)
