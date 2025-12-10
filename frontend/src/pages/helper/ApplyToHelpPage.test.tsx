import { renderWithRouter } from '@/testing'
import { screen, waitFor } from '@testing-library/react'

import ApplyToHelpPage from './ApplyToHelpPage'

describe('ApplyToHelpPage', () => {
  it('renders the main heading', async () => {
    renderWithRouter(<ApplyToHelpPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /apply to help page/i })).toBeInTheDocument()
    })
  })
})
