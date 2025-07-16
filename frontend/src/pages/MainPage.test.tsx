import { render, screen } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TestAuthProvider } from '@/contexts/TestAuthProvider'
import MainPage from '../pages/MainPage'
import type { AuthContextType } from '@/contexts/auth-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Mock a simplified version of the dropdown for testing purposes
const DropdownMenuTest = () => (
  <DropdownMenu>
    <DropdownMenuTrigger>Open</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>Profile</DropdownMenuItem>
      <DropdownMenuItem>Logout</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

vi.mock('@/components/MainNav', () => ({
  default: DropdownMenuTest,
}))
vi.mock('@/components/HeroSection', () => ({ HeroSection: () => <section>Hero Section</section> }))
vi.mock('@/components/CatsSection', () => ({ CatsSection: () => <section>Cats Section</section> }))
vi.mock('@/components/Footer', () => ({ Footer: () => <footer>Footer</footer> }))

const renderWithProviders = (
  ui: React.ReactElement,
  {
    providerProps,
    ...renderOptions
  }: { providerProps?: Partial<AuthContextType> } & RenderOptions = {}
) => {
  return render(
    <TestAuthProvider mockValues={providerProps}>
      <MemoryRouter>{ui}</MemoryRouter>
    </TestAuthProvider>,
    renderOptions
  )
}

describe('MainPage', () => {
  it('renders all the main sections', () => {
    renderWithProviders(<MainPage />, { providerProps: {} })
    expect(screen.getByText('Hero Section')).toBeInTheDocument()
    expect(screen.getByText('Cats Section')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
