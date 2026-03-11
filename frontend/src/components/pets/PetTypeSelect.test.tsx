import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter, userEvent } from '@/testing'
import { PetTypeSelect } from './PetTypeSelect'
import type { PetType } from '@/types/pet'

const petTypes: PetType[] = [
  {
    id: 1,
    name: 'Cat',
    slug: 'cat',
    description: 'Feline',
    is_active: true,
    is_system: true,
    display_order: 1,
    placement_requests_allowed: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Dog',
    slug: 'dog',
    description: 'Canine',
    is_active: true,
    is_system: true,
    display_order: 2,
    placement_requests_allowed: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

describe('PetTypeSelect', () => {
  it('filters pet types by name without showing the empty state for partial matches', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    renderWithRouter(
      <PetTypeSelect petTypes={petTypes} loading={false} value="" onChange={onChange} />
    )

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByPlaceholderText('Search pet types...'), 'ca')

    await waitFor(() => {
      expect(screen.getByText('Cat')).toBeInTheDocument()
    })

    expect(screen.queryByText('No pet types found.')).not.toBeInTheDocument()
  })
})
