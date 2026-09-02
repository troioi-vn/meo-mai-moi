import { renderWithRouter } from '@/testing'
import { describe, it, expect, vi } from 'vite-plus/test'
import { AltchaWidget } from './AltchaWidget'

/**
 * These assert the wiring, not the proof-of-work.
 *
 * The widget shipped once with `challengeurl`, the v1/v2 attribute name that
 * the Laravel package's README still documents. Altcha v3 ignores it in
 * silence: the widget ends up with no endpoint, fetches a page instead of a
 * challenge, and reports "invalid content-type ... received text/html" - which
 * reads like a broken backend route. Nothing in the suite touched the element's
 * attributes, so nothing caught it.
 */
describe('AltchaWidget', () => {
  const render = () => renderWithRouter(<AltchaWidget onVerified={vi.fn()} onReset={vi.fn()} />)

  it('points the widget at the challenge endpoint', () => {
    const { container } = render()
    const widget = container.querySelector('altcha-widget')

    expect(widget).not.toBeNull()
    // The element is a defined custom element by the time React renders it, so
    // React assigns the *property* rather than an attribute. That property is
    // what Altcha reads, so it is what has to be asserted - reading back
    // getAttribute('challenge') returns null even when the wiring is correct.
    expect(customElements.get('altcha-widget')).toBeDefined()
    expect((widget as unknown as { challenge?: string }).challenge).toBe('/altcha-challenge')
  })

  it('leaves no v1/v2 attribute behind for the widget to ignore', () => {
    const { container } = render()
    const widget = container.querySelector('altcha-widget')

    // `challengeurl` is not a property on the v3 element, so React would set it
    // as an attribute and the widget would ignore it in silence. Present-but-
    // ignored is the whole failure mode.
    expect(widget?.hasAttribute('challengeurl')).toBe(false)
  })

  it('reserves room beneath the widget so its error box clears the form', () => {
    const { container } = render()

    expect(container.querySelector('.altcha-host')).not.toBeNull()
  })
})
