import { render, screen } from '@testing-library/react';
import ApplyToHelpPage from './ApplyToHelpPage';

describe('ApplyToHelpPage', () => {
  it('renders the Apply to Help form', () => {
    render(<ApplyToHelpPage />);
    expect(screen.getByText(/Apply to Become a Helper/i)).toBeInTheDocument();
  });
});