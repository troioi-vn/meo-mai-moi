import { render, act, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { TranslatedTextBlock } from '@/components/translation/TranslatedTextBlock'

describe('TranslatedTextBlock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls onPending while translation status is pending', () => {
    const onPending = vi.fn()

    render(
      <TranslatedTextBlock
        text="Original notes"
        translation={{
          original: 'Original notes',
          status: 'pending',
        }}
        onPending={onPending}
      />
    )

    expect(onPending).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(onPending).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(onPending).toHaveBeenCalledTimes(2)
  })

  it('does not poll when translation status is not pending', () => {
    const onPending = vi.fn()

    render(
      <TranslatedTextBlock
        text="Original notes"
        translation={{
          original: 'Original notes',
          translated: 'Translated notes',
          status: 'translated',
        }}
        onPending={onPending}
      />
    )

    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(onPending).not.toHaveBeenCalled()
  })

  it('shows in-progress label when translation status is pending', () => {
    render(
      <TranslatedTextBlock
        text="Original notes"
        translation={{
          original: 'Original notes',
          status: 'pending',
        }}
      />
    )

    expect(screen.getByText('Translation in progress')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('stops polling after the maximum number of attempts', () => {
    const onPending = vi.fn()

    render(
      <TranslatedTextBlock
        text="Original notes"
        translation={{
          original: 'Original notes',
          status: 'pending',
        }}
        onPending={onPending}
      />
    )

    act(() => {
      vi.advanceTimersByTime(2500 * 12)
    })
    expect(onPending).toHaveBeenCalledTimes(12)

    act(() => {
      vi.advanceTimersByTime(2500 * 5)
    })
    expect(onPending).toHaveBeenCalledTimes(12)
  })
})
