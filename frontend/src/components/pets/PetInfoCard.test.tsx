import { describe, expect, it, vi } from 'vite-plus/test'
import { act, render, renderWithRouter, screen, testQueryClient } from '@/testing'
import { getGetPetsIdQueryKey } from '@/api/generated/pets/pets'
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

describe('pet profile editor', () => {
  it('keeps typed edits when the pet refetches mid-edit', async () => {
    const pet = mockCatWithFosterRequest
    testQueryClient.setQueryData(getGetPetsIdQueryKey(pet.id), pet)
    const { user } = renderWithRouter(
      <PetInfoCard
        pet={pet}
        canEdit
        onPetUpdate={vi.fn()}
        vaccinationVersion={0}
        autoEditTab="general"
      />
    )

    const name = await screen.findByLabelText('Name')
    expect(name).toHaveValue(pet.name)
    await user.clear(name)
    await user.type(name, 'Fluffy Renamed')

    // A refetch that lands while the user is typing, as on a slow connection.
    await act(async () => {
      testQueryClient.setQueryData(getGetPetsIdQueryKey(pet.id), {
        ...pet,
        updated_at: new Date().toISOString(),
      })
      // React Query notifies observers on a timer; let the re-render land.
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.getByLabelText('Name')).toHaveValue('Fluffy Renamed')
  })
})
