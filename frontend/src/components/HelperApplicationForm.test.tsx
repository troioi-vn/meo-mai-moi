import { render, screen } from '@testing-library/react';
import HelperApplicationForm from './HelperApplicationForm';

describe('HelperApplicationForm', () => {
  it('renders the helper application form', () => {
    render(<HelperApplicationForm />);
    expect(screen.getByLabelText(/Full Name:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Address:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Relevant Experience/i)).toBeInTheDocument();
  });
});