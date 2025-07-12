import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TestAuthProvider } from '@/contexts/TestAuthProvider';
import MainPage from '../pages/MainPage';

vi.mock('@/components/Header', () => ({ Header: () => <header>Header</header> }));
vi.mock('@/components/HeroSection', () => ({ HeroSection: () => <section>Hero Section</section> }));
vi.mock('@/components/CatsSection', () => ({ CatsSection: () => <section>Cats Section</section> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer>Footer</footer> }));

const renderWithProviders = (ui, { providerProps, ...renderOptions }) => {
  return render(
    <TestAuthProvider {...providerProps}>
      <MemoryRouter>{ui}</MemoryRouter>
    </TestAuthProvider>,
    renderOptions
  );
};

describe('MainPage', () => {
  it('renders all the main sections', () => {
    renderWithProviders(<MainPage />, {});
    expect(screen.getByRole('banner')).toHaveTextContent('Header');
    expect(screen.getByText('Hero Section')).toBeInTheDocument();
    expect(screen.getByText('Cats Section')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Footer');
  });
});
