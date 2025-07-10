import { render, screen } from '@testing-library/react';
import CatProfilePage from './CatProfilePage';

describe('CatProfilePage', () => {
  it('renders the cat profile page', () => {
    render(<CatProfilePage />);
    expect(screen.getByText(/Cat Profile/i)).toBeInTheDocument();
  });
});