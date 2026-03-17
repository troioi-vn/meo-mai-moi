import { ArrowLeftRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { DiscoverPage } from '@/lib/discover-page'
import { getDiscoverPagePath } from '@/lib/discover-page'

export function DiscoverPageSwitch({
  target,
  label,
  onSelect,
}: {
  target: DiscoverPage
  label: string
  onSelect: (page: DiscoverPage) => void
}) {
  return (
    <Button variant="ghost" size="sm" asChild className="gap-2 px-2 text-muted-foreground">
      <Link
        to={getDiscoverPagePath(target)}
        aria-label={label}
        title={label}
        onClick={() => {
          onSelect(target)
        }}
      >
        <ArrowLeftRight className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    </Button>
  )
}
