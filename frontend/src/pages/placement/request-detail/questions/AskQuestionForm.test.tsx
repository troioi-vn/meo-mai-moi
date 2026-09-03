import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithRouter } from '@/testing'
import { describe, expect, it, vi } from 'vite-plus/test'
import { AskQuestionForm } from './AskQuestionForm'

const renderForm = (requiresAltcha: boolean) =>
  renderWithRouter(
    <AskQuestionForm
      submitting={false}
      requiresAltcha={requiresAltcha}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />
  )

describe('AskQuestionForm', () => {
  it('does not show or require Altcha for a signed-in user', async () => {
    const user = userEvent.setup()
    const { container } = renderForm(false)

    expect(container.querySelector('altcha-widget')).toBeNull()

    await user.type(screen.getByLabelText('Your name'), 'Linh')
    await user.type(screen.getByLabelText('Your question'), 'Is she friendly?')

    expect(screen.getByRole('button', { name: 'Send question' })).toBeEnabled()
  })

  it('keeps Altcha mandatory for a guest', async () => {
    const user = userEvent.setup()
    const { container } = renderForm(true)

    expect(container.querySelector('altcha-widget')).not.toBeNull()

    await user.type(screen.getByLabelText('Your name'), 'Linh')
    await user.type(screen.getByLabelText('Your question'), 'Is she friendly?')

    expect(screen.getByRole('button', { name: 'Send question' })).toBeDisabled()
  })
})
