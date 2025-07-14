import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'
import CreateCatPage from './CreateCatPage'
import MyCatsPage from './MyCatsPage'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/account/cats/create']}>
      <AuthProvider>
        <Routes>
          <Route path="/account/cats/create" element={ui} />
          <Route path="/account/cats" element={<MyCatsPage />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('CreateCatPage', () => {
  it('renders the form fields', () => {
    renderWithProviders(<CreateCatPage />)
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Breed')).toBeInTheDocument()
    expect(screen.getByLabelText('Age')).toBeInTheDocument()
    expect(screen.getByLabelText('Location')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('submits the form and redirects on success', async () => {
    renderWithProviders(<CreateCatPage />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Cat' } })
    fireEvent.change(screen.getByLabelText('Breed'), { target: { value: 'New Breed' } })
    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'New Location' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New Description' } })

    fireEvent.click(screen.getByRole('button', { name: 'Create Cat' }))

    await waitFor(() => {
      expect(screen.getByText('Cat created successfully!')).toBeInTheDocument()
    })
  })
})
