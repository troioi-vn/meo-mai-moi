import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter, userEvent } from '@/testing'
import { AddPetSplitButton, AddFirstPetSplitButton } from './AddPetSplitButton'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock AddLitterDialog to avoid loading pet types etc
vi.mock('./AddLitterDialog', () => ({
  AddLitterDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="litter-dialog">Litter Dialog</div> : null,
}))

describe('AddPetSplitButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps Add pet button navigating to /pets/create', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddPetSplitButton isOnline={true} />)

    await user.click(screen.getByTestId('add-pet-button'))
    expect(mockNavigate).toHaveBeenCalledWith('/pets/create')
  })

  it('dropdown offers the litter flow when online', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddPetSplitButton isOnline={true} />)

    await user.click(screen.getByTestId('add-pet-chevron'))

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-add-litter')).toBeInTheDocument()
    })
    expect(screen.getByTestId('dropdown-add-litter')).not.toHaveAttribute('data-disabled')
    expect(screen.getByTestId('dropdown-add-litter')).toHaveTextContent('Add a litter')
  })

  it('dropdown shows Add Pet and Add a litter options', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddPetSplitButton isOnline={true} />)

    await user.click(screen.getByTestId('add-pet-chevron'))

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-add-pet')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-add-litter')).toBeInTheDocument()
    })
  })

  it('disables litter option and explains why when offline', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddPetSplitButton isOnline={false} />)

    await user.click(screen.getByTestId('add-pet-chevron'))

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-add-litter')).toBeInTheDocument()
    })
    expect(screen.getByTestId('dropdown-add-litter')).toHaveAttribute('data-disabled')
    // explanation text visible inside item
    expect(screen.getByText('Litters are available online only')).toBeInTheDocument()
  })

  it('clicking litter option opens the dialog when online', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddPetSplitButton isOnline={true} />)

    await user.click(screen.getByTestId('add-pet-chevron'))
    await waitFor(() => expect(screen.getByTestId('dropdown-add-litter')).toBeInTheDocument())
    await user.click(screen.getByTestId('dropdown-add-litter'))

    await waitFor(() => {
      expect(screen.getByTestId('litter-dialog')).toBeInTheDocument()
    })
  })

  it('clicking main button still goes to create even when litter option exists', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddPetSplitButton isOnline={true} />)

    // Main button should be independent of dropdown
    await user.click(screen.getByTestId('add-pet-button'))
    expect(mockNavigate).toHaveBeenCalledWith('/pets/create')
    expect(screen.queryByTestId('litter-dialog')).not.toBeInTheDocument()
  })
})

describe('AddFirstPetSplitButton', () => {
  beforeEach(() => vi.clearAllMocks())

  it('dropdown offers litter flow on empty state', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddFirstPetSplitButton isOnline={true} />)

    await user.click(screen.getByTestId('add-first-pet-chevron'))

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-add-first-litter')).toBeInTheDocument()
    })
    expect(screen.getByTestId('dropdown-add-first-litter')).toHaveTextContent('Add a litter')
  })

  it('disables litter option when offline on empty state', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddFirstPetSplitButton isOnline={false} />)

    await user.click(screen.getByTestId('add-first-pet-chevron'))

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-add-first-litter')).toBeInTheDocument()
    })
    expect(screen.getByTestId('dropdown-add-first-litter')).toHaveAttribute('data-disabled')
    expect(screen.getByText('Litters are available online only')).toBeInTheDocument()
  })

  it('main add-first-pet button navigates to create', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddFirstPetSplitButton isOnline={true} />)

    await user.click(screen.getByTestId('add-first-pet-button'))
    expect(mockNavigate).toHaveBeenCalledWith('/pets/create')
  })
})
