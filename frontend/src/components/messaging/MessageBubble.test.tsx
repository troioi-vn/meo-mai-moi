import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, within } from '@/testing'
import userEvent from '@testing-library/user-event'
import { MessageBubble } from './MessageBubble'
import { mockChatMessage } from '@/testing/mocks/data/messaging'

describe('MessageBubble image viewer', () => {
  it('opens image viewer when image is clicked and closes it', async () => {
    const user = userEvent.setup()
    const imageMessage = {
      ...mockChatMessage,
      type: 'image',
      content: 'https://example.com/cat.jpg',
    }

    render(
      <MessageBubble message={imageMessage} showAvatar={true} showTimestamp={true} isRead={false} />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open image' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('zooms in and out in image viewer', async () => {
    const user = userEvent.setup()
    const imageMessage = {
      ...mockChatMessage,
      type: 'image',
      content: 'https://example.com/cat.jpg',
    }

    render(
      <MessageBubble message={imageMessage} showAvatar={false} showTimestamp={false} isRead={false} />
    )

    await user.click(screen.getByRole('button', { name: 'Open image' }))

    const dialog = await screen.findByRole('dialog')
    const zoomInButton = within(dialog).getByRole('button', { name: 'Zoom in' })
    const zoomOutButton = within(dialog).getByRole('button', { name: 'Zoom out' })
    const modalImage = within(dialog).getByRole('img', { name: 'Image' })

    expect(modalImage).toHaveStyle({ transform: 'scale(1)' })

    await user.click(zoomInButton)
    expect(modalImage).toHaveStyle({ transform: 'scale(1.25)' })

    await user.click(zoomOutButton)
    expect(modalImage).toHaveStyle({ transform: 'scale(1)' })
  })
})
