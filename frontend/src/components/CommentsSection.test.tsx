import { render, screen } from '@testing-library/react';
import CommentsSection from './CommentsSection';

describe('CommentsSection', () => {
  it('renders the comments section', () => {
    render(<CommentsSection comments={[]} />);
    expect(screen.getByText(/Comments/i)).toBeInTheDocument();
  });
});