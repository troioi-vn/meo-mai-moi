import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import { initializeGooglePlayTwaContext } from '@/lib/google-play-twa'
import { Footer } from './Footer'

describe('Footer', () => {
  it('shows Patreon on the normal website', () => {
    render(<Footer />)

    expect(screen.getByRole('link', { name: /patreon/i })).toHaveAttribute(
      'href',
      'https://www.patreon.com/catarchy'
    )
  })

  it('hides Patreon in the Google Play TWA', () => {
    window.history.replaceState({}, '', '/?app_context=google_play_twa')
    initializeGooglePlayTwaContext()

    render(<Footer />)

    expect(screen.queryByRole('link', { name: /patreon/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument()
  })
})
