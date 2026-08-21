import { screen } from '@testing-library/react'
import { renderWithRouter } from '@/testing'
import { describe, it, expect, vi } from 'vite-plus/test'
import { RespondCta, type RespondCtaVariant } from './RespondCta'

const renderCta = (
  variant: RespondCtaVariant,
  overrides: Partial<React.ComponentProps<typeof RespondCta>> = {}
) => {
  const onQuickRespond = vi.fn()
  const onCreateHelperProfile = vi.fn()

  renderWithRouter(
    <RespondCta
      variant={variant}
      petName="Minnie"
      requestType="permanent"
      signInHref="/login?redirect=%2Frequests%2F1%3Fresume%3Drespond"
      onQuickRespond={onQuickRespond}
      onCreateHelperProfile={onCreateHelperProfile}
      {...overrides}
    />
  )

  return { onQuickRespond, onCreateHelperProfile }
}

describe('RespondCta', () => {
  it('names the pet rather than the missing record', () => {
    renderCta('quick')

    // The whole point of the rewrite: a stranger reads about the animal, not
    // about a helper profile they have never heard of.
    expect(screen.getAllByText(/Minnie/).length).toBeGreaterThan(0)
    expect(screen.getByText(/can you give Minnie a home/i)).toBeInTheDocument()
    expect(screen.queryByText(/no helper profile found/i)).not.toBeInTheDocument()
  })

  it('offers adoption wording for a permanent request', () => {
    const { onQuickRespond } = renderCta('quick', { requestType: 'permanent' })

    const button = screen.getByRole('button', { name: /adopt minnie now/i })
    button.click()
    expect(onQuickRespond).toHaveBeenCalledOnce()
  })

  it('offers fostering wording for a free foster request', () => {
    renderCta('quick', { requestType: 'foster_free' })

    expect(screen.getByRole('button', { name: /foster minnie now/i })).toBeInTheDocument()
  })

  it('gives an anonymous visitor a real call to action', () => {
    // Regression: a logged-out visitor used to get no response section at all,
    // which made a shared link a dead end.
    const { onQuickRespond } = renderCta('guestQuick')

    screen.getByRole('button', { name: /adopt minnie now/i }).click()
    expect(onQuickRespond).toHaveBeenCalledOnce()

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login?redirect=%2Frequests%2F1%3Fresume%3Drespond'
    )
  })

  it('still asks for a full profile on a paid request', () => {
    const { onCreateHelperProfile } = renderCta('profileRequired', { requestType: 'foster_paid' })

    screen.getByRole('button', { name: /create helper profile/i }).click()
    expect(onCreateHelperProfile).toHaveBeenCalledOnce()
  })

  it('explains the verification step instead of offering a button that would fail', () => {
    renderCta('unverified', { email: 'someone@example.com' })

    expect(screen.getByText(/confirm your email/i)).toBeInTheDocument()
    expect(screen.getByText(/someone@example.com/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /adopt/i })).not.toBeInTheDocument()
  })
})
