import { describe, expect, it, vi } from 'vite-plus/test'
import { render, screen, userEvent } from '@/testing'
import { MedicalRecordsSection } from './MedicalRecordsSection'

vi.mock('@/hooks/useMedicalRecords', () => ({
  useMedicalRecords: () => ({
    items: Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      record_type: 'Checkup',
      description: `Complete record ${index + 1}`,
      record_date: new Date(Date.now() - index * 86400000).toISOString().slice(0, 10),
    })),
    loading: false,
    error: null,
  }),
}))
vi.mock('@/hooks/use-offline-operation-markers', () => ({
  useOfflineRecordMarker: () => null,
}))

describe('medical history preview', () => {
  it('shows complete recent records and lets read-only carers expand the history', async () => {
    const user = userEvent.setup()
    render(<MedicalRecordsSection petId={1} canEdit={false} />)
    expect(screen.getByText('Complete record 3')).toBeInTheDocument()
    expect(screen.queryByText('Complete record 4')).not.toBeInTheDocument()
    const expand = screen.getByRole('button', { name: 'View all 4 records' })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    await user.click(expand)
    expect(screen.getByText('Complete record 4')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show recent records' }))
    expect(screen.queryByText('Complete record 4')).not.toBeInTheDocument()
  })
})
