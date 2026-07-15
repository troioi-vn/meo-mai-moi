import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { renderWithRouter } from '@/testing'
import { PetSelectionToolbar } from './PetSelectionToolbar'

const mockAddGroupPets = vi.fn()
const mockGetGroup = vi.fn()

vi.mock('@/api/groups', () => ({
  addGroupPets: (...args: unknown[]) => mockAddGroupPets(...args),
  getGroup: (...args: unknown[]) => mockGetGroup(...args),
  invalidateGroupQueries: vi.fn().mockResolvedValue(undefined),
  useCreateGroup: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

describe('PetSelectionToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGroup.mockResolvedValue({
      id: 7,
      name: 'Catarchy Rescue',
      pets: [{ id: 1, name: 'Already there' }],
      members: [],
    })
    mockAddGroupPets.mockResolvedValue({ id: 7, name: 'Catarchy Rescue' })
  })

  it('excludes pets already assigned to the selected Group', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      <PetSelectionToolbar
        selectedCount={2}
        onExitSelection={vi.fn()}
        selectedPetIds={[1, 2]}
        adminGroups={[
          {
            id: 7,
            name: 'Catarchy Rescue',
            viewer_role: 'admin',
            member_count: 1,
            pet_count: 1,
          },
        ]}
      />
    )

    await user.click(screen.getByTestId('add-to-group-from-selection'))
    await user.click(screen.getByTestId('add-to-group-select'))
    await user.click(await screen.findByRole('option', { name: 'Catarchy Rescue' }))

    expect(await screen.findByRole('status')).toHaveTextContent('1 selected pet')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(mockAddGroupPets).toHaveBeenCalledWith(7, [2])
    })
  })

  it('allows creating an empty Group from selection mode', () => {
    renderWithRouter(
      <PetSelectionToolbar
        selectedCount={0}
        onExitSelection={vi.fn()}
        selectedPetIds={[]}
        adminGroups={[]}
      />
    )

    expect(screen.getByTestId('create-group-from-selection')).toBeEnabled()
    expect(screen.getByTestId('create-group-from-selection')).toHaveAccessibleName('Create group')
  })

  it('shows add-to-group only when the user administers a group', () => {
    renderWithRouter(
      <PetSelectionToolbar
        selectedCount={0}
        onExitSelection={vi.fn()}
        selectedPetIds={[]}
        adminGroups={[]}
      />
    )

    expect(screen.queryByTestId('add-to-group-from-selection')).not.toBeInTheDocument()
  })

  it('disables add-to-group without a selection and exits with the close action', async () => {
    const user = userEvent.setup()
    const onExitSelection = vi.fn()

    renderWithRouter(
      <PetSelectionToolbar
        selectedCount={0}
        onExitSelection={onExitSelection}
        selectedPetIds={[]}
        adminGroups={[
          {
            id: 7,
            name: 'Catarchy Rescue',
            viewer_role: 'admin',
            member_count: 1,
            pet_count: 0,
          },
        ]}
      />
    )

    expect(screen.getByTestId('add-to-group-from-selection')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onExitSelection).toHaveBeenCalledOnce()
  })
})
