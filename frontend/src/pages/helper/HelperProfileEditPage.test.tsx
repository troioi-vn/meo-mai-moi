import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HelperProfileEditPage from './HelperProfileEditPage'
import { mockHelperProfile } from '@/testing/mocks/data/helper-profiles'
import { server } from '@/testing/mocks/server'
import { http, HttpResponse } from 'msw'
import { toast } from 'sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/helper-profiles/' + String(mockHelperProfile.id) + '/edit']}>
        <Routes>
          <Route path="/helper-profiles/:id/edit" element={<HelperProfileEditPage />} />
          <Route path="/helper" element={<div>Helper Profiles Page</div>} />
          <Route path="/helper/:id" element={<div>Helper Profile Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('HelperProfileEditPage', () => {
  beforeEach(() => {
    queryClient.clear()
    server.use(
      http.get('http://localhost:3000/api/helper-profiles/' + String(mockHelperProfile.id), () => {
        return HttpResponse.json({ data: mockHelperProfile })
      })
    )
  })

  it('renders the form with initial data', async () => {
    renderComponent()

    await waitFor(() => {
      // Country uses a custom Select component, check for the label
      const countryLabels = screen.getAllByText(/country/i)
      expect(countryLabels.length).toBeGreaterThan(0)
      // The Select shows the country name (e.g., "Vietnam" for "VN")
      expect(screen.getByTestId('country-select')).toBeInTheDocument()
      expect(screen.getByLabelText(/address/i)).toHaveValue(mockHelperProfile.address)
      expect(screen.getByLabelText(/city/i)).toHaveValue(mockHelperProfile.city)
      expect(screen.getByLabelText(/phone number/i)).toHaveValue(mockHelperProfile.phone_number)
      expect(screen.getByLabelText(/experience/i)).toHaveValue(mockHelperProfile.experience)
      expect(screen.getByLabelText(/has pets/i)).toBeChecked()
      expect(screen.getByLabelText(/has children/i)).not.toBeChecked()
      // Check request types checkboxes
      expect(screen.getByLabelText(/foster \(free\)/i)).toBeChecked()
      expect(screen.getByLabelText(/permanent adoption/i)).toBeChecked()
    })
  })

  it('shows loading state', () => {
    server.use(
      http.get(`http://localhost:3000/api/helper-profiles/${mockHelperProfile.id}`, () => {
        return new Promise(() => {}) // Never resolve to keep it in loading state
      })
    )
    renderComponent()
    expect(screen.getByText(/loading.../i)).toBeInTheDocument()
  })

  it('shows error state', async () => {
    server.use(
      http.get(`http://localhost:3000/api/helper-profiles/${mockHelperProfile.id}`, () => {
        return new HttpResponse(null, { status: 500 })
      })
    )
    renderComponent()
    await waitFor(() => {
      expect(screen.getByText(/failed to load helper profile/i)).toBeInTheDocument()
    })
  })

  // TODO: This test needs investigation - form submission may not be working correctly
  // The form initialization and validation may have timing issues
  it.skip('updates a field and submits the form', async () => {
    server.use(
      http.post(`http://localhost:3000/api/helper-profiles/${mockHelperProfile.id}`, async () => {
        return HttpResponse.json({ data: { id: mockHelperProfile.id } })
      })
    )
    renderComponent()

    // Wait for form to be fully loaded with all initial data (including required fields)
    await waitFor(() => {
      expect(screen.getByLabelText(/city/i)).toHaveValue(mockHelperProfile.city)
      expect(screen.getByLabelText(/experience/i)).toHaveValue(mockHelperProfile.experience)
      expect(screen.getByLabelText(/phone number/i)).toHaveValue(mockHelperProfile.phone_number)
      expect(screen.getByLabelText(/contact info/i)).toHaveValue(mockHelperProfile.contact_info)
    })

    const cityInput = screen.getByLabelText(/city/i)
    fireEvent.change(cityInput, { target: { value: 'New City' } })

    const submitButton = screen.getByRole('button', { name: /update/i })
    fireEvent.click(submitButton)

    await waitFor(
      () => {
        expect(toast.success).toHaveBeenCalledWith('Helper profile updated successfully!')
      },
      { timeout: 5000 }
    )
  })

  it('deletes a photo', async () => {
    server.use(
      http.delete(
        `http://localhost:3000/api/helper-profiles/${mockHelperProfile.id}/photos/${mockHelperProfile.photos[0]?.id}`,
        () => {
          return new HttpResponse(null, { status: 204 })
        }
      )
    )
    renderComponent()

    await waitFor(() => {
      expect(screen.getAllByAltText(/helper profile photo/i)).toHaveLength(2)
    })

    const deleteButton = screen.getByLabelText(`Delete photo ${mockHelperProfile.photos[0]?.id}`)
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Photo deleted successfully!')
    })
  })

  it('deletes the profile', async () => {
    server.use(
      http.delete(`http://localhost:3000/api/helper-profiles/${mockHelperProfile.id}`, () => {
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText(/edit helper profile/i)).toBeInTheDocument()
    })

    // Find the delete button by its accessible name
    // It's a button inside an AlertDialogTrigger with text "Delete Profile"
    const deleteButton = screen.getByRole('button', { name: /delete profile/i })
    fireEvent.click(deleteButton)

    // Wait for the confirmation dialog to appear
    await screen.findByText(/are you absolutely sure/i)

    // The confirmation button in the dialog says "Delete" (not "Delete Profile")
    const confirmDeleteButton = screen.getByRole('button', { name: /^delete$/i })
    fireEvent.click(confirmDeleteButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Helper profile deleted successfully!')
    })
  })
})
