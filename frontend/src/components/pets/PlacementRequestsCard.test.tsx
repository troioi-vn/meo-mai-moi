import { screen } from '@testing-library/react'
import { renderWithRouter } from '@/testing'
import { describe, it, expect, vi } from 'vite-plus/test'
import { PlacementRequestsCard } from './PlacementRequestsCard'

/**
 * The add button is the only way into the create flow, so whether it renders is
 * a permission boundary rather than a styling detail. The backend narrowed this
 * from "can edit the pet" to "owner or active group member" - an editor helping
 * with health records must not be able to list a cat for rehoming - and this
 * pins the client to the same rule.
 */
describe('PlacementRequestsCard add button', () => {
  const renderCard = (canManagePlacements: boolean) =>
    renderWithRouter(
      <PlacementRequestsCard
        petId={1}
        placementRequests={[]}
        canManagePlacements={canManagePlacements}
        onSuccess={vi.fn()}
      />
    )

  it('offers the create action to someone who may manage placements', () => {
    renderCard(true)

    expect(screen.getByRole('button', { name: 'Create Request' })).toBeInTheDocument()
  })

  it('hides the create action from everyone else, including editors', () => {
    renderCard(false)

    expect(screen.queryByRole('button', { name: 'Create Request' })).not.toBeInTheDocument()
  })
})
