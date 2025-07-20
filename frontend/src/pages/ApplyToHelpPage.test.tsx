import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithRouter } from '@/test-utils'

import ApplyToHelpPage from './ApplyToHelpPage'

describe('ApplyToHelpPage', () => {
  it('renders the main heading', () => {
    renderWithRouter(<ApplyToHelpPage />)
    expect(screen.getByRole('heading', { name: /apply to help page/i })).toBeInTheDocument()
  })
})
