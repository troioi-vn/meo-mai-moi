import React from 'react'
import { Button } from '@/components/ui/button'

interface OwnerButtonGroupProps {
  onPlacementRequest: () => void
  onMyCats: () => void
  showPlacementRequest?: boolean
}

export const OwnerButtonGroup: React.FC<OwnerButtonGroupProps> = ({
  onPlacementRequest,
  onMyCats,
  showPlacementRequest = true,
}) => (
  <div className="flex gap-3 mb-4">
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
