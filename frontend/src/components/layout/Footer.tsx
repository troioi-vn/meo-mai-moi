import { useTranslation } from 'react-i18next'
import { Heart } from 'lucide-react'

export function Footer() {
  const { t } = useTranslation('common')

  return (
    <footer className="w-full border-t py-6 px-4">
      <div className="container mx-auto flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {t('app.name')}
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/troioi-vn/meo-mai-moi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.patreon.com/catarchy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <Heart className="size-3.5" />
            Patreon
          </a>
        </div>
      </div>
    </footer>
  )
}
