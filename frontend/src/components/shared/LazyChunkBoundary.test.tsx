import { describe, expect, it, vi, beforeEach, afterEach } from 'vite-plus/test'
import { render, screen } from '@testing-library/react'
import { reportError } from '@/lib/error-reporter'
import { LazyChunkBoundary } from './LazyChunkBoundary'

vi.mock('@/lib/error-reporter', () => ({
  reportError: vi.fn(),
}))

function Boom(): React.ReactElement {
  throw new TypeError('Failed to fetch dynamically imported module: /build/assets/WeightChart.js')
}

describe('LazyChunkBoundary', () => {
  beforeEach(() => {
    vi.mocked(reportError).mockClear()
    // React logs the caught error; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders its children when nothing throws', () => {
    render(
      <LazyChunkBoundary fallback={<p>Chart unavailable</p>}>
        <p>Chart</p>
      </LazyChunkBoundary>
    )

    expect(screen.getByText('Chart')).toBeInTheDocument()
  })

  it('contains a failed chunk import and reports it', () => {
    render(
      <LazyChunkBoundary fallback={<p>Chart unavailable</p>}>
        <Boom />
      </LazyChunkBoundary>
    )

    expect(screen.getByText('Chart unavailable')).toBeInTheDocument()
    expect(reportError).toHaveBeenCalledWith(
      expect.any(TypeError),
      expect.objectContaining({ source: 'lazy_chunk_boundary', chunk_load: true })
    )
  })

  it('keeps siblings outside the boundary rendered', () => {
    render(
      <div>
        <h1>Pet name</h1>
        <LazyChunkBoundary fallback={<p>Chart unavailable</p>}>
          <Boom />
        </LazyChunkBoundary>
      </div>
    )

    expect(screen.getByRole('heading', { name: 'Pet name' })).toBeInTheDocument()
    expect(screen.getByText('Chart unavailable')).toBeInTheDocument()
  })
})
