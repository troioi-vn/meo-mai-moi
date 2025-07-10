import { render, screen } from '@testing-library/react';
import HeroSection from './HeroSection';

describe('HeroSection', () => {
  it('renders the hero section with correct text', () => {
    render(<HeroSection />);
    expect(screen.getByText(/Find Your Feline Friend Today!/i)).toBeInTheDocument();
    expect(screen.getByText(/Connecting cats in need with loving homes./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Browse Available Cats/i })).toBeInTheDocument();
  });
});