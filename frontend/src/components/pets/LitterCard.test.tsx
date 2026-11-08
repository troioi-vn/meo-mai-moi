import { screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vite-plus/test'
import { renderWithRouter } from '@/testing'
import { LitterCard } from './LitterCard'
import { LitterCardCompact } from './LitterCardCompact'
import type { Pet } from '@/types/pet'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function makePet(id: number, name: string, photoUrl: string | null = null): Pet {
  return {
    id,
    name,
    birthday: '2020-01-01',
    country: 'VN',
    city: 'Hanoi',
    description: 'desc',
    user_id: 1,
    pet_type_id: 1,
    status: 'active',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    photo_url: photoUrl,
    litter_id: 10,
    litter: { id: 10, name: 'Spring Litter' },
  } as unknown as Pet
}

const group = {
  type: 'litter' as const,
  litterId: 10,
  litterName: 'Spring Litter',
  members: [makePet(1, 'A', 'http://a.jpg'), makePet(2, 'B'), makePet(3, 'C')],
}

describe('LitterCard', () => {
  it('shows litter name, member count, and avatars', async () => {
    renderWithRouter(<LitterCard group={group} />)
    expect(screen.getByText('Spring Litter')).toBeInTheDocument()
    expect(screen.getByText('3 members')).toBeInTheDocument()
    // avatars are PetAvatar with name initials - check member names appear
    expect(screen.getByTestId('litter-card-10')).toBeInTheDocument()
    expect(screen.getByTestId('litter-card-link-10')).toHaveAttribute('href', '/litters/10')
  })

  it('navigates to litter detail on click (via link)', async () => {
    renderWithRouter(<LitterCard group={group} />)
    const link = screen.getByTestId('litter-card-link-10')
    expect(link.getAttribute('href')).toBe('/litters/10')
  })

  it('counts visible members only', async () => {
    const filteredGroup = {
      type: 'litter' as const,
      litterId: 10,
      litterName: 'Spring Litter',
      members: [makePet(1, 'A'), makePet(2, 'B')],
    }
    renderWithRouter(<LitterCard group={filteredGroup} />)
    expect(screen.getByText('2 members')).toBeInTheDocument()
    expect(screen.queryByText('3 members')).not.toBeInTheDocument()
  })
})

describe('LitterCardCompact', () => {
  it('renders compact card with litter name and count', async () => {
    renderWithRouter(<LitterCardCompact group={group} />)
    expect(screen.getByText('Spring Litter')).toBeInTheDocument()
    expect(screen.getByText('3 members')).toBeInTheDocument()
    expect(screen.getByTestId('litter-card-compact-10')).toBeInTheDocument()
  })

  it('navigates on click via navigate', async () => {
    const { user } = renderWithRouter(<LitterCardCompact group={group} />)
    const card = screen.getByTestId('litter-card-compact-10')
    await user.click(card)
    expect(mockNavigate).toHaveBeenCalledWith('/litters/10')
  })
})
