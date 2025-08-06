import { render, screen, waitFor, userEvent } from '@/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { mockHelperProfile } from '@/mocks/data/helper-profiles';
import { mockUser } from '@/mocks/data/user';
import HelperProfileEditPage from './HelperProfileEditPage';

vi.mock('sonner');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1' }),
  };
});

describe('HelperProfileEditPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    server.resetHandlers();
    server.use(
      http.get('http://localhost:3000/api/helper-profiles/1', () => {
        return HttpResponse.json({ data: { ...mockHelperProfile, photos: [{ id: 1, path: 'photo.jpg' }] } });
      }),
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json(mockUser);
      })
    );
  });

  const renderComponent = () => {
    return render(<HelperProfileEditPage />, {
      initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
    });
  };

  it('displays existing photos with delete buttons', async () => {
    renderComponent();
    expect(await screen.findByAltText('Helper profile photo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete photo 1/i })).toBeInTheDocument();
  });

  it('calls the delete mutation when a photo delete button is clicked', async () => {
    const deleteSpy = vi.fn();
    server.use(
      http.delete('http://localhost:3000/api/helper-profiles/1/photos/1', () => {
        deleteSpy();
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderComponent();

    const deleteButton = await screen.findByRole('button', { name: /delete photo 1/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledTimes(1);
    });
  });
});
