import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageLoadingSpinner } from './page-loading-spinner'

describe('PageLoadingSpinner', () => {
  it('uses the static loading brand image for full-page route loading', () => {
    render(<PageLoadingSpinner />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading...')
    expect(screen.getByRole('presentation')).toHaveAttribute('src', '/loading.svg')
  })
})
