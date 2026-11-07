import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { render, screen, userEvent, waitFor } from '@/testing'
import { MedicalRecordsSection } from './MedicalRecordsSection'

const hook = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
  items: [] as Record<string, unknown>[],
}))
const toastError = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useMedicalRecords', () => ({
  useMedicalRecords: () => ({ ...hook, loading: false, error: null, remove: vi.fn() }),
}))
vi.mock('@/hooks/use-offline-operation-markers', () => ({
  useOfflineRecordMarker: () => null,
}))
vi.mock('@/lib/i18n-toast', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: toastError,
    raw: { error: vi.fn() },
  },
}))

const image = (name: string) => new File(['x'], name, { type: 'image/png' })
const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!
const removeButtons = () => screen.queryAllByRole('button', { name: 'Remove selected photo' })

describe('medical record photos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hook.items = []
    hook.create.mockResolvedValue({ id: 7 })
    hook.update.mockResolvedValue({ id: 7 })
    hook.uploadPhoto.mockResolvedValue({ id: 7 })
    let previewCount = 0
    URL.createObjectURL = vi.fn(() => `blob:preview-${String(++previewCount)}`)
    URL.revokeObjectURL = vi.fn()
  })

  const openAddForm = async (user: ReturnType<typeof userEvent.setup>) => {
    render(<MedicalRecordsSection petId={1} canEdit />)
    await user.click(screen.getByRole('button', { name: 'Add Medical Record' }))
  }

  it('uploads every photo picked across separate selections, in order', async () => {
    const user = userEvent.setup()
    await openAddForm(user)

    await user.upload(fileInput(), [image('a.png'), image('b.png')])
    expect(removeButtons()).toHaveLength(2)

    // The attach button has to survive a selection, or a second pick is impossible.
    expect(screen.getByRole('button', { name: 'Attach photo' })).toBeInTheDocument()
    await user.upload(fileInput(), image('c.png'))
    expect(removeButtons()).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(hook.uploadPhoto).toHaveBeenCalledTimes(3)
    })
    expect(hook.uploadPhoto.mock.calls.map(([id, file]) => [id, (file as File).name])).toEqual([
      [7, 'a.png'],
      [7, 'b.png'],
      [7, 'c.png'],
    ])
  })

  it('removes only the chosen photo from the selection', async () => {
    const user = userEvent.setup()
    await openAddForm(user)
    await user.upload(fileInput(), [image('a.png'), image('b.png'), image('c.png')])

    await user.click(removeButtons()[1]!)
    expect(removeButtons()).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(hook.uploadPhoto).toHaveBeenCalledTimes(2)
    })
    expect(hook.uploadPhoto.mock.calls.map(([, file]) => (file as File).name)).toEqual([
      'a.png',
      'c.png',
    ])
  })

  it('ignores a file that is already selected', async () => {
    const user = userEvent.setup()
    await openAddForm(user)
    const photo = image('a.png')
    await user.upload(fileInput(), [photo, image('b.png')])

    await user.upload(fileInput(), photo)
    expect(removeButtons()).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(hook.uploadPhoto).toHaveBeenCalledTimes(2)
    })
  })

  it('drops a deleted photo from the open carousel', async () => {
    const user = userEvent.setup()
    const photo = (id: number) => ({ id, url: `/${String(id)}.png`, thumb_url: null })
    const record = { id: 7, record_type: 'X-Ray', description: 'Chest', record_date: '2020-01-01' }
    hook.items = [{ ...record, photos: [photo(1), photo(2), photo(3)] }]
    const { rerender } = render(<MedicalRecordsSection petId={1} canEdit />)

    await user.click(screen.getAllByRole('button', { name: 'Medical record attachment' })[0]!)
    expect(await screen.findByText('Photo 1 of 3')).toBeInTheDocument()

    hook.items = [{ ...record, photos: [photo(2), photo(3)] }]
    rerender(<MedicalRecordsSection petId={1} canEdit />)

    expect(await screen.findByText('Photo 1 of 2')).toBeInTheDocument()
  })

  it('keeps uploading after one photo fails and reports the failure once', async () => {
    const user = userEvent.setup()
    hook.uploadPhoto.mockRejectedValueOnce(new Error('boom'))
    await openAddForm(user)
    await user.upload(fileInput(), [image('a.png'), image('b.png')])

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(hook.uploadPhoto).toHaveBeenCalledTimes(2)
    })
    expect(toastError).toHaveBeenCalledTimes(1)
    expect(toastError).toHaveBeenCalledWith('pets:medical.uploadError')
  })

  it('does not send the picked files with the record update', async () => {
    const user = userEvent.setup()
    hook.items = [{ id: 7, record_type: 'X-Ray', description: 'Chest', record_date: '2020-01-01' }]
    render(<MedicalRecordsSection petId={1} canEdit />)
    await user.click(screen.getByRole('button', { name: 'Edit medical record' }))
    await user.upload(fileInput(), [image('a.png'), image('b.png')])

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(hook.uploadPhoto).toHaveBeenCalledTimes(2)
    })
    expect(hook.update.mock.calls[0]?.[1]).not.toHaveProperty('photos')
  })
})
