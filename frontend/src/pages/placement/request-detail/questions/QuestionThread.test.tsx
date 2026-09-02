import { screen } from '@testing-library/react'
import { renderWithRouter } from '@/testing'
import { describe, it, expect, vi } from 'vite-plus/test'
import { QuestionThread } from './QuestionThread'
import type { PlacementQuestion } from '@/types/placement-question'

const baseQuestion: PlacementQuestion = {
  id: 1,
  pet_id: 2,
  placement_request_id: 3,
  asker_name: 'Linh',
  question: 'Is she good with other cats?',
  question_locale: 'en',
  answer: null,
  answer_locale: null,
  answered_by_name: null,
  answered_at: null,
  published_at: null,
  created_at: '2026-09-01T10:00:00Z',
  is_answered: false,
  status: 'pending',
}

const renderThread = (
  question: Partial<PlacementQuestion> = {},
  props: Partial<React.ComponentProps<typeof QuestionThread>> = {}
) => {
  const handlers = {
    onAnswer: vi.fn(),
    onHide: vi.fn(),
    onUnhide: vi.fn(),
    onTranslate: vi.fn(),
    onTranslationPending: vi.fn(),
  }

  renderWithRouter(
    <QuestionThread
      question={{ ...baseQuestion, ...question }}
      canModerate={false}
      busy={false}
      {...handlers}
      {...props}
    />
  )

  return handlers
}

describe('QuestionThread', () => {
  it('shows the asker name and their question', () => {
    renderThread()

    expect(screen.getByText('Linh')).toBeInTheDocument()
    expect(screen.getByText(/good with other cats/i)).toBeInTheDocument()
  })

  it('offers no moderation controls to an ordinary reader', () => {
    renderThread({ status: 'published', is_answered: true, answer: 'Yes.' })

    expect(screen.queryByRole('button', { name: /hide/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /answer/i })).not.toBeInTheDocument()
  })

  it('lets the listing side answer and hide', () => {
    const handlers = renderThread({}, { canModerate: true })

    screen.getByRole('button', { name: /answer/i }).click()
    expect(handlers.onAnswer).toHaveBeenCalledOnce()

    screen.getByRole('button', { name: /hide/i }).click()
    expect(handlers.onHide).toHaveBeenCalledOnce()
  })

  it('says out loud when a reader is looking at unreviewed machine output', () => {
    // The person who approved this pair could read one of four languages.
    renderThread({
      status: 'published',
      is_answered: true,
      answer: 'Yes.',
      machine_translated: true,
    })

    expect(screen.getByText(/machine translated, not reviewed/i)).toBeInTheDocument()
  })

  it('does not claim machine translation when the reader has the original', () => {
    renderThread({ status: 'published', is_answered: true, answer: 'Yes.' })

    expect(screen.queryByText(/machine translated/i)).not.toBeInTheDocument()
  })

  it('offers an on-demand translation once a pair is past the budget', () => {
    const handlers = renderThread({
      status: 'published',
      is_answered: true,
      answer: 'Yes.',
      translation_within_budget: false,
    })

    const button = screen.getByRole('button', { name: /translate this thread/i })
    button.click()
    expect(handlers.onTranslate).toHaveBeenCalledOnce()
  })

  it('attributes an inherited answer to the previous owner rather than naming them', () => {
    renderThread({
      status: 'published',
      is_answered: true,
      answer: 'She is great with other cats.',
      answered_by_name: null,
    })

    expect(screen.getByText(/answered by the previous owner/i)).toBeInTheDocument()
  })
})
