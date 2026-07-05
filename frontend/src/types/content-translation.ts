export type ContentTranslationStatus = 'original' | 'pending' | 'translated' | 'failed'

export interface ContentTranslation {
  original: string
  original_locale: string
  viewer_locale: string
  translated?: string | null
  status: ContentTranslationStatus
  is_translated: boolean
}
