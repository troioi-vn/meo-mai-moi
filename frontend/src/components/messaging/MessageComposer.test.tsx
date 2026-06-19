import { fireEvent, render, screen, waitFor } from '@/testing'
import { describe, expect, it, vi } from 'vite-plus/test'
import { MessageComposer } from './MessageComposer'

const imageFile = new File(['image'], 'screenshot.png', { type: 'image/png' })

const clipboardData = (file: File) => ({
  items: [
    {
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    },
  ],
})

describe('MessageComposer', () => {
  it('sends a pasted image through the image handler', async () => {
    const onSend = vi.fn()
    const onSendImage = vi.fn().mockResolvedValue(undefined)

    render(<MessageComposer onSend={onSend} onSendImage={onSendImage} />)

    fireEvent.paste(screen.getByPlaceholderText('Type a message...'), {
      clipboardData: clipboardData(imageFile),
    })

    await waitFor(() => {
      expect(onSendImage).toHaveBeenCalledWith(imageFile)
    })
    expect(onSend).not.toHaveBeenCalled()
  })
})
