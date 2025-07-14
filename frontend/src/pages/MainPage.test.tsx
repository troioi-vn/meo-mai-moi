import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TestAuthProvider } from '@/contexts/TestAuthProvider'
import MainPage from '../pages/MainPage'

vi.mock('@/components/MainNav', () => ({ default: () => <header>Main Navigation</header> }))
vi.mock('@/components/HeroSection', () => ({ HeroSection: () => <section>Hero Section</section> }))
vi.mock('@/components/CatsSection', () => ({ CatsSection: () => <section>Cats Section</section> }))
vi.mock('@/components/Footer', () => ({ Footer: () => <footer>Footer</footer> }))

const renderWithProviders = (
  ui: React.ReactElement,
  { providerProps, ...renderOptions }: { providerProps?: any; [key: string]: any }
) => {
  return render(
    <TestAuthProvider {...providerProps}>
      <MemoryRouter>{ui}</MemoryRouter>
    </TestAuthProvider>,
    renderOptions
  )
}

describe('MainPage', () => {
  it('renders all the main sections', () => {
    renderWithProviders(<MainPage />, { providerProps: {} })
    expect(screen.getByRole('banner')).toHaveTextContent('Main Navigation')
    expect(screen.getByText('Hero Section')).toBeInTheDocument()
    expect(screen.getByText('Cats Section')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Footer')
  })
})
