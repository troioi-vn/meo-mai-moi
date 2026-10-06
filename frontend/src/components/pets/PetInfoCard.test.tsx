import { describe, expect, it, vi } from 'vite-plus/test'
import { render, screen } from '@/testing'
import { mockCatWithFosterRequest } from '@/testing/mocks/data/pets'
import { PetInfoCard } from './PetInfoCard'

vi.mock('@/hooks/useVaccinations', () => ({
  useVaccinations: () => ({ items: [], loading: false }),
}))

describe('pet profile identity and care navigation', () => {
  it('shows identity details without editing and names the edit action', () => {
    render(
      <PetInfoCard
        pet={mockCatWithFosterRequest}
        canEdit
        onPetUpdate={vi.fn()}
        vaccinationVersion={0}
      />
    )
    expect(screen.getByText('Cat · Female')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Fluffy’s profile' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'No vaccination due dates' })).toHaveAttribute(
      'href',
      '#vaccinations'
    )
  })
})
