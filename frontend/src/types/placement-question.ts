import type { ContentTranslation } from '@/types/content-translation'

export type PlacementQuestionStatus = 'pending' | 'published' | 'hidden'

export interface PlacementQuestion {
  id: number
  pet_id: number
  placement_request_id: number | null
  asker_name: string
  question: string
  question_locale: string | null
  answer: string | null
  answer_locale: string | null
  answered_by_name: string | null
  answered_at: string | null
  published_at: string | null
  created_at: string
  is_answered: boolean
  status: PlacementQuestionStatus
  question_translation?: ContentTranslation | null
  answer_translation?: ContentTranslation | null
  /**
   * True when the reader is looking at machine output nobody reviewed. Whoever
   * approved the pair could read exactly one of the four languages it publishes
   * in, so this has to be surfaced rather than assumed away.
   */
  machine_translated?: boolean
  /**
   * False once a pet has more published pairs than the translation budget
   * covers. The client offers an on-demand control instead of silently showing
   * an untranslated thread.
   */
  translation_within_budget?: boolean
  /** Only present for people who can manage the pet. */
  asker_email_confirmed?: boolean
  hidden_at?: string | null
}
