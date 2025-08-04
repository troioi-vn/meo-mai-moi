import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HelperProfilePage from './HelperProfilePage';
import { mockHelperProfile } from '@/mocks/data/helper-profiles';

const queryClient = new QueryClient();

describe('HelperProfilePage', () => {
  it('renders a list of helper profiles', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HelperProfilePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('My Helper Profiles')).toBeInTheDocument();
    expect(await screen.findByText(mockHelperProfile.location)).toBeInTheDocument();
  });
});
