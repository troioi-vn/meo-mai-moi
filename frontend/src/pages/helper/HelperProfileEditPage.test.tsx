
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HelperProfileEditPage from './HelperProfileEditPage';
import { mockHelperProfile } from '@/mocks/data/helper-profiles';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/helper-profiles/${mockHelperProfile.id}/edit`]}>
        <Routes>
          <Route path="/helper-profiles/:id/edit" element={<HelperProfileEditPage />} />
          <Route path="/helper" element={<div>Helper Profiles Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('HelperProfileEditPage', () => {
  beforeEach(() => {
    queryClient.clear();
    server.use(
      http.get(`http://localhost:3000/api/helper-profiles/${mockHelperProfile.id}`, () => {
        return HttpResponse.json({ data: mockHelperProfile });
      })
    );
  });

  it('renders the form with initial data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/country/i)).toHaveValue(mockHelperProfile.country);
      expect(screen.getByLabelText(/address/i)).toHaveValue(mockHelperProfile.address);
      expect(screen.getByLabelText(/city/i)).toHaveValue(mockHelperProfile.city);
      expect(screen.getByLabelText(/state/i)).toHaveValue(mockHelperProfile.state);
      expect(screen.getByLabelText(/phone number/i)).toHaveValue(mockHelperProfile.phone_number);
      expect(screen.getByLabelText(/experience/i)).toHaveValue(mockHelperProfile.experience);
      expect(screen.getByLabelText(/has pets/i)).toBeChecked();
      expect(screen.getByLabelText(/has children/i)).not.toBeChecked();
      expect(screen.getByLabelText(/can foster/i)).toBeChecked();
      expect(screen.getByLabelText(/can adopt/i)).not.toBeChecked();
      expect(screen.getByLabelText(/is public/i)).toBeChecked();
    });
  });

  it('shows loading state', () => {
    server.use(
      http.get(`http://localhost:3000/api/helper-profiles/${mockHelperProfile.id}`, () => {
        return new Promise(() => {}); // Never resolve to keep it in loading state
      })
    );
    renderComponent();
    expect(screen.getByText(/loading.../i)).toBeInTheDocument();
  });

  it('shows error state', async () => {
    server.use(
      http.get(`http://localhost:3000/api/helper-profiles/${mockHelperProfile.id}`, () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/error fetching helper profile/i)).toBeInTheDocument();
    });
  });

  it('updates a field and submits the form', async () => {
    server.use(
      http.put(`http://localhost:3000/api/helper-profiles/${mockHelperProfile.id}`, async ({ request }) => {
        return HttpResponse.json({ data: {} });
      })
    );
    renderComponent();

    await screen.findByLabelText(/city/i);

    const cityInput = screen.getByLabelText(/city/i);
    fireEvent.change(cityInput, { target: { value: 'New City' } });

    const submitButton = screen.getByRole('button', { name: /update/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Helper profile updated successfully!');
    });
  });

  it('deletes a photo', async () => {
    server.use(
      http.delete(`http://localhost:3000/api/helper-profiles/${mockHelperProfile.id}/photos/${mockHelperProfile.photos[0].id}`, () => {
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderComponent();

    await screen.findByAltText(/helper profile photo/i);

    const deleteButton = screen.getByLabelText(`Delete photo ${mockHelperProfile.photos[0].id}`);
    fireEvent.click(deleteButton);

    await waitFor(() => {
        expect(queryClient.isFetching({ queryKey: ['helper-profile', String(mockHelperProfile.id)] })).toBe(1);
    });
  });

  it('deletes the profile', async () => {
    server.use(
      http.delete(`http://localhost:3000/api/helper-profiles/${mockHelperProfile.id}`, () => {
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderComponent();

    await screen.findByRole('button', { name: /delete/i });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await screen.findByText(/are you sure?/i);
    
    const confirmDeleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Helper profile deleted successfully!');
    });
  });
});
