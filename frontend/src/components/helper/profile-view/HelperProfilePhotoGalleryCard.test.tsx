import { describe, expect, it, vi } from 'vite-plus/test'
import { render, screen, userEvent, waitFor, within } from '@/testing'
import { HelperProfilePhotoGalleryCard } from './HelperProfilePhotoGalleryCard'
import type { HelperProfilePhoto } from '@/types/helper-profile'

const mockPhotos: HelperProfilePhoto[] = [
  {
    id: 1,
    url: 'http://example.com/photo1.jpg',
    thumb_url: 'http://example.com/thumb1.jpg',
    is_primary: true,
  },
  {
    id: 2,
    url: 'http://example.com/photo2.jpg',
    thumb_url: 'http://example.com/thumb2.jpg',
    is_primary: false,
  },
]

describe('HelperProfilePhotoGalleryCard', () => {
  it('opens the modal from a thumbnail', async () => {
    const user = userEvent.setup()

    render(<HelperProfilePhotoGalleryCard photos={mockPhotos} />)

    const thumbnails = screen.getAllByRole('button', { name: /helper profile photo/i })
    await user.click(thumbnails[0]!)

    await waitFor(() => {
      expect(screen.getByText('Photo 1 of 2')).toBeInTheDocument()
    })
  })

  it('shows delete action for manageable galleries and removes the deleted photo', async () => {
    const user = userEvent.setup()
    const onDeletePhoto = vi.fn().mockResolvedValue(undefined)

    render(
      <HelperProfilePhotoGalleryCard
        photos={mockPhotos}
        canManage
        onDeletePhoto={onDeletePhoto}
        deletingPhotoId={null}
      />
    )

    const thumbnails = screen.getAllByRole('button', { name: /helper profile photo/i })
    await user.click(thumbnails[1]!)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(screen.getByText('Delete photo?')).toBeInTheDocument()
    })

    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(onDeletePhoto).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
    })

    expect(screen.getByText('Photos (1)')).toBeInTheDocument()
  })

  it('shows set-main action for non-primary photos and calls the handler', async () => {
    const user = userEvent.setup()
    const onSetPrimaryPhoto = vi.fn().mockResolvedValue(undefined)

    render(
      <HelperProfilePhotoGalleryCard
        photos={mockPhotos}
        canManage
        onSetPrimaryPhoto={onSetPrimaryPhoto}
      />
    )

    const thumbnails = screen.getAllByRole('button', { name: /helper profile photo/i })
    await user.click(thumbnails[1]!)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /set as main photo/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /set as main photo/i }))

    await waitFor(() => {
      expect(onSetPrimaryPhoto).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
    })
  })
})
