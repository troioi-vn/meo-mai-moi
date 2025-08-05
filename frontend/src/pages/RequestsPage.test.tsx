import { renderWithRouter, screen, userEvent, waitFor } from '@/test-utils'
import { describe, it, expect } from 'vitest'
import RequestsPage from '@/pages/RequestsPage'

describe('RequestsPage', () => {
  it('renders the page title', () => {
    renderWithRouter(<RequestsPage />)
    expect(screen.getByRole('heading', { name: /placement requests/i })).toBeInTheDocument()
  })

  it('renders the filter controls', () => {
    renderWithRouter(<RequestsPage />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText(/start date/i)).toBeInTheDocument()
    expect(screen.getByText(/end date/i)).toBeInTheDocument()
  })

  it('renders a cat card', () => {
    renderWithRouter(<RequestsPage />)
    expect(screen.getByText(/fluffy/i)).toBeInTheDocument()
  })

  // it('filters cats by type', async () => {
  //   const user = userEvent.setup()
  //   renderWithRouter(<RequestsPage />)

  //   // Initially, the cat is visible
  //   expect(screen.getByText(/fluffy/i)).toBeInTheDocument()

  //   // Select the "Foster" filter, which should hide the cat
  //   await user.click(screen.getByRole('combobox'))
  //   await user.click(screen.getByText(/foster/i))

  //   // The cat should be hidden as it does not have a foster request
  //   await waitFor(() => {
  //       expect(screen.queryByText(/fluffy/i)).not.toBeInTheDocument()
  //   })

  //   // Select the "Adoption" filter, which should show the cat
  //   await user.click(screen.getByRole('combobox'))
  //   await user.click(screen.getByText(/adoption/i))
    
  //   await waitFor(() => {
  //       expect(screen.getByText(/fluffy/i)).toBeInTheDocument()
  //   })
  // })
})